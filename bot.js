world = require('./game');
const blockDataScope = require('./blocks');
const inventory = require('./inventory');
blocksJSON = {};
const reach = 5; // radius

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
			}
		};

		// break block function
		bot.break = function(x, y) {
			blockData = blocksJSON[game.world[x + ',' + y]];
			if (blockData !== undefined) {
				if (blockData.drops !== undefined) {
					let give = inventory.give(bot.inventory, blockData.drops, 1);
					bot.inventory = give.inventory;
					if (give.success) {
						world.emit(
							'Pick Up Item',
							{
								x,
								y,
								item: blockData.drops,
								uuid: bot.uuid
							},
							'volatile'
						);
					}
					if (give.leftOver > 0 && give.success) {
					  world.summonItem(uuid, bot.x, bot.y, blockData.drops, give.leftOver);
					}
					if (!give.success) {
					  world.summonItem(uuid, x, y, blockData.drops, give.leftOver);
					}
				}
			}
			world.destroyBlock(uuid, x, y, bot.uuid);
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

		// get block position relative to player
		bot.getPos = function(x, y) {
			let xPos = Math.round(bot.x) + Math.round(x);
			let yPos = Math.round(bot.y - bot.heightHalf) + Math.round(y);
			return { x: xPos, y: yPos };
		};
	}
	let lifetime = (Date.now() - bot.start) / 1000;

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

	// constantly find resources
	if (Math.random() < 0.1 && bot.busy !== true) {
		// search for nearest features
		let success = false;
		const search = function() {
			Object.keys(game.interests).forEach(function(key) {
				let x = key.split(',')[0];
				let y = key.split(',')[1];
				let deltaX = Math.abs(x - bot.x);
				let deltaY = Math.abs(y - bot.y);
				if (deltaX <= 10 && deltaY <= 7) {
					bot.status = 'Travelling';
					bot.destination = { x, y };
					bot.travelTime = 0;
					success = true;
					bot.busy = true;
					bot.currentDistance = 9999;
					bot.distancePenalties = 0;
					bot.debugChat('found destination.');
					return;
				}
			});
		};
		search();
		if (!success) {
			bot.status = 'Mining';
		}
	}

	// travel to destination
	if (bot.status == 'Travelling') {
		// horizontal movement
		if (bot.x < bot.destination.x) {
			if (bot.checkCollision(1, 1)) {
				bot.pushBreak(bot.getPos(1, 1).x, bot.getPos(1, 1).y);
				if (bot.checkCollision(0, 2) || bot.checkCollision(1, 2)) {
					bot.pushBreak(bot.getPos(1, 0).x, bot.getPos(1, 0).y);
				}
			}
			bot.xVelocity = 0.75;
		} else {
			if (bot.checkCollision(-1, 1)) {
				bot.pushBreak(bot.getPos(-1, 1).x, bot.getPos(-1, 1).y);
				if (bot.checkCollision(0, 2) || bot.checkCollision(-1, 2)) {
					bot.pushBreak(bot.getPos(-1, 0).x, bot.getPos(-1, 0).y);
				}
			}
			bot.xVelocity = -0.75;
		}

		// vertical movement
		if (bot.y - 0.5 < bot.destination.y) {
			bot.jump();
			if (bot.checkCollision(0, 2)) {
				bot.pushBreak(bot.getPos(0, 2).x, bot.getPos(0, 2).y);
			}
		}
		if (bot.y + 0.5 > bot.destination.y) {
			if (bot.checkCollision(0, -1)) {
				bot.pushBreak(bot.getPos(0, -1).x, bot.getPos(0, -1).y);
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
				// finding wood
				if (reason == 'Oak Log' || reason == 'Birch Log') {
					bot.status = 'Harvesting Wood';
					bot.pushBreak(xDest, yDest);
					let logBreak = function(x, y) {
						if (
							game.world[x + ',' + y] == 'Oak Log' ||
							game.world[x + ',' + y] == 'Birch Log'
						) {
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
			let currentBlock = Object.keys(bot.blocksToBreak).sort()[0];
			let position = bot.blocksToBreak[currentBlock];

			if (position == undefined) {
				bot.mining = false;
				bot.blocksToBreak = {};
				return;
			}

			let x = position[0];
			let y = position[1];

			// cancel mining if necessary
			const cancelMine = function() {
				world.emit(uuid, 'Cancel Mine', { x, y, uuid: bot.uuid });
				bot.mineDuration = 0;
				delete bot.blocksToBreak[currentBlock];
			};

			// check if block exists
			let block = game.world[x + ',' + y];
			if (block == undefined) {
				cancelMine();
				return;
			}

			// get block breaking time
			let blockBreakingTime = blocksJSON[block].breakDuration;

			// first time mining the block
			if (bot.mineDuration == 0) {
				world.emit(uuid, 'Mine', {
					x,
					y,
					uuid: bot.uuid,
					time: blockBreakingTime
				});
			} else if (bot.mineDuration % 3 == 0) {
				world.emit(uuid, 'Mine Move', {
					x,
					y,
					uuid: bot.uuid,
					time: blockBreakingTime
				});
			}

			// check if bot can reach the block
			if (distance(bot.x, bot.y, x, y) > reach) {
				cancelMine();
				return;
			}

			// check if enough time elapsed to break block
			if (bot.mineDuration >= blockBreakingTime) {
				bot.mineDuration = 0;
				bot.break(x, y);
				delete bot.blocksToBreak[currentBlock];
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
};

exports.iterate = iterate;
