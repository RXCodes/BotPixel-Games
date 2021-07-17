var games = {};
const botFunction = require('./bot');
const physics = require('./physics');
const blockDataScope = require('./blocks');
const blockUpdate = require('./blockupdates');
const inventory = require('./inventory');
const maxItemLifetime = 30;
const maxItemEntities = 50;
const worldHeightLimit = 100;
blocksJSON = {};
const getBlock = function(block) {
	return blocksJSON[block] || {};
};
const setup = require('./setup');
io = setup.io();

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

// reference player via world uuid and player uuid
const referPlayer = function(worldUUID, uuid) {
	if (!games[worldUUID]) {
		return { error: 'World does not exist.' };
	}
	let object = undefined;
	games[worldUUID].playerObjects.forEach(function(player) {
		if (player.uuid == uuid) {
			object = player;
		}
	});
	if (object) {
		return object;
	}
	return { error: 'Player does not exist.' };
};

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
		crateLoot: world.crateLoot,
		blockCost: world.blockCost,
		declareWin: function(player) {
		  this.winnerDeclared = true;
		  this.playzoneSize = 1000;
		  this.zoneActive = false;
		  io.to(player.uuid).emit("Victory", "Last Player Standing!");
		  io.to(this.uuid).emit("Declare Win", {
		    uuid: player.uuid,
		    name: player.name,
		    endTime: (Date.now() / 1000) + 60
		  })
		  setTimeout(function() {
		    endMatch(this.uuid);
		  }, 60 * 1000)
		}
	};

	let spawnPlayer = function(x, y, id, type, name) {
		defaultWidth = 0.75;
		defaultHeight = 1.85;
		let object = {
			x,
			y,
			name,
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
			prevX: '?',
			playzoneDamageDelay: 0,
			worldUUID: uuid,
			physicDebuff: 0,
			addToHealth: function(add, event, effect = 'None') {
			  if (!games[this.worldUUID].winnerDeclared) {
				this.health += add;
				this.health = Math.max(this.health, 0);
				this.health = Math.min(this.health, 100);
				if (add < 0) {
					this.healthRegenDelay = 100;
					let worldUUID = this.worldUUID;
					let uuid = this.uuid;
					io.to(worldUUID).emit('Player Hit', {
						effect,
						uuid
					});
				}
				if (this.type == 'Player') {
					io.to(this.uuid).emit('Health Update', {
						type: event.type || 'Regeneration',
						change: add,
						hp: this.health
					});
				}
				if (this.health == 0) {
					if (this.type == 'Player') {
						io.to(this.uuid).emit('death', Date.now() / 1000);
					}

					// player death
					let worldUUID = this.worldUUID;
					let x = this.x;
					let y = this.y;
					let uuid = this.uuid;
					let name = this.name;
					io.to(worldUUID).emit('death announce', {
						playersLeft: games[worldUUID].playerObjects.length - 1,
						cause: event,
						uuid,
						name
					});
					this.inventory.forEach(function(item) {
						summonItem(
							worldUUID,
							x + Math.random(),
							y + Math.random(),
							item.name,
							item.count
						);
					});
					let checkIndex = 0;
					games[worldUUID].playerObjects.forEach(function(player) {
						if (uuid == player.uuid) {
							games[worldUUID].playerObjects.splice(checkIndex, 1);
						}
						checkIndex++;
					});
					if (games[worldUUID].playerObjects.length == 1) {
					  games[worldUUID].declareWin(games[worldUUID].playerObjects[0]);
					}
				}
			  }
			},
			itemCooldown: {},
			setCooldown: function(alias, cooldown) {
				if (
					(this.itemCooldown[alias] || 0) + parseFloat(cooldown) * 1000 <
					Date.now()
				) {
					this.itemCooldown[alias] = Date.now();
					return true;
				}
				return false;
			},
			meleeAttack: function(
				weapon,
				dmg,
				xBound,
				yBound,
				xOffset,
				yOffset,
				cooldown
			) {
				if (this.setCooldown(weapon, cooldown)) {
					// initialize values
					let x = this.x + xOffset;
					let y = this.y + yOffset;
					let worldUUID = this.worldUUID;
					let playerUUID = this.uuid;
					let name = this.name;

					// check for other players
					games[worldUUID].playerObjects.forEach(function(obj) {
						if (Math.abs(obj.x - x) <= xBound) {
							if (Math.abs(obj.y - y) <= yBound) {
								// hit player
								if (obj.uuid !== playerUUID && games[worldUUID].pvp) {
									obj.addToHealth(-dmg, { uuid: obj.uuid, type: 'Player' });
								}
							}
						}
					});
				}
			}
		};
		games[uuid].playerObjects.push(object);
	};

	// spawn players
	let i = 0;
	let playerPositions = {};
	let playerArray = shuffle(players);
	playerArray.forEach(function(player) {
		spawnPlayer((i - 5) * 10 + 5, 95, player.id, player.type, player.name);
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

    object.physicDebuff--;
    if (object.physicDebuff <= 0) {
		object = physics.player(object, collisions);
    }

		// physical border check
		object.x = Math.max(game.borderSize / -2, object.x);
		object.x = Math.min(game.borderSize / 2, object.x);

		// health regeneration
		object.healthRegenDelay--;
		if (object.healthRegenDelay <= 0) {
			object.healthRegenDelay = 100;
			object.addToHealth(5);
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

		// mining damage
		if (object.mining) {
			let xOffset;
			switch (object.xFlip) {
				case 0:
					xOffset = 0.3;
					break;
				case 1:
					xOffset = -0.3;
			}
			// (weapon, dmg, x size, y size, xOffset, yOffset, cooldown)
			object.meleeAttack('Pickaxe', 5, 1.15, 2.15, xOffset, 0, 0.3);
		}
	};

	let playerMovePacket = [];
	let requireKeys = ['x', 'y', 'uuid', 'health', 'xFlip', 'name'];
	game.playerObjects.forEach(function(player) {
		if (player.type == 'Bot') {
			botFunction.iterate(player, game);
		}
		if (game.matchBegins < Date.now()) {
			playerPhysics(player);
		}
		let packet = {};
		requireKeys.forEach(function(key) {
			packet[key] = player[key];
		});
		playerMovePacket.push(packet);
	});
	if (game.matchBegins < Date.now()) {
		match(game);
	}
	io.to(game.uuid).emit('Player Move', playerMovePacket);

	// item drops
	game.itemEntities.forEach(function(item) {
		item.lifetime += 0.1;

		// check if item expires past lifetime
		let index = 0;
		if (item.lifetime > maxItemLifetime) {
			pushEvent(game.uuid, 'Delete Item', game.itemEntities[index].id);
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
			// check if item is colliding with any player
			let player = undefined;
			game.playerObjects.forEach(function(object) {
				if (
					Math.abs(object.x - item.x) < 1.5 &&
					Math.abs(object.y - item.y) < 1.5
				) {
					player = object;
				}
			});
			if (player) {
				let give = inventory.give(
					player.inventory || [],
					item.item,
					item.count
				);
				player.inventory = give.inventory;
				if (give.success == true) {
					let type = 'Items/';
					if (getBlock(item.item).breakDuration) {
						type = 'Blocks/';
					}
					pushEvent(game.uuid, 'Pick Up Item', {
						x: item.x,
						y: item.y,
						type,
						item: item.item,
						uuid: player.uuid
					});
					pushEvent(game.uuid, 'Delete Item', item.id);
					io.to(player.uuid).emit('update inventory', player.inventory);
				}
				if (give.leftOver > 0 && give.success) {
					summonItem(world.uuid, player.x, player.y, item.item, give.leftOver);
				}
				if (!give.success) {
					itemsArray.push(item);
				}
			} else {
				itemsArray.push(item);
			}
		}
	});
	game.itemEntities = itemsArray;
	io.to(game.uuid).emit('Items Move', itemsArray);
};

// world interaction
pushEvent = function(worldUUID, event, data) {
	io.to(worldUUID).emit(event, data);
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
	if (games[worldUUID].crateLoot[position]) {
		let crateContents = games[worldUUID].crateLoot[position];
		Object.keys(crateContents).forEach(function(slot) {
			let item = crateContents[slot];
			summonItem(worldUUID, x, y, item.name, item.count);
		});
		delete games[worldUUID].crateLoot[position];
		delete games[worldUUID].blockCost[position];
	}
	games[worldUUID].world = blockUpdate.update(x, y, games[worldUUID].world);
	updateChunk(worldUUID, x, y);
};

// place a block at a given position
const placeBlock = function(worldUUID, x, y, block, blockData = {}) {
	if (y > worldHeightLimit) {
		return;
	}
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
		games[worldUUID].blockCost[position] = blocksJSON[block].blockCost;
	}
	games[worldUUID].world = blockUpdate.update(x, y, games[worldUUID].world);
	updateChunk(worldUUID, x, y);
};

// move a player according to provided packet
const movePlayer = function(uuid, player, packet) {
	let index = 0;

	if (!games[uuid]) {
		return;
	}

	games[uuid].playerObjects.forEach(function(object) {
		if (object.uuid == player) {
		  object.physicDebuff = 5;
			object.x = parseFloat(packet.xPos);
			object.y = parseFloat(packet.yPos);
			object.xVelocity = parseFloat(packet.xVelocity) / 11.5;
			object.yVelocity = parseFloat(packet.yVelocity) / 11.5;
			games[uuid].playerObjects[index] = object;
			object.xFlip = parseInt(packet.xFlip || 0);
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
			return { success: false };
		}

		blockData = blocksJSON[games[worldUUID].world[x + ',' + y]];
		if (blockData !== undefined) {
			if (blockData.drops !== undefined) {
				let give = inventory.give(player.inventory, blockData.drops, 1);
				player.inventory = give.inventory;
				if (give.success == true) {
					let type = 'Items/';
					if (getBlock(blockData.drops).breakDuration) {
						type = 'Blocks/';
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
					summonItem(
						worldUUID,
						player.x,
						player.y,
						blockData.drops,
						give.leftOver
					);
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
			return { success: false };
		}

		// check slot
		if ((player.inventory[slotID] || {}).type !== 'Blocks/') {
			return { success: false };
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

// register animation via player
const registerAnimation = function(room, uuid, input) {
	if (input == 'start mine animation') {
		referPlayer(room, uuid).mining = true;
	}
	if (input == 'stop mine animation') {
		referPlayer(room, uuid).mining = false;
	}
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
		io.to(game.uuid).emit('Chunk Update', {
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
	if (!games[uuid]) {
		return;
	}
	io.to(uuid).emit('Match End');
	clearTimeout((games[uuid] || {}).timer);
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
exports.registerAnimation = registerAnimation;

// match regulation
const match = function(game) {
	// prepare next playzone
	let nextZone = function() {
		game.transitionDuration = 15;
		let sizes = [70, 50, 30, 15, 7.5, 0, 0];
		let xOffset = (Math.random() - 0.5) * game.borderSize * 0.3;
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
		if (game.zoneIteration < 6) {
			game.targetZoneX = xOffset;
		}
		game.zoneActive = true;

		pushEvent(game.uuid, 'Playzone', {
			'next zone': game.nextZone / 1000,
			'target size': game.targetSize,
			'zone x': game.targetZoneX,
			'transition duration': game.transitionDuration
		});
		game.playerObjects.forEach(function(player) {
			if (player.type == 'Bot' && Math.random() < 0.9) {
				player.playzoneWarn();
			}
		});
	};

	// initiate grace period
	if (!game.gracePeriod && Date.now() - game.startTime >= 1000 * 30) {
		game.gracePeriod = Date.now() + 30 * 1000;
		pushEvent(game.uuid, 'Grace Period', game.gracePeriod / 1000);
	} else {
		if (game.gracePeriod < Date.now() && !game.pvp) {
			pushEvent(game.uuid, 'Grace Period End', {});
			game.zoneIteration = 1;
			game.timer = setTimeout(function() {
				nextZone();
			}, 8 * 1000);
			game.pvp = true;
		}
	}

	// playzone shrinking
	if (game.zoneActive && game.nextZone < Date.now()) {
		if (!game.zoneClosing) {
			game.zoneClosing = true;
			pushEvent(game.uuid, 'Playzone Shrink', {
				'next zone': game.nextZone / 1000,
				'target size': game.targetSize,
				'zone x': game.targetZoneX,
				'transition duration': game.transitionDuration
			});
			game.playerObjects.forEach(function(player) {
				if (player.type == 'Bot') {
					player.playzoneWarn();
				}
			});
		}
		let percent =
			(Date.now() - game.nextZone) / (game.transitionDuration * 1000);
		game.playzoneSize = game.initialTargetSize;
		game.playzoneXOffset = game.initialZoneXOffset;
		game.playzoneSize += percent * (game.targetSize - game.initialTargetSize);
		game.playzoneXOffset +=
			percent * (game.targetZoneX - game.initialZoneXOffset);
		if (percent >= 1 && game.zoneIteration <= 7) {
			game.zoneClosing = false;
			game.zoneIteration++;
			nextZone();
		} else if (game.zoneIteration == 8) {
			game.zoneActive = false;
		}
	}

	// damage players outside of playzone
	let zoneWidthHalf = game.playzoneSize / 2;
	let playerIndex = 0;
	game.playerObjects.forEach(function(player) {
		if (
			player.x < game.playzoneXOffset - zoneWidthHalf ||
			player.x > game.playzoneXOffset + zoneWidthHalf
		) {
			if (Math.abs(player.playzoneDamageDelay - Date.now()) >= 1000) {
				let playzoneDamage = 5 + Math.floor(game.zoneIteration / 2) * 5;
				player.playzoneDamageDelay = Date.now();
				player.addToHealth(-playzoneDamage, { type: 'Playzone' });
				io.to(game.uuid).emit('Playzone Hit', player.uuid);
				if (player.type == 'Bot') {
					player.playzoneWarn();
				}
			}
		}
		playerIndex++;
	});
};
