var games = {};
const botFunction = require('./bot');
const physics = require('./physics');
const blockDataScope = require('./blocks');
const blockUpdate = require('./blockupdates');
const inventory = require('./inventory');
const maxItemLifetime = 30;
const maxItemEntities = 100;
blocksJSON = {};

function generateUUID() {
	return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// start match
startMatch = function(world, uuid) {
  endMatch(games[uuid]);
  
	blocksJSON = blockDataScope.blocks();
	games[uuid] = {
		world: world.world,
		collisions: world.collisions,
		interests: world.interests,
		playerObjects: [],
		startTime: Date.now(),
		matchBegins: Date.now() + 20.9 * 1000,
		uuid,
		borderSize: 100,
		playzoneSize: 105,
		updateChunks: {},
		itemEntities: [],
		crateContents: world.crateLoot
	};

	let spawnPlayer = function(x, y) {
		defaultWidth = 0.75;
		defaultHeight = 1.85;
		let object = {
			x,
			y,
			width: defaultWidth,
			height: defaultHeight,
			widthHalf: defaultWidth / 2,
			heightHalf: defaultHeight / 2,
			yGravity: -10,
			xVelocity: 0,
			yVelocity: 0,
			time: Date.now(),
			inventory: [],
			health: 100,
			isOnGround: false,
			uuid: generateUUID(),
			xFlip: 0
		};
		games[uuid].playerObjects.push(object);
	};

  // spawn players
	for (i = 0; i < 10; i++) {
		spawnPlayer((i - 5) * 10 + 5, 100);
	}
};

// iterate through each game
const runGame = function(game) {
	let world = game.world;
	let collisions = game.collisions;

  // player physics
	let playerPhysics = function(object) {
		object.isOnGround = false;

		// physical movement
		object.y += object.yVelocity;
		object.x += object.xVelocity;
		let timeDelta = Date.now() / object.time;
		object.time = Date.now();
		object.yVelocity += (object.yGravity - object.yVelocity) / (timeDelta * 45);
		object.xVelocity += (0 - object.xVelocity) / (timeDelta * 45);
		object = physics.player(object, collisions);
		if (
			collisions[
				Math.round(object.x) + ',' + Math.round(object.y - object.heightHalf - 0.5)
			]
		) {
			object.isOnGround = true;
		}
		
		// flip functionality
		if (object.xVelocity < 0) {
		  object.xFlip = 1;
		}
		if (object.xVelocity > 0) {
		  object.xFlip = 0;
		}

		// on ground duration
		if (object.isOnGround == true) {
			object.isOnGroundDuration++;
		} else {
			object.isOnGroundDuration = 0;
		}

		object = physics.player(object, collisions);

		// physical border check
		object.x = Math.max(game.borderSize / -2, object.x);
		object.x = Math.min(game.borderSize / 2, object.x);
	};

  let playerMovePacket = [];
  let requireKeys = ["x", "y", "uuid", "health", "xFlip"];
	game.playerObjects.forEach(function(player) {
		botFunction.iterate(player, game);
		if (game.matchBegins < Date.now()) {
			playerPhysics(player);
		}
		let packet = {};
		requireKeys.forEach(function(key) {
		  packet[key] = player[key];
		});
		playerMovePacket.push(packet);
	});
	pushEvent(game.uuid, 'Player Move', playerMovePacket, 'normal');
	
	// item drops
	game.itemEntities.forEach(function(item) {
	  item.lifetime += 0.1;
	  
	  // check if item expires past lifetime
	  let index = 0;
	  if (item.lifetime > maxItemLifetime) {
	    pushEvent(game.uuid, 'Delete Item', game.itemEntities[index].id, 'normal');
	    game.itemEntities[index] = "delete";
	  } else {
	    item.y -= 0.3;
	    if (game.world[Math.round(item.x) + "," +  Math.round(item.y - 0.35)] !== undefined) {
	      item.y = Math.max(Math.round(item.y - 0.35) + 0.5, item.y - 0.25)
	    }
	  }
	  index++;
	});
	
	// delete item drops and send data to players 
	let itemsArray = [];
	game.itemEntities.forEach(function(item) {
	  if (item !== "delete") {
	    itemsArray.push(item);
	  }
	});
	game.itemEntities = itemsArray;
	pushEvent(game.uuid, 'Items Move', itemsArray, 'normal');
};

// world interaction
pushEvent = function(worldUUID, event, data, type = 'normal') {
	gameEvents.push({
		uuid: worldUUID,
		event,
		data,
		type
	});
};

// request a chunk update given block coordinates
const updateChunk = function(worldUUID, x, y, chunkSize = 5) {
	let chunkX = Math.round(x / chunkSize);
	let chunkY = Math.round(y / chunkSize);
	let chunkStr = chunkX + ',' + chunkY;
	games[worldUUID].updateChunks[chunkStr] = {
		x: chunkX,
		y: chunkY
	};
};

// destroy a block at a given position
const destroyBlock = function(worldUUID, x, y, uuid = "bot") {
	let position = x + ',' + y;
	pushEvent(worldUUID, 'Destroy Block', {
		x,
		y,
		block: games[worldUUID].world[position],
		sound: (blocksJSON[games[worldUUID].world[position]] || {}).breakSound,
		uuid: uuid
	});
	delete games[worldUUID].world[position];
	delete games[worldUUID].collisions[position];
	delete games[worldUUID].interests[position];
	games[worldUUID].world = blockUpdate.update(x, y, games[worldUUID].world);
	updateChunk(worldUUID, x, y);
};

// place a block at a given position
const placeBlock = function(worldUUID, x, y, block, blockData = {}) {
	let position = x + ',' + y;
	pushEvent(worldUUID, 'Place Block', {
		x,
		y,
		block,
		blockData
	});
	games[worldUUID].world[position] = block;
	if (!blocksJSON[block].passable) {
		games[worldUUID].collisions[position] = true;
	}
	games[worldUUID].world = blockUpdate.update(x, y, games[worldUUID].world);
	updateChunk(worldUUID, x, y);
};

// summon an item at a given position
const summonItem = function(uuid, x, y, item, count) {
  type = "block/";
  if (blocksJSON[item] == undefined) {
    type = "item/";
  }
  let itemData = {
    x: x + (Math.random() * 0.3), y, item, count, lifetime: 0, id: generateUUID(),
    type
  }
  if (games[uuid].itemEntities.length >= maxItemEntities) {
    pushEvent(game.uuid, 'Delete Item', game.itemEntities[0].id);
    games[uuid].itemEntities.shift();
  }
  games[uuid].itemEntities.push(itemData);
}

// send chunk updates to player
const sendChunkUpdates = function(game) {
	let chunkSize = 5;
	let chunkSizeHalf = Math.floor(chunkSize / 2);

	// for each chunk
	Object.keys(game.updateChunks).forEach(function(chunk) {
		// get chunk position
		let chunkPos = game.updateChunks[chunk];
		let chunkX = chunkPos.x;
		let chunkY = chunkPos.y;

		// get updated chunk data
		let blocks = {};
		for (x = -chunkSizeHalf; x <= chunkSizeHalf; x++) {
			for (y = -chunkSizeHalf; y <= chunkSizeHalf; y++) {
				// get block position
				let blockX = chunkX * chunkSize + x;
				let blockY = chunkY * chunkSize + y;

				// get block data
				let id = game.world[blockX + ',' + blockY];
				if (id !== undefined) {
				  let xLocation = x + chunkSizeHalf + 0;
				  let yLocation = y + chunkSizeHalf + 0;
				  if (xLocation == -0) {
				    xLocation = 0;
				  }
				  if (yLocation == -0) {
				    yLocation = 0;
				  }
					blocks[xLocation + ',' + yLocation] = id;
				}
			}
		}

		// send chunk update
		pushEvent(game.uuid, 'Chunk Update', {
			x: chunkX,
			y: chunkY,
			data: blocks
		});
	});
	
	// clear chunk updates
	game.updateChunks = {};
};

// end match
var endMatch = function(uuid) {
  pushEvent(uuid, 'Match End', {"type": "Room Expired."});
	delete games[uuid];
};

// game clock
var gameClock = function() {
	Object.keys(games).forEach(function(uuid) {
		if ((Date.now() - games[uuid].startTime) / 1000 < 60 * 20) {
			runGame(games[uuid]);
			sendChunkUpdates(games[uuid]);
		} else {
			endMatch(uuid);
		}
	});
};

var gameEvents = [];
const fetchGameEvents = function() {
	return gameEvents;
};

clearEvents = function() {
	gameEvents = [];
};

exports.startMatch = startMatch;
exports.endMatch = endMatch;
exports.gameClock = gameClock;
exports.gameEvents = fetchGameEvents;
exports.clearEvents = clearEvents;
exports.placeBlock = placeBlock;
exports.destroyBlock = destroyBlock;
exports.emit = pushEvent;
exports.summonItem = summonItem;