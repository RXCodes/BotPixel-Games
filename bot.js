world = require('./game');
const blockDataScope = require('./blocks');
const weapons = require('./weapons');
const inventory = require('./inventory');
const pathfind = require('./pathfind');
const food = require('./food');
const foodJSON = food.foodJSON();
var blocksJSON = {};
var weaponsJSON = {};
const reach = 5; // radius
const woodBlocks = ['Oak Log', 'Birch Log'];
const initialize = function() {
  blocksJSON = blockDataScope.blocks();
  weaponsJSON = weapons.weapons();
};
exports.initialize = initialize;
const getBlock = function(block) {
	return blocksJSON[block] || {};
};
const distance = function(x, y, x2, y2) {
	xDelta = (x2 - x) * (x2 - x);
	yDelta = (y2 - y) * (y2 - y);
	return Math.sqrt(xDelta + yDelta);
};
const inRange = function(x, y, x2, y2, range) {
	xDelta = (x2 - x) ** 2;
	yDelta = (y2 - y) ** 2;
	if (xDelta + yDelta <= range ** 2) {
		return true;
	}
	return false;
};
const setup = require('./setup');
io = setup.io();

var iterate = async function(bot, game) {
  
  return new Promise((resolve) => {
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
		bot.miningTime = 0;
		bot.mineStatusDuration = 0;
		bot.busy = false;
		bot.holding = 'Pickaxe';
		bot.lifetimeInt = 0;

		// jump function
		bot.jump = function() {
			if (bot.isOnGround == true) {
				bot.jumpDelay = 15;
				bot.yVelocity = 0.85;
				return true;
			}
			return false;
		};

		// follow enemy and attack
		bot.fightEnemy = function(player) {
			if (bot.status !== 'Fighting') {
				bot.jump();
				bot.status = 'Fighting';
				bot.target = player;
			}
		};

		// break block function
		bot.break = function(x, y) {
			let blockData = blocksJSON[game.world[x + ',' + y]];
			if (blockData !== undefined) {
				if (blockData.drops !== undefined) {
					const givePlayer = function(item, count) {
						let give = inventory.give(bot.inventory, item, count);
						bot.inventory = give.inventory;
						if (give.success == true) {
							let type = 'Items/';
							if (getBlock(item).breakDuration) {
								type = 'Blocks/';
							}
							world.emit(uuid, 'Pick Up Item', {
								x,
								y,
								type,
								item,
								uuid: bot.uuid
							});
						}
						if (give.leftOver > 0 && give.success) {
							world.summonItem(uuid, bot.x, bot.y, item, give.leftOver);
						}
						if (!give.success) {
							world.summonItem(uuid, x, y, item, give.leftOver);
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
			world.emit(uuid + '-debug', 'Debug Chat', {
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
				if (game.world[newX + ',' + newY] == undefined) {
					world.placeBlock(uuid, newX, newY, bot.inventory[useSlot].name);
					let type = 'Items/';
					if (getBlock(bot.inventory[useSlot].name).breakDuration) {
						type = 'Blocks/';
					}
					bot.holdItem(type + bot.inventory[useSlot].name);
					inv = inventory.remove(bot.inventory, useSlot, 1);
					bot.inventory = inv.inventory;
				}
			}
		};

		// pathfind destination
		bot.pathfind = function(x, y, intent = 'None') {
		  if (false) {
			let result = pathfind.start(
				{ x: Math.round(bot.x), y: Math.round(bot.y) },
				{ x: Math.round(x), y: Math.round(y) },
				game.blockCost
			);
			if (result.success) {
				if (intent !== 'Fight') {
					bot.status = 'Pathfinding';
				}
				bot.pathfinding = true;
				bot.distanceValues = result.distanceMap;
				bot.debugChat('Now pathfinding...');
			} else {
				bot.pathfinding = false;
				bot.status = 'Travelling';
				bot.debugChat('Failed to pathfind.');
			}
		  } else {
		    bot.status = "Travelling";
		  }
			bot.destination = { x, y };
		};

		// warn bots to move into playzone
		bot.playzoneWarn = function() {
			let x = this.x;
			let y = this.y;
			let bot = this;
			if (!this.playzoneWarned) {
				bot.playzoneWarned = true;
				bot.stopMining();
				bot.pathfind(game.playzoneXOffset + Math.random(), y);
				setTimeout(function() {
					bot.playzoneWarned = false;
				}, 10 * 1000);
			}
		};

		// set bot to hold item
		bot.holdItem = function(item) {
			if (bot.holding !== item) {
			  bot.cancelEat();
				bot.holding = item;
				io.to(bot.worldUUID).emit('animation', {
					uuid: bot.uuid,
					name: '/hold ' + item
				});
			}
		};
	}
	let lifetime = Math.round((Date.now() - bot.start) / 1000);
	bot.lifetimeInt++;

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
				bot.status = 'Travelling';
				bot.destination = { x, y };
				delete game.interests[x + ',' + y];
			}
		};
		search();
		if (!success) {
			bot.status = 'Mining';
		}
	}

	// pathfind to destination
	if (bot.status == 'Pathfinding' || bot.pathfinding) {
		const getD = function(x, y) {
			return bot.distanceValues[x + ',' + y] || 0;
		};
		let currentD = getD(bot.getPos().x, bot.getPos().y);
		let currentDTop = getD(bot.getPos().x, bot.getPos().y + 1);
		if (currentD == 0) {
			bot.timer = setTimeout(function() {
				bot.status = 'Travelling';
				bot.pathfinding = false;
			}, 1000);
		} else {
			clearTimeout(bot.timer);
		}

		// move left
		if (currentD < getD(bot.getPos().x - 1, bot.getPos().y)) {
			bot.horizontalMovement = -0.75;
			bot.xVelocity = -0.75;
			if (bot.checkCollision(-1, 0)) {
				bot.pushBreak(bot.getPos().x - 1, bot.getPos().y);
			}
		}
		if (currentDTop < getD(bot.getPos().x - 1, bot.getPos().y + 1)) {
			bot.horizontalMovement = -0.75;
			bot.xVelocity = -0.75;
			if (bot.checkCollision(-1, 1)) {
				bot.pushBreak(bot.getPos().x - 1, bot.getPos().y + 1);
			}
		}

		// move right
		if (currentD > getD(bot.getPos().x - 1, bot.getPos().y)) {
			bot.horizontalMovement = 0.75;
			bot.xVelocity = 0.75;
			if (bot.checkCollision(1, 0)) {
				bot.pushBreak(bot.getPos().x + 1, bot.getPos().y);
			}
		}
		if (currentDTop > getD(bot.getPos().x - 1, bot.getPos().y + 1)) {
			bot.horizontalMovement = 0.75;
			bot.xVelocity = 0.75;
			if (bot.checkCollision(-1, 1)) {
				bot.pushBreak(bot.getPos().x - 1, bot.getPos().y + 1);
			}
		}

		// jump and mine
		if (currentD < currentDTop) {
			bot.jump();
			if (bot.checkCollision(0, 2) && bot.checkCollision(0, -1)) {
				bot.pushBreak(bot.getPos().x, bot.getPos().y + 2);
			}
		}

		// dig down
		if (currentD < getD(bot.getPos().x, bot.getPos().y - 1)) {
			bot.pushBreak(bot.getPos().x, bot.getPos().y - 1);
		}
	}

	// travel to destination function
	const travel = function(type = 'Normal') {
		let deltaType = {
			Normal: 3,
			Player: 1
		};
		let xDeltaThreshold = deltaType[type];
		let xDelta = Math.abs(bot.destination.x - bot.x);

		// horizontal movement
		if (xDelta >= xDeltaThreshold) {
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
			if (
				!bot.checkCollision(0, -1) &&
				!bot.checkCollision(0, 2) &&
				bot.y > bot.destination.y
			) {
				bot.placeBlock(0, -1);
			}
		}

		// vertical movement
		if (xDelta < xDeltaThreshold) {
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
			for (i = 1; i <= 5; i++) {
				if (bot.checkCollision(xOff, -i)) {
					break;
				} else {
					depth++;
				}
			}

			// attempt to jump over or cover hole
			if (depth >= 4 && bot.y < bot.destination.y) {
				if (!bot.jump()) {
					bot.placeBlock(xOff, -1);
				}
			}
		}

		// sense of time while travelling
		bot.travelTime++;
		if (bot.travelTime % 6 == 0) {
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
	};

	// travel to destination, no pathfinding
	if (bot.status == 'Travelling') {
		travel();
	}

	// bot has arrived at destination while travelling
	if (bot.status == 'Travelling') {
		if (
			Math.abs(bot.x - bot.destination.x) < y &&
			Math.abs(bot.y - bot.destination.y) < 4
		) {
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
			if (inRange(bot.x, bot.y, bot.targetX, bot.targetY, reach) !== true) {
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
			let x = Math.random() * game.playzoneSize - 10 + game.playzoneXOffset;
			let y = Math.min(
				bot.preferredYPosition * ((Math.random() - 0.5) * 20),
				10
			);
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
		bot.finishLooting = false;
		if (bot.lifetimeInt % 5 == 0) {
			// retrieve crate data
			let crateData = game.crateLoot[bot.crateX + ',' + bot.crateY];
			if (crateData) {
			let itemsToTake = [];
			Object.keys(crateData).forEach(function(slot) {
				// slot data
				let slotData = crateData[slot];

				// always take food
				if (foodJSON[slotData.name]) {
					itemsToTake.push(slot);
				}

				// take blocks if needed
				if ((blocksJSON[slotData.name] || {}).breakDuration) {
					let block = inventory.getBlocks(bot.inventory);
					if (block.totalSolidBlocks <= 99) {
						itemsToTake.push(slot);
					}
				}

        // take a weapon
        if (weaponsJSON[slotData.name]) {

          // check if the weapon is better than what the player currently has
          let selectedWeaponPower = 0;
          let weaponSlotID = undefined;
          let weaponInventoryIndex = 0;
          let selectedWeaponType = weaponsJSON[slotData.name].type;
          bot.inventory.forEach(function(item) {
            if ((weaponsJSON[item.name] || {}).type == selectedWeaponType) {
              switch(selectedWeaponType) {
                case "Melee":
                  currentWeaponPower = (1 / weaponsJSON[item.name].attackSpeed) * weaponsJSON[item.name].damage;
                  break;
                case "Firearm":
                  currentWeaponPower = (1 / weaponsJSON[item.name].firingRate) * weaponsJSON[item.name].damage;
                case "Throwable":
                  currentWeaponPower = weaponsJSON[item.name].damage * weaponsJSON[item.name].range;
                  break;
              }
              currentWeaponPower = parseInt(currentWeaponPower) || 0;
              selectedWeaponPower = Math.max(currentWeaponPower, selectedWeaponPower);
              weaponSlotID = weaponInventoryIndex;
            }
            weaponInventoryIndex++;
          });
          let weaponPower = weaponsJSON[slotData.name].range * weaponsJSON[slotData.name].damage;
          if (selectedWeaponPower < weaponPower) {
            itemsToTake.push(slot);
            if (weaponSlotID) {
              bot.dropItem(weaponSlotID);
            }

            // drop blocks if weapon cannot be picked up
            if (bot.inventory.length < 7) {
              let slotToDrop = 0;
              let currentSlot = 0;
              let blockCount = 999;
              bot.inventory.forEach(function(item) {
                if (item.type == "Blocks/" && item.count < blockCount) {
                  blockCount = item.count;
                  slotToDrop = currentSlot;
                }
                if (item.type == "Items/") {
                  slotToDrop = currentSlot;
                }
                currentSlot++;
              });
              bot.dropItem(currentSlot);
            }
          }

        }
				
				// take desired valuables
				if ((blocksJSON[slotData.name] || {}).priority) {
				  for (i = 0; i < Math.ceil(blocksJSON[slotData.name].priority); i++) {
				    itemsToTake.push(slot);
				  }
				}
				
			});

			// pick random item to grab
			if (itemsToTake.length == 0) {
				bot.finishLooting = true;
			} else {
				let index = Math.round(Math.random() * (itemsToTake.length - 1));
				bot.crateCollectItem(bot.crateX + ',' + bot.crateY, itemsToTake[index]);
			}
			}
		}
		if (
			game.crateLoot[bot.crateX + ',' + bot.crateY] == {} ||
			bot.lootTime <= 0 ||
			bot.finishLooting
		) {
			bot.debugChat('done looting crate.');
			bot.status = 'Idle';
			bot.busy = false;
		}
	}

	// automatically craft logs into planks
	if (lifetime % 5 == 0) {
		let index = 0;
		bot.inventory.forEach(function(item) {
			let bool = false;
			woodBlocks.forEach(function(wood) {
				if (item.name == wood) {
					bool = true;
					let woodType = 'Oak Planks';
					if (wood == 'Birch Log') {
						woodType = 'Birch Planks';
					}
					let give = inventory.give(bot.inventory, woodType, item.count * 4);
					bot.inventory = give.inventory;
					if (give.leftOver > 0) {
						world.summonItem(
							uuid,
							bot.x,
							bot.y,
							woodType,
							give.leftOver
						);
					}
					bot.inventory[index] = 'Delete';
				}
			});
			index++;
		});
		let newInventory = [];
		bot.inventory.forEach(function(object) {
			if (object !== 'Delete') {
				newInventory.push(object);
			}
		});
		bot.inventory = newInventory;
	}

	// mining animation
	if (bot.mining) {
		if (bot.miningTime == 0) {
			bot.holding = 'Pickaxe';
			io.to(bot.worldUUID).emit('animation', {
				uuid: bot.uuid,
				name: 'start mine animation'
			});
		}
		bot.miningTime++;
	}
	if (bot.miningTime > 0 && !bot.mining) {
		io.to(bot.worldUUID).emit('animation', {
			uuid: bot.uuid,
			name: 'stop mine animation'
		});
		bot.miningTime = 0;
	}

	// check surrounding players
	let viewRadius = 8;
	let combatRadius = 2.5;
	let targetPlayer = undefined;
	if (bot.lifetimeInt % 5 == 0 && game.pvp) {
		let combatRadiusUsed = false;
		game.playerObjects.forEach(function(player) {
			if (Math.abs(player.x - bot.x) <= viewRadius) {
				if (Math.abs(player.y - bot.y) <= viewRadius) {
					if (player.uuid !== bot.uuid) {
						targetPlayer = player;
					}
				}
			}
		});
		game.playerObjects.forEach(function(player) {
			if (Math.abs(player.x - bot.x) <= combatRadius) {
				if (Math.abs(player.y - bot.y) <= combatRadius) {
					if (player.uuid !== bot.uuid) {
						combatRadiusUsed = true;
						targetPlayer = player;
					}
				}
			}
		});

		// flight or fight response
		let response = 'Flee';
		if (targetPlayer !== undefined) {
			if (bot.health > 50 || combatRadiusUsed) {
				response = 'Fight';
			}
			if (bot.y + 3 < targetPlayer.y && bot.health > 20) {
				response = 'Fight';
			}
			if (response == 'Fight' && bot.status !== 'Fighting') {
				bot.jump();
				bot.stopMining();
				bot.status = 'Fighting';
				bot.target = targetPlayer.uuid;
			}
			if (bot.status !== 'Fleeing' && response == 'Flee') {
				bot.jump();
				bot.stopMining();
				bot.status = 'Fleeing';
				bot.target = targetPlayer.uuid;
				bot.pathfind(targetPlayer.x, targetPlayer.y, 'Fight');
			}
		}
	}

	// fight response
	if (bot.status == 'Fighting') {
		if (bot.lifetimeInt % 3 == 0) {
			bot.targetPlayer = undefined;
			game.playerObjects.forEach(function(player) {
				if (player.uuid == bot.target) {
					bot.targetPlayer = player;
				}
			});
		}
		if (bot.targetPlayer !== undefined) {
			bot.destination = { x: bot.targetPlayer.x, y: bot.targetPlayer.y };
			travel('Player');
			bot.mining = false;
			if (Math.abs(bot.targetPlayer.x - bot.x) <= 3) {
				if (Math.abs(bot.targetPlayer.y - bot.y) <= 3) {
					if (Math.abs(bot.targetPlayer.y - bot.y) <= 1) {
						bot.jump();
					}
          let hasMelee = false;
          let currentSlotIndex = 0;
          let meleeSlotIndex = 0;
          bot.inventory.forEach(function(item) {
            if (item.type == "Weapons/") {
              if (weaponsJSON[item.name]) {
                hasMelee = true;
                meleeSlotIndex = currentSlotIndex;
              }
              currentSlotIndex;
            }
          });
          if (!hasMelee) {
					  bot.mining = true;
          } else {
            bot.cancelEat();
            bot.stopMining();
            bot.holdItem("Weapons/" + bot.inventory[meleeSlotIndex].name);
            bot.startAttack(meleeSlotIndex);
          }
				}
			}
      if (!bot.mining && !bot.attacking) {
        bot.stopAttack();
      }
		} else {
			if (Math.random() < 0.5) {
				bot.status = 'Mining';
			} else {
				bot.status = 'Idle';
			}
		}
	}

	// flight response
	if (bot.status == 'Fleeing') {
		if ((bot.lifetimeInt + 1) % 3 == 0) {
			bot.targetPlayer = undefined;
			game.playerObjects.forEach(function(player) {
				if (player.uuid == bot.target) {
					bot.targetPlayer = player;
				}
			});
		}
		if (bot.targetPlayer !== undefined) {
			bot.destination = {
				x: game.playzoneXOffset,
				y: 70 + Math.random() * 20
			};
			travel();

			// block enemy
			if (Math.random() < 0.4) {
				if (bot.xVelocity > 0 && bot.targetPlayer.x + 3 < bot.x) {
					bot.placeBlock(-1, 0);
					bot.placeBlock(-1, 1);
				}
				if (bot.xVelocity < 0 && bot.targetPlayer.x - 3 > bot.x) {
					bot.placeBlock(1, 0);
					bot.placeBlock(1, 1);
				}
			}
		} else {
			bot.jump();
			bot.status = 'Mining';
		}
	}

	// fight or flight resolve
	if (bot.status == 'Fighting' || bot.status == 'Fleeing') {
		if (bot.targetPlayer !== undefined) {
			if (Math.abs(bot.targetPlayer.x - bot.x) >= 10) {
				if (Math.abs(bot.targetPlayer.y - bot.y) >= 10) {
					if (Math.random() < 0.5) {
						bot.status = 'Idle';
					} else {
						bot.status = 'Mining';
					}
				}
			}
		}
	}

	// eat to heal
	if (
		bot.status !== 'Fighting' &&
		bot.health <= 80 &&
		!bot.eating &&
		bot.lifetimeInt % 10 == 0
	) {
		let eat = false;
		let index = 0;
		let eatIndex = 0;
		bot.inventory.forEach(function(item) {
			if (foodJSON[item.name]) {
				eat = true;
				eatIndex = index;
			}
			index++;
		});
		if (eat && Math.random() > bot.health / 100) {
		  bot.status = "Idle";
		  bot.stopMining();
		  bot.holdItem("Items/" + bot.inventory[eatIndex].name);
		  setTimeout(function() {
			  bot.startEat(eatIndex);
		  }, 1000);
		}
	}
	
	resolve();
  });
  
};

exports.iterate = iterate;
