world = require('./game');
const blockDataScope = require('./blocks');
const inventory = require('./inventory');
blocksJSON = {};
const reach = 5; // radius
const woodBlocks = ['Oak Log', 'Birch Log'];

const distance = function(x, y, x2, y2) {
	xDelta = (x2 - x) * (x2 - x);
	yDelta = (y2 - y) * (y2 - y);
	return Math.sqrt(xDelta + yDelta);
};

var iterate = function(bot, game) {
	const uuid = game.uuid;

	// setup
	if (!bot.botActive) {
		bot.botActive = true;
		bot.status = 'Idle';
		bot.horizontalMovement = 0;
		bot.movementDuration = 0;
		bot.isOnGroundDuration = 0;
		bot.idleDuration = 0;
		bot.jumpDelay = 20;
		bot.start = Date.now();
		bot.blocks = 0;
		bot.blocksToBreak = {};
		bot.mining = false;
		bot.mineDuration = 0;
		bot.mineStatusDuration = 0;
		bot.busy = false;
		blocksJSON = blockDataScope.blocks();

		// jump function
		bot.jump = function() {
			if (bot.isOnGround == true) {
				bot.jumpDelay = 15;
				bot.yVelocity = 0.85;
				return true;
			}
			return false;
		};

		// break block function
		bot.break = function(x, y) {
			blockData = blocksJSON[game.world[x + ',' + y]];
			if (blockData !== undefined) {
				if (blockData.drops !== undefined) {
					let give = inventory.give(bot.inventory, blockData.drops, 1);
					bot.inventory = give.inventory;
					if (give.success == true) {
						world.emit(uuid, 'Pick Up Item', {
							x,
							y,
							type: "Blocks/",
							item: blockData.drops,
							uuid: bot.uuid
						});
					}
					if (give.leftOver > 0 && give.success) {
						world.summonItem(
							uuid,
							bot.x,
							bot.y,
							blockData.drops,
							give.leftOver
						);
					}
					if (!give.success) {
						world.summonItem(uuid, x, y, blockData.drops, give.leftOver);
					}
				}
			}
			world.destroyBlock(uuid, x, y);
		};

		// append to blocks to break
		bot.pushBreak = function(x, y) {
			if (game.world[x + ',' + y] !== undefined) {
				bot.blocksToBreak[x + ',' + y] = [x, y];
				bot.mining = true;
			}
		};

		// bot debug chat
		bot.debugChat = function(msg) {
			world.emit(uuid, 'Debug Chat', {
				uuid: bot.uuid,
				msg
			});
		};

		// check block collision
		bot.checkCollision = function(x, y) {
			let xPos = Math.round(bot.x) + Math.round(x);
			let yPos = Math.round(bot.y - bot.heightHalf) + Math.round(y);
			if (game.collisions[xPos + ',' + yPos] !== undefined) {
				return true;
			}
			return false;
		};

		// get block position relative to bot
		bot.getPos = function(x, y) {
			let xPos = Math.round(bot.x) + Math.round(x);
			let yPos = Math.round(bot.y - bot.heightHalf) + Math.round(y);
			return { x: xPos, y: yPos };
		};

		// cancel mining all blocks
		bot.stopMining = function() {
			world.emit(uuid, 'Cancel Mine', {
				uuid: bot.uuid
			});
			bot.blocksToBreak = {};
			bot.mining = false;
		};

		// attempt to place a block position relative to bot
		bot.placeBlock = function(x, y) {
			let xPos = Math.round(bot.x) + Math.round(x);
			let yPos = Math.round(bot.y - bot.heightHalf) + Math.round(y);
			let place = inventory.getBlocks(bot.inventory);
			if (place.totalSolidBlocks > 0 && !bot.mining) {
				let useSlot = place.solidBlockSlots[0];
				let newX = bot.getPos(x, y).x;
				let newY = bot.getPos(x, y).y;
				world.placeBlock(uuid, newX, newY, bot.inventory[useSlot].name);
				inv = inventory.remove(bot.inventory, useSlot, 1);
				bot.inventory = inv.inventory;
			}
		};
	}
	let lifetime = Math.round((Date.now() - bot.start) / 1000);

	// idle activity
	if (bot.status == 'Idle' && bot.horizontalMovement == 0) {
		bot.idleDuration++;
		if (bot.idleDuration > Math.random() * 15 + 3) {
			if (Math.random() < 0.5) {
				bot.horizontalMovement = 0.75;
			} else {
				bot.horizontalMovement = -0.75;
			}
		}
	}
	if (bot.yVelocity > 0) {
		bot.jumpDelay = 10;
	}

	if (bot.status == 'Idle' && bot.horizontalMovement !== 0) {
		bot.xVelocity = bot.horizontalMovement;
		bot.idleDuration = 0;
		bot.movementDuration++;
		if (bot.jumpDelay > 0) {
			bot.jumpDelay--;
		}
		if (Math.random() < 0.3 && bot.jumpDelay == 0) {
			bot.jump();
		}
		if (bot.movementDuration > Math.random() * 50 + 10) {
			bot.movementDuration = 0;
			bot.horizontalMovement = 0;
			bot.xVelocity = 0;
		}
	}

	// constantly locate resources
	if (Math.random() < 0.1 && bot.busy !== true) {
		// search for nearest features
		let success = false;
		let features = [];
		const search = function() {
			Object.keys(game.interests).forEach(function(key) {
				let x = key.split(',')[0];
				let y = key.split(',')[1];
				let deltaX = Math.abs(x - bot.x);
				let deltaY = Math.abs(y - bot.y);
				if (deltaX <= 10 && deltaY <= 7) {
					success = true;
					features.push({
						x,
						y,
						interest: game.world[x + ',' + y]
					});
				}
			});
			if (success) {
				bot.busy = true;
				bot.currentDistance = 9999;
				bot.distancePenalties = 0;
				bot.debugChat('found destination.');
				bot.status = 'Travelling';
				bot.travelTime = 0;

				// find best possible destination
				let priorities = [];
				let prioritiesMap = {};
				features.forEach(function(object) {
					let score = parseInt((blocksJSON[object.interest] || {}).priority);
					priorities.push(score);
					prioritiesMap[score] = prioritiesMap[score] || [];
					prioritiesMap[score].push(object);
				});
				priorities.sort(function(a, b) {
					return b - a;
				});
				let bestDestinations = prioritiesMap[priorities[0]];
				let dist = 99999;
				let x = bot.x;
				let y = bot.y;
				bestDestinations.forEach(function(object) {
					let newDist = Math.abs(bot.x - object.x) + Math.abs(bot.y - object.y);
					if (newDist < dist) {
						dist = newDist;
						x = object.x;
						y = object.y;
					}
				});
				bot.destination = { x, y };
				delete game.interests[x + ',' + y];
			}
		};
		search();
		if (!success) {
			bot.status = 'Mining';
		}
	}

	// travel to destination
	if (bot.status == 'Travelling') {
		let xDelta = Math.abs(bot.destination.x - bot.x);

		// horizontal movement
		if (xDelta >= 3) {
			let jumped = false;
			if (bot.x < bot.destination.x) {
				if (
					bot.checkCollision(1, 0) &&
					!bot.checkCollision(1, 1) &&
					!bot.checkCollision(1, 2) &&
					!bot.checkCollision(0, 2)
				) {
					bot.jump();
					jumped = true;
				}
				if (bot.checkCollision(1, 1) && !jumped) {
					bot.pushBreak(bot.getPos(1, 1).x, bot.getPos(1, 1).y);
					if (bot.checkCollision(0, 2) || bot.checkCollision(1, 2)) {
						bot.pushBreak(bot.getPos(1, 0).x, bot.getPos(1, 0).y);
					}
				}
				bot.xVelocity = 0.75;
				bot.horizontalMovement = 0.75;
			} else {
				if (
					bot.checkCollision(-1, 0) &&
					!bot.checkCollision(-1, 1) &&
					!bot.checkCollision(-1, 2) &&
					!bot.checkCollision(0, 2)
				) {
					bot.jump();
					jumped = true;
				}
				if (bot.checkCollision(-1, 1) && !jumped) {
					bot.pushBreak(bot.getPos(-1, 1).x, bot.getPos(-1, 1).y);
					if (bot.checkCollision(0, 2) || bot.checkCollision(-1, 2)) {
						bot.pushBreak(bot.getPos(-1, 0).x, bot.getPos(-1, 0).y);
					}
				}
				bot.xVelocity = -0.75;
				bot.horizontalMovement = -0.75;
			}

			// stack blocks under player if needed
			if (!bot.checkCollision(0, -1) && !bot.checkCollision(0, 2)) {
				bot.placeBlock(0, -1);
			}
		}

		// vertical movement
		if (xDelta < 3) {
			bot.xVelocity = 0;
			bot.horizontalMovement = 0;
			if (bot.y - 0.5 < bot.destination.y) {
				if (bot.checkCollision(0, 2)) {
					bot.pushBreak(bot.getPos(0, 2).x, bot.getPos(0, 2).y);
				} else {
					bot.jump();
					if (!bot.checkCollision(0, -1)) {
						bot.placeBlock(0, -1);
					}
				}
			}
			if (bot.y + 0.5 > bot.destination.y) {
				if (bot.checkCollision(0, -1)) {
					bot.pushBreak(bot.getPos(0, -1).x, bot.getPos(0, -1).y);
				}
			}
		}

		// check for holes
		if (xDelta >= 3) {
			let xOff;
			if (bot.xVelocity < 0) {
				xOff = -1;
			} else {
				xOff = 1;
			}

			// check depth
			let depth = 0;
			for (i = 1; i <= 6; i++) {
				if (bot.checkCollision(xOff, -i)) {
					break;
				} else {
					depth++;
				}
			}

			// attempt to jump over or cover hole
			if (depth >= 6) {
				if (!bot.jump()) {
					bot.placeBlock(xOff, -1);
				}
			}
		}

		// sense of time while travelling
		bot.travelTime++;
		if (bot.travelTime % 5 == 0) {
			// is the bot getting closer to the destination?
			if (
				bot.currentDistance >
				distance(bot.x, bot.y, bot.destination.x, bot.destination.y)
			) {
				bot.currentDistance = distance(
					bot.x,
					bot.y,
					bot.destination.x,
					bot.destination.y
				);
			} else {
				bot.distancePenalties++;
			}

			// if the bot is not getting closer to the destination and is taking too long
			if (
				bot.distancePenalties > 10 &&
				bot.travelTime >= 80 &&
				bot.mining == false
			) {
				bot.status = 'Mining';
				bot.busy = false;
				bot.debugChat("can't reach there.");
			}
		}
	}

	// bot has arrived at destination while travelling
	if (bot.status == 'Travelling') {
		if (distance(bot.x, bot.y, bot.destination.x, bot.destination.y) < 4) {
			// check for reason for going to this destination
			bot.travelTime = 0;
			bot.debugChat('successfully entered destination.');
			let xDest = bot.destination.x;
			let yDest = bot.destination.y;
			let reason = game.world[xDest + ',' + yDest];

			// react to reason
			let takeAction = function() {
				// make this spot no longer valuable to other bots
				delete game.interests[xDest + ',' + yDest];

				// finding wood
				const checkForWood = function(block) {
					let bool = false;
					woodBlocks.forEach(function(wood) {
						if (block == wood) {
							bool = true;
						}
					});
					return bool;
				};

				if (checkForWood(reason)) {
					bot.status = 'Harvesting Wood';
					bot.pushBreak(xDest, yDest);
					let logBreak = function(x, y) {
						if (checkForWood(game.world[x + ',' + y])) {
							bot.pushBreak(x, y);
						}
					};
					for (a = 1; a < 4; a++) {
						logBreak(xDest, yDest - a);
						logBreak(xDest, yDest + a);
					}
					bot.busy = true;
					return;
				}

				// finding ores
				let ores = [
					'Gold Ore',
					'Diamond Ore',
					'Deep Gold Ore',
					'Deep Glowing Amber',
					'Glowing Amber',
					'Deep Bixbite Ore',
					'Bixbite Ore'
				];
				let oreFound = false;
				ores.forEach(function(ore) {
					if (ore == reason) {
						oreFound = true;
						bot.pushBreak(xDest, yDest);
						return;
					}
				});
				if (oreFound) {
					return;
				}

				// looting crates
				let crates = ['Wood Crate', 'Iron Crate', 'Gold Crate'];
				let crateFound = false;
				crates.forEach(function(crate) {
					if (crate == reason) {
						bot.stopMining();
						bot.debugChat('looting crate.');
						crateFound = true;
						bot.status = 'Looting Crate';
						bot.crateX = xDest;
						bot.crateY = yDest;
						bot.lootTime = Math.round(Math.random() * 50) + 20;
						bot.busy = true;
						return;
					}
				});
				if (crateFound) {
					return;
				}

				// no reason found
				bot.status = 'Idle';
				bot.busy = false;
			};
			takeAction();
		}
	}

	// breaking blocks
	if (bot.mining) {
		const mine = function() {
			// get position
			if (bot.mineDuration == 0) {
				let currentBlock = Object.keys(bot.blocksToBreak).sort()[0];
				let position = bot.blocksToBreak[currentBlock];

				if (position == undefined) {
					bot.mining = false;
					bot.blocksToBreak = {};
					return;
				}

				bot.targetX = position[0];
				bot.targetY = position[1];
			}

			// cancel mining if necessary
			const cancelMine = function() {
				world.emit(uuid, 'Cancel Mine', {
					x: bot.targetX,
					y: bot.targetY,
					uuid: bot.uuid
				});
				bot.mineDuration = 0;
				delete bot.blocksToBreak[bot.targetX + ',' + bot.targetY];
			};

			// check if block exists
			let block = game.world[bot.targetX + ',' + bot.targetY];
			if (block == undefined) {
				cancelMine();
				return;
			}

			// get block breaking time
			let blockBreakingTime = (blocksJSON[block] || {}).breakDuration;

			// first time mining the block
			if (bot.mineDuration == 0) {
				world.emit(uuid, 'Mine', {
					x: bot.targetX,
					y: bot.targetY,
					uuid: bot.uuid,
					time: blockBreakingTime
				});
			}

			// check if bot can reach the block
			if (
				distance(bot.x, bot.y, bot.targetX, bot.targetY) > reach &&
				bot.mineDuration % 3 == 0
			) {
				cancelMine();
				return;
			}

			// check if enough time elapsed to break block
			if (bot.mineDuration >= blockBreakingTime) {
				bot.mineDuration = 0;
				bot.break(bot.targetX, bot.targetY);
				delete bot.blocksToBreak[bot.targetX + ',' + bot.targetY];
				return;
			}

			// increment time
			bot.mineDuration += 0.1;
		};

		if (bot.blocksToBreak == {}) {
			bot.mining = false;
			bot.busy = false;
		} else {
			mine();
		}
	}

	// mining mode
	if (bot.status == 'Mining') {
		if (bot.mineStatusDuration == 0) {
			bot.preferredYPosition = 10 + Math.round(Math.random() * 50);
		}

		// move down
		if (bot.y + 1 > bot.preferredYPosition) {
			if (bot.checkCollision(0, -1)) {
				bot.pushBreak(bot.getPos(0, -1).x, bot.getPos(0, -1).y);
			}
		}

		// move up
		if (bot.y - 1 < bot.preferredYPosition) {
			bot.jump();
			if (bot.checkCollision(0, 2)) {
				bot.pushBreak(bot.getPos(0, 2).x, bot.getPos(0, 2).y);
			}
			if (!bot.checkCollision(0, -1)) {
				bot.placeBlock(0, -1);
			}
		}

		// move around
		if (Math.round(bot.y) == bot.preferredYPosition) {
			bot.status = 'Travelling';
			let x = Math.random() * game.playzoneSize - 10;
			let y = bot.preferredYPosition * ((Math.random() - 0.5) * 20);
			bot.destination = { x, y };
			bot.debugChat('now mining around...');
		}

		bot.mineStatusDuration++;
	} else {
		bot.mineStatusDuration = 0;
	}

	// harvesting wood
	if (bot.status == 'Harvesting Wood') {
		bot.xVelocity = 0;
		bot.horizontalMovement = 0;
		if (bot.blocksToBreak == {} || bot.mining == false) {
			bot.debugChat('done mining tree.');
			bot.status = 'Idle';
			bot.busy = false;
		}
	}

	// looting crate
	if (bot.status == 'Looting Crate') {
		bot.stopMining();
		bot.xVelocity = 0;
		bot.horizontalMovement = 0;
		bot.lootTime--;
		if (
			game.crateContents[bot.crateX + ',' + bot.crateY] == {} ||
			bot.lootTime <= 0
		) {
			bot.debugChat('done looting crate.');
			bot.status = 'Idle';
			bot.busy = false;
		}
	}

	// automatically craft logs into planks
	if (lifetime % 5 == 0) {
	  let index = 0
		bot.inventory.forEach(function(item) {
			let bool = false;
			woodBlocks.forEach(function(wood) {
				if (item.name == wood) {
					bool = true;
					let woodType = "Oak Planks";
					if (wood == "Birch Log") {
					  woodType = "Birch Planks";
					}
					let give = inventory.give(bot.inventory, woodType, item.count * 4);
					bot.inventory = give.inventory;
					if (give.leftOver > 0) {
						world.summonItem(
							uuid,
							bot.x,
							bot.y,
							blockData.drops,
							give.leftOver
						);
					}
					bot.inventory[index] = "Delete";
				}
			});
			index++;
		});
		let newInventory = [];
		bot.inventory.forEach(function(object) {
		  if (object !== "Delete") {
		    newInventory.push(object);
		  }
		});
		bot.inventory = newInventory;
	}
};

exports.iterate = iterate;
