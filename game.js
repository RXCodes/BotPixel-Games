var games = {};
const botFunction = require('./bot');
const physics = require('./physics');
const blockDataScope = require('./blocks');
const blockUpdate = require('./blockupdates');
const inventory = require('./inventory');
const maxItemLifetime = 30;
const maxItemEntities = 50;
blocksJSON = {};
const getBlock = function(block) {
  return blocksJSON[block] || {};
}

function shuffle(array) {
	var currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex]
		];
	}

	return array;
}

function generateUUID() {
	return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// start match
startMatch = function(world, uuid, players) {
	endMatch(games[uuid]);

	blocksJSON = blockDataScope.blocks();
	games[uuid] = {
		world: world.world,
		collisions: world.collisions,
		interests: world.interests,
		playerObjects: [],
		startTime: Date.now(),
		matchBegins: Date.now() + 25.9 * 1000,
		uuid,
		borderSize: 100,
		playzoneSize: 105,
		playzoneXOffset: 0,
		updateChunks: {},
		itemEntities: [],
		crateContents: world.crateLoot
	};

	let spawnPlayer = function(x, y, id, type) {
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
			healthRegenDelay: 100,
			isOnGround: false,
			uuid: id,
			xFlip: 0,
			type,
			walking: false,
			prevX: '?'
		};
		games[uuid].playerObjects.push(object);
	};

	// spawn players
	let i = 0;
	let playerPositions = {};
	let playerArray = shuffle(players);
	playerArray.forEach(function(player) {
		spawnPlayer((i - 5) * 10 + 5, 95, player.id, player.type);
		if (player.type == 'Player') {
			playerPositions[player.id] = {
				x: (i - 5) * 10 + 5,
				y: 95
			};
		}
		i++;
	});
	return {
		positions: playerPositions
	};
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
		object.yVelocity = Math.max(object.yVelocity, -5.5);
		object.xVelocity += (0 - object.xVelocity) / (timeDelta * 45);
		object = physics.player(object, collisions);
		if (
			collisions[
				Math.round(object.x) +
					',' +
					Math.round(object.y - object.heightHalf - 0.5)
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

		// health regeneration
		object.healthRegenDelay--;
		if (object.healthRegenDelay <= 0) {
			object.healthRegenDelay = 100;
			object.health = Math.max(object.health + 1, 100);
			pushEvent(object.uuid, 'update health', object.health);
		}

		// walk animations
		if (object.x !== object.prevX && !object.walking) {
			pushEvent(game.uuid, 'animation', { name: 'walk', uuid: object.uuid });
			object.walking = true;
		}
		if (object.walking && object.x == object.prevX) {
			pushEvent(game.uuid, 'animation', {
				name: 'stop walk',
				uuid: object.uuid
			});
			object.walking = false;
		}
		object.prevX = object.x;
	};

	let playerMovePacket = [];
	let requireKeys = ['x', 'y', 'uuid', 'health', 'xFlip'];
	game.playerObjects.forEach(function(player) {
		if (player.type == 'Bot') {
			botFunction.iterate(player, game);
		}
		if (game.matchBegins < Date.now()) {
			playerPhysics(player);
			match(game);
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
			pushEvent(
				game.uuid,
				'Delete Item',
				game.itemEntities[index].id,
				'normal'
			);
			game.itemEntities[index] = 'delete';
		} else {
			item.y -= 0.45;
			if (
				game.world[Math.round(item.x) + ',' + Math.round(item.y - 0.35)] !==
				undefined
			) {
				item.y = Math.max(Math.round(item.y - 0.35) + 0.5, item.y - 0.25);
			}
		}
		index++;
	});

	// delete item drops and send data to players
	let itemsArray = [];
	game.itemEntities.forEach(function(item) {
		if (item !== 'delete') {
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

// request player inventory / send inventory data to player
const updateInventory = function(worldUUID, playerUUID) {
  
  // check if the world exists
  if (games[worldUUID] == undefined) {
    return [];
  }
  
  // get player object
  let player = undefined;
  games[worldUUID].playerObjects.forEach(function(object) {
    if (object.uuid == playerUUID) {
      player = object;
    }
  });
  if (player == undefined) {
    return [];
  }
  
  // send inventory data to player
  return player.inventory;
  
}

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
const destroyBlock = function(worldUUID, x, y, uuid = 'bot') {
	let position = x + ',' + y;
	pushEvent(worldUUID, 'Destroy Block', {
		x,
		y,
		block: games[worldUUID].world[position],
		sound: (blocksJSON[games[worldUUID].world[position]] || {}).breakSound,
		uuid: uuid,
		position
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
		blockData,
		position
	});
	games[worldUUID].world[position] = block;
	if (!blocksJSON[block].passable) {
		games[worldUUID].collisions[position] = true;
	}
	games[worldUUID].world = blockUpdate.update(x, y, games[worldUUID].world);
	updateChunk(worldUUID, x, y);
};

// move a player according to provided packet
const movePlayer = function(uuid, player, packet) {
	let index = 0;
	games[uuid].playerObjects.forEach(function(object) {
		if (object.uuid == uuid) {
			object.x = packet.xPos;
			object.y = packet.yPos;
			object.xVelocity = packet.xVelocity / 10;
			object.yVelocity = packet.yVelocity / 10;
			games[uuid].playerObjects[index] = object;
		}
		index++;
	});
};

// summon an item at a given position
const summonItem = function(uuid, x, y, item, count) {
	let type = 'Blocks/';
	if (blocksJSON[item] == undefined) {
		type = 'Items/';
	}
	let itemData = {
		x: x + Math.random() * 0.3,
		y,
		item,
		count,
		lifetime: 0,
		id: generateUUID(),
		type
	};
	if (games[uuid].itemEntities.length >= maxItemEntities) {
		pushEvent(
			games.uuid,
			'Delete Item',
			(games[uuid] || {}).itemEntities[0].id
		);
		games[uuid].itemEntities.shift();
	}
	games[uuid].itemEntities.push(itemData);
};

// destroy block event via player
const destroyBlockEvent = function(x, y, playerUUID, worldUUID) {
	if (!games[worldUUID]) {
		return { success: false };
	}

	if (games[worldUUID].world[x + ',' + y]) {
	  
	  // get player object
	  let players = games[worldUUID].playerObjects;
	  let player = undefined;
	  players.forEach(function(object) {
	    if (object.uuid == playerUUID) {
	      player = object;
	    }
	  });
	  if (!player) {
	    return {success: false};
	  }
	  
		blockData = blocksJSON[games[worldUUID].world[x + ',' + y]];
		if (blockData !== undefined) {
			if (blockData.drops !== undefined) {
				let give = inventory.give(player.inventory, blockData.drops, 1);
				player.inventory = give.inventory;
				if (give.success == true) {
				  let type = "Items/";
				  if (getBlock(blockData.drops).breakDuration) {
				    type = "Blocks/";
				  }
					pushEvent(worldUUID, 'Pick Up Item', {
						x,
						y,
						type,
						item: blockData.drops,
						uuid: player.uuid
					});
				}
				if (give.leftOver > 0 && give.success) {
					summonItem(worldUUID, player.x, player.y, blockData.drops, give.leftOver);
				}
				if (!give.success) {
					summonItem(worldUUID, x, y, blockData.drops, give.leftOver);
				}
			}
		}
		destroyBlock(worldUUID, x, y, playerUUID);
		return { success: true };
	}

	return { success: true };
};

// place block event via player
const placeBlockEvent = function(x, y, slotID, playerUUID, worldUUID) {
	if (!games[worldUUID]) {
		return { success: false };
	}

	if (!games[worldUUID].world[x + ',' + y]) {
	  
	  // get player object
	  let players = games[worldUUID].playerObjects;
	  let player = undefined;
	  players.forEach(function(object) {
	    if (object.uuid == playerUUID) {
	      player = object;
	    }
	  });
	  if (!player) {
	    return {success: false};
	  }
	  
	  // check slot
	  if ((player.inventory[slotID] || {}).type !== "Blocks/") {
	    return {success: false};
	  }
	  
	  // place block
	  let slot = player.inventory[slotID];
	  player.inventory[slotID].count--;
	  if (player.inventory[slotID].count == 0) {
	    player.inventory.splice(slotID, 1);
	  }
		placeBlock(worldUUID, x, y, slot.name);
		
		return { success: true };
	}

	return { success: true };
};

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
			data: blocks,
			chunk: chunkX + ',' + chunkY
		});
	});

	// clear chunk updates
	game.updateChunks = {};
};

// end match
var endMatch = function(uuid) {
	pushEvent(uuid, 'Match End', { type: 'Room Expired.' });
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

// export modules
exports.startMatch = startMatch;
exports.endMatch = endMatch;
exports.gameClock = gameClock;
exports.gameEvents = fetchGameEvents;
exports.clearEvents = clearEvents;
exports.placeBlock = placeBlock;
exports.destroyBlock = destroyBlock;
exports.emit = pushEvent;
exports.summonItem = summonItem;
exports.move = movePlayer;
exports.destroyBlockEvent = destroyBlockEvent;
exports.placeBlockEvent = placeBlockEvent;
exports.updateInventory = updateInventory;

// match regulation
const match = function(game) {
	// prepare next playzone
	let nextZone = function() {
		game.transitionDuration = 15;
		let sizes = [70, 50, 40, 25, 10, 0];
		let xOffset = Math.round((Math.random() - 0.5) * game.borderSize * 0.4);
		game.zoneIteration++;
		let delay = 40;
		if (game.zoneIteration > 2) {
			delay = 25;
			game.transitionDuration = 10;
		}
		if (game.zoneIteration > 4) {
			delay = 15;
			game.transitionDuration = 7.5;
		}
		game.initialTargetSize = game.playzoneSize;
		game.initialZoneXOffset = game.playzoneXOffset;
		game.nextZone = Date.now() + delay * 1000;
		game.targetSize = sizes[game.zoneIteration - 1];
		game.targetZoneX = xOffset;
		game.zoneActive = true;

		pushEvent(game.uuid, 'Playzone', {
			'next zone': game.nextZone,
			'target size': game.targetSize,
			'zone x': game.targetZoneX,
			'transition duration': game.transitionDuration
		});
	};

	// initiate grace period
	if (!game.gracePeriod && Date.now() - game.startTime >= 1000 * 10) {
		game.gracePeriod = Date.now() + 30 * 1000;
		pushEvent(game.uuid, 'Grace Period', game.gracePeriod / 1000);
	} else {
		if (game.gracePeriod < Date.now() && !game.pvp) {
			pushEvent(game.uuid, 'Grace Period End', {});
			game.zoneIteration = 0;
			nextZone();
			game.pvp = true;
		}
	}

	// playzone shrinking
	if (game.zoneActive && game.nextZone < Date.now()) {
		if (!game.zoneClosing) {
			game.zoneClosing = true;
			pushEvent(game.uuid, 'Playzone Shrink', {
				'next zone': game.nextZone,
				'target size': game.targetSize,
				'zone x': game.targetZoneX,
				'transition duration': game.transitionDuration
			});
		}
		let percent =
			(Date.now() - game.nextZone) / (game.transitionDuration * 1000);
		game.playzoneSize = game.initialTargetSize;
		game.playzoneXOffset = game.initialZoneXOffset;
		game.playzoneSize += percent * (game.targetSize - game.initialTargetSize);
		game.playzoneXOffset +=
			percent * (game.targetZoneX - game.initialZoneXOffset);
		if (percent >= 1 && game.zoneIteration <= 5) {
			game.zoneClosing = false;
			nextZone();
		} else if (game.zoneIteration == 6) {
			game.zoneActive = false;
		}
	}
};
