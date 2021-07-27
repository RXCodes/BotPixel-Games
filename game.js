var games = {};
const botFunction = require('./bot');
const physics = require('./physics');
const blockDataScope = require('./blocks');
const blockUpdate = require('./blockupdates');
const inventory = require('./inventory');
const entityBehavior = require('./entity');
const maxItemLifetime = 30;
const maxItemEntities = 50;
const worldHeightLimit = 100;
const food = require('./food');
var foodJSON = {};
const initializeScript = function() {
	foodJSON = food.foodJSON();
};
exports.initialize = initializeScript;
blocksJSON = {};
const getBlock = function(block) {
	return blocksJSON[block] || {};
};
const setup = require('./setup');
io = setup.io();

// entity constructor
function summonEntity(type, x, y, worldUUID, parameters = {}) {
	let object = { alive: true };
	object.type = type;
	object.x = x;
	object.y = y;
	object.id = generateUUID();
	object.start = Date.now();
	object.worldUUID = worldUUID;
	Object.keys(parameters).forEach(function(key) {
		object[key] = parameters[key];
	});
	object.waitQuene = {};

	// entity function
	object.wait = function(seconds, alias) {
		if (object.waitQuene[alias] == undefined) {
			object.waitQuene[alias] = Date.now();
			return false;
		} else {
			if (Date.now() - object.waitQuene[alias] >= parseFloat(seconds) * 1000) {
				delete object.waitQuene[alias];
				return true;
			}
		}
		return false;
	};
	object.explode = function(radius) {
		games[worldUUID].explode(object.x, object.y, radius, object.parent);
	};
	object.setVelocity = function(x, y = '~') {
		if (x !== '~') {
			object.xVelocity = parseFloat(x) || 0;
		}
		if (y !== '~') {
			object.yVelocity = parseFloat(y) || 0;
		}
	};
	object.kill = function() {
		object.alive = false;
	};

	return object;
}

// function that tells if a given string input is a JSON object or not
const isDictionary = function(input) {
	let error = false;
	try {
		let dict = JSON.parse(input);
		dict.test = 123;
	} catch {
		error = true;
	}
	return !error;
};

// shuffle array randomly
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
		entities: [],
		crateLoot: world.crateLoot,
		blockCost: world.blockCost,
		explode: function(x, y, radius, parent = 'None') {
			let world = this.world;
			io.to(this.uuid).emit('Explode', x, y, radius);

			// summon tnt from explosion
			const chainTNT = function(worldUUID, x, y, playerUUID) {
				setTimeout(function() {
					summonTNT(worldUUID, x, y, Math.random() + 0.3, playerUUID);
				}, 10);
			};

			// repel entities
			this.entities.forEach(function(entity) {
				let distance = (entity.x - x) ** 2 + (entity.y - y) ** 2;
				if (distance <= radius ** 2) {
					let power = 2;
					var angleDeg =
						(Math.atan2(entity.x - x, entity.y - y) * 180) / Math.PI;
					entity.xVelocity = Math.sin(angleDeg) * power;
					entity.yVelocity = Math.cos(angleDeg) * power;
				}
			});

			// damage players
			this.playerObjects.forEach(function(player) {
				let distance = (player.x - x) ** 2 + (player.y - y) ** 2;
				if (distance <= radius ** 2) {
					if (parent !== 'None') {
						player.addToHealth(-50, {
							type: 'Player',
							uuid: parent,
							name: referPlayer(this.uuid, parent).name,
							weapon: 'TNT Explosion'
						});
					} else {
						player.addToHealth(-50, {
							type: 'Custom',
							weapon: 'Explosion'
						});
					}
				}
			});

			// destroy blocks
			for (xOffset = -radius; xOffset <= radius; xOffset++) {
				for (yOffset = -radius; yOffset <= radius; yOffset++) {
					let distance = xOffset ** 2 + yOffset ** 2;
					if (distance <= radius ** 2) {
						let block =
							world[
								Math.round(parseInt(x) + xOffset) +
									',' +
									Math.round(parseInt(y) + yOffset)
							];
						if (block && block !== 'Bedrock') {
							destroyBlock(
								this.uuid,
								Math.round(parseInt(x) + xOffset),
								Math.round(parseInt(y) + yOffset),
								'Explosion'
							);
						}
						// summon tnt via explosion
						if (block == 'TNT') {
							chainTNT(
								this.uuid,
								Math.round(parseInt(x) + xOffset),
								Math.round(parseInt(y) + yOffset),
								parent
							);
						}
					}
				}
			}
		},
		declareWin: function(player) {
			let uuid = this.uuid;
			this.winnerDeclared = true;
			this.playzoneSize = 1000;
			this.zoneActive = false;
			this.pvp = false;
			this.gameEnd = true;
			io.to(player.uuid).emit('Victory', 'Last Player Standing!');
			io.to(uuid).emit('Declare Win', {
				uuid: player.uuid,
				name: player.name,
				endTime: Date.now() / 1000 + 60
			});
			setTimeout(function() {
				endMatch(uuid);
			}, 60 * 1000);
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
			startingTime: Date.now(),
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
			stats: {},
			alive: true,
			eating: false,
			eatTimer: undefined,
			startEat: function(slot) {
				if (this.inventory[slot] && slot >= 0) {
					if (foodJSON[this.inventory[slot].name] !== undefined) {
						io.to(this.worldUUID).emit('Start Eat', {
							uuid: this.uuid,
							item: this.inventory[slot]
						});
						this.eating = this.inventory[slot].name;
						this.eatingSlot = slot;
						let item = this.inventory[slot].name;
						let player = this;
						this.eatTimer = setTimeout(function() {
							io.to(player.worldUUID).emit('Stop Eat', player.uuid);
							player.addToHealth(foodJSON[player.eating].heal, {
								type: 'Heal'
							});
							player.eating = false;
							player.inventory = inventory.remove(
								player.inventory,
								player.eatingSlot,
								1
							).inventory;
							io.to(player.uuid).emit('update inventory', player.inventory);
						}, foodJSON[item].eatDuration * 1000);
					}
				}
			},
			cancelEat: function(slot) {
				if (this.eating) {
					this.eating = false;
					clearTimeout(this.eatTimer);
					io.to(this.worldUUID).emit('Stop Eat', this.uuid);
				}
			},
			igniteTNT: function(position) {
				let coordinates = position.split(',');
				if (games[this.worldUUID].world[position] == 'TNT') {
					destroyBlock(
						this.worldUUID,
						parseInt(coordinates[0]),
						parseInt(coordinates[1]),
						'TNT Ignite'
					);
					io.to(this.worldUUID, 'Ignite TNT', coordinates[0], coordinates[1]);
					summonTNT(
						this.worldUUID,
						coordinates[0],
						coordinates[1],
						5,
						this.uuid
					);
				}
			},
			crateCollectItem: function(position, slot) {
				if (
					(games[this.worldUUID].crateLoot[position] || {})[slot] !== undefined
				) {
					let item = games[this.worldUUID].crateLoot[position][slot];
					delete games[this.worldUUID].crateLoot[position][slot];
					io.to(this.worldUUID).emit(
						'Crate Update',
						position,
						games[this.worldUUID].crateLoot[position]
					);
					let give = inventory.give(this.inventory, item.name, item.count);
					this.inventory = give.inventory;
					io.to(this.uuid).emit('update inventory', this.inventory);
					if (give.success) {
						let type = 'Items/';
						if (getBlock(item.name).breakDuration) {
							type = 'Blocks/';
						}
						let coordinates = position.split(',');
						io.to(this.worldUUID).emit('Pick Up Item', {
							x: coordinates[0],
							y: coordinates[1],
							type,
							item: item.name,
							uuid: this.uuid
						});
					}
					if (give.leftOver > 0) {
						summonItem(
							this.worldUUID,
							this.x,
							this.y,
							item.name,
							give.leftOver
						);
					}
				}
			},
			crateStoreItem: function(position, crateSlot, inventorySlot) {
				if (
					(games[this.worldUUID].crateLoot[position] || {})[crateSlot] ==
						undefined &&
					this.inventory[inventorySlot] !== undefined
				) {
					let item = this.inventory[inventorySlot];
					games[this.worldUUID].crateLoot[position][crateSlot] = this.inventory[
						inventorySlot
					];
					this.inventory.splice(inventorySlot, 1);
					io.to(this.uuid).emit('update inventory', this.inventory);
					io.to(this.worldUUID).emit(
						'Crate Update',
						position,
						games[this.worldUUID].crateLoot[position]
					);
				}
			},
			dropItem: function(slot) {
				if (this.inventory[slot] !== undefined) {
					summonItem(
						this.worldUUID,
						this.x,
						this.y,
						this.inventory[slot].name,
						this.inventory[slot].count
					);
					this.inventory = inventory.clear(this.inventory, slot);
				}
			},
			addToHealth: function(add, event = {}, effect = 'None') {
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
					} else {
						if (event.type == 'Player') {
							let player = referPlayer(this.worldUUID, event.uuid);
							if (Math.abs(player.x - this.x) <= 5) {
								if (Math.abs(player.y - this.y) <= 5) {
									this.fightEnemy(event.uuid);
								}
							}
						}
					}
					if (this.health == 0) {
						if (this.type == 'Player') {
							this.stats.survivalDuration =
								(Date.now() - this.startingTime) / 1000;
							io.to(this.uuid).emit('death', {
								timestamp: Date.now(),
								stats: this.stats,
								rank: games[this.worldUUID].playerObjects.length,
								data: event
							});
						}
						if (event.type == 'Player' && event.uuid !== this.uuid) {
							if (referPlayer(this.worldUUID, event.uuid) !== {}) {
								referPlayer(this.worldUUID, event.uuid).stats.kills =
									(referPlayer(this.worldUUID, event.uuid).stats.kills || 0) +
									1;
								kills = referPlayer(this.worldUUID, event.uuid).stats.kills;
								io.to(event.uuid).emit('Kill', {
									count: kills,
									name: this.name,
									cause: event.weapon
								});
							}
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
									obj.addToHealth(-dmg, {
										uuid: playerUUID,
										type: 'Player',
										weapon: weapon
									});
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
	let playerCount = players.length;
	let playerPositions = {};
	let playerArray = shuffle(players);
	playerArray.forEach(function(player) {
		let xPos = (i - playerCount / 2) * ((10 / playerCount) * 10) + 5;
		spawnPlayer(xPos, 95, player.id, player.type, player.name);
		if (player.type == 'Player') {
			playerPositions[player.id] = {
				x: xPos,
				y: 95
			};
		}
		i++;
	});
	return {
		positions: playerPositions
	};
};

// entity summon
const summonTNT = function(uuid, x, y, fuse = 5, playerUUID) {
	games[uuid].entities.push(
		summonEntity('TNT', parseFloat(x), parseFloat(y), uuid, {
			fuse,
			xVelocity: (Math.random() - 0.5) / 3,
			yVelocity: Math.random() / 3,
			parent: playerUUID
		})
	);
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

	// entities
	let entityPacket = [];
	let entityCache = [];
	let maxGravity = -2.5;
	game.entities.forEach(function(entity) {
		// packets
		let data = {
			x: entity.x,
			y: entity.y,
			type: entity.type,
			id: entity.id
		};

		// physical movement
		entity.xVelocity = entity.xVelocity || 0;
		entity.yVelocity = entity.yVelocity || 0;
		entity.x += entity.xVelocity;
		entity.y += entity.yVelocity;
		if (!entity.ignoreAirResistance) {
			entity.xVelocity /= 1.1;
		}
		entity.yVelocity -= 0.1;
		entity.yVelocity = Math.max(entity.yVelocity, maxGravity);
		let x = Math.round(entity.x);
		let y = Math.round(entity.y);
		if (!entity.passable) {
			if (game.collisions[x + ',' + (y - 1)] && entity.yVelocity < 0) {
				entity.y = y;
				entity.yVelocity = 0;
				entity.xVelocity /= 1.6;
			}
			if (game.collisions[x + ',' + (y + 1)] && entity.yVelocity > 0) {
				entity.y = y;
				entity.yVelocity = 0;
				entity.xVelocity /= 2;
			}
			if (game.collisions[x - 1 + ',' + y] && entity.xVelocity < 0) {
				entity.x = x;
				entity.xVelocity = 0;
			}
			if (game.collisions[x + 1 + ',' + y] && entity.xVelocity > 0) {
				entity.x = x;
				entity.xVelocity = 0;
			}
		}

		if (entity.alive == true) {
			entityPacket.push(data);

			// entity behaviors
			entity = (entityBehavior[entity.type] ||
				function(e) {
					return e;
				})(entity, game.collisions, game.world);
			entityCache.push(entity);
		} else {
			io.to(game.uuid).emit('Destroy Entity', entity.id);
		}
	});
	io.to(game.uuid).emit('Player Move', playerMovePacket);
	io.to(game.uuid).emit('Entity Move', entityPacket);
	game.entities = entityCache;

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
					Math.abs(object.x - item.x) < 1.65 &&
					Math.abs(object.y - item.y) < 1.65 &&
					item.lifetime > 1.5
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
	io.to(worldUUID).emit('Destroy Block', {
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
			object.physicDebuff = 10;
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
		x: x + (Math.random() - 0.5) * 0.3,
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
				const givePlayer = function(item, count) {
					let give = inventory.give(player.inventory, item, count);
					player.inventory = give.inventory;
					if (give.success == true) {
						let type = 'Items/';
						if (getBlock(item).breakDuration) {
							type = 'Blocks/';
						}
						io.to(worldUUID).emit('Pick Up Item', {
							x,
							y,
							type,
							item,
							uuid: player.uuid
						});
					}
					if (give.leftOver > 0 && give.success) {
						summonItem(worldUUID, player.x, player.y, item, give.leftOver);
					}
					if (!give.success) {
						summonItem(worldUUID, x, y, item, give.leftOver);
					}
				};
				let usingJSON = false;
				if (blockData.drops.constructor == Object) {
					usingJSON = true;
				}

				if (usingJSON) {
					let count =
						blockData.drops.minCount +
						Math.round(
							Math.random() *
								(blockData.drops.maxCount - blockData.drops.minCount)
						);
					if (Math.random() < blockData.drops.chance) {
						givePlayer(blockData.drops.item, parseInt(count));
					}
				} else {
					givePlayer(blockData.drops, 1);
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
	if (referPlayer(room, uuid).alive) {
		referPlayer(room, uuid).cancelEat();
	}
};

// player actions
io.on('connection', function(socket) {
	socket.on('drop item', function(input, callback) {
		if (socket.ingame) {
			if (referPlayer(socket.room, socket.uuid).alive) {
				referPlayer(socket.room, socket.uuid).dropItem(parseInt(input));
			}
		}
	});
	socket.on('Crate Deposit', function(input, callback) {
		if (socket.ingame && isDictionary(input)) {
			if (referPlayer(socket.room, socket.uuid).alive) {
				let parsedInput = JSON.parse(input);
				referPlayer(socket.room, socket.uuid).crateStoreItem(
					parsedInput.position,
					parseInt(parsedInput['target slot']),
					parseInt(parsedInput['inventory slot'])
				);
			}
		}
	});
	socket.on('Crate Collect', function(input, callback) {
		if (socket.ingame && isDictionary(input)) {
			let parsedInput = JSON.parse(input);
			if (referPlayer(socket.room, socket.uuid).alive) {
				referPlayer(socket.room, socket.uuid).crateCollectItem(
					parsedInput.position,
					parseInt(parsedInput['target slot'])
				);
			}
		}
	});
	socket.on('TNT Ignite', function(input, callback) {
		if (socket.ingame) {
			if (referPlayer(socket.room, socket.uuid).alive) {
				referPlayer(socket.room, socket.uuid).igniteTNT(input);
			}
		}
	});
	socket.on('Eat', function(input, callback) {
		if (socket.ingame) {
			if (referPlayer(socket.room, socket.uuid).alive) {
				referPlayer(socket.room, socket.uuid).startEat(parseInt(input));
			}
		}
	});
	socket.on('Cancel Eat', function(input, callback) {
		if (socket.ingame) {
			if (referPlayer(socket.room, socket.uuid).alive) {
				referPlayer(socket.room, socket.uuid).cancelEat();
			}
		}
	});
});

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
		if (game.gracePeriod < Date.now() && !game.pvp && !game.gameEnd) {
			pushEvent(game.uuid, 'Grace Period End', {});
			game.zoneIteration = 1;
			game.timer = setTimeout(function() {
				nextZone();
			}, 8 * 1000);
			game.currentDisasterEvents = {};
			game.pvp = true;
		}
	}

	// random disaster event
	const disasterEvent = function(difficulty) {
		let events = ['Meteor Shower'];
		if (Math.random() < difficulty) {
			// randomly pick event
			let index = Math.floor(Math.random() * (events.length - 1));
			let event = events[index];
			if (game.currentDisasterEvents[event] == undefined) {
				let eventData = {
					event: event,
					start: Date.now() + 35 * 1000,
					end: Date.now() + 55 * 1000,
					triggered: false
				};
				game.currentDisasterEvents[event] = eventData;
				io.to(game.uuid).emit('Custom Event Warning', eventData);
			}
		}
	};

	// disaster function
	if (game.pvp) {
		Object.keys(game.currentDisasterEvents).forEach(function(event) {
			let eventData = game.currentDisasterEvents[event];
			if (!eventData.triggered && eventData.start <= Date.now()) {
				eventData.triggered = true;
				io.to(game.uuid).emit('Custom Event Start', eventData);
			}
			if (eventData.end <= Date.now()) {
				delete game.currentDisasterEvents[event];
			}
			if (eventData.triggered) {
				// meteor shower event
				if (eventData.event == 'Meteor Shower') {
					if (Math.random() < 0.2) {
						game.entities.push(
							summonEntity(
								'Meteor',
								(Math.random() - 0.5) * 37.5,
								150,
								game.uuid,
								{
									xVelocity: (Math.random() - 0.5) * 1.5,
									yVelocity: -3,
									passable: true,
									ignoreAirResistance: true
								}
							)
						);
					}
				}
			}
		});
	}

	// playzone shrinking
	if (game.zoneActive && game.nextZone < Date.now()) {
		if (!game.zoneClosing) {
			game.zoneClosing = true;
			io.to(game.uuid).emit('Playzone Shrink', {
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
			if (game.zoneIteration >= 2) {
				setTimeout(function() {
					disasterEvent(0.5);
				}, 15 * 1000);
			}
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
