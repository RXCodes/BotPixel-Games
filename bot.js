world = require('./game');
const blockDataScope = require('./blocks');
blocksJSON = {};
const reach = 4; // radius

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
		(bot.status = 'Idle'), (bot.horizontalMovement = 0);
		bot.movementDuration = 0;
		bot.isOnGroundDuration = 0;
		bot.idleDuration = 0;
		bot.jumpDelay = 20;
		bot.start = Date.now();
		bot.blocks = 0;
		bot.blocksToBreak = {};
		bot.mining = false;
		bot.mineDuration = 0;
		blocksJSON = blockDataScope.blocks();

		// jump function
		bot.jump = function() {
			if (bot.isOnGround == true) {
				bot.jumpDelay = 15;
				bot.yVelocity = 0.75;
			}
		};

		// break block function
		bot.break = function(x, y) {
			world.destroyBlock(uuid, x, y);
		};

		// append to blocks to break
		bot.pushBreak = function(x, y) {
			if (game.world[x + ',' + y] !== undefined) {
				bot.blocksToBreak[x + ',' + y] = [x, y];
				bot.mining = true;
			}
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

	// initially find resources
	if (lifetime < 60 && bot.status == 'Idle') {
		if (Math.random() > 0.15) {
			bot.status = 'Checking for Loot';
		}
	}
	if (bot.status == 'Checking for Loot') {
		// randomly revert to idle
		if (Math.random() < 0.2) {
			bot.status = 'Idle';
		}

		// search for nearest features
		const search = function() {
			Object.keys(game.interests).forEach(function(key) {
				let x = key.split(',')[0];
				let y = key.split(',')[1];
				let deltaX = Math.abs(x - bot.x);
				let deltaY = Math.abs(y - bot.y);
				if (deltaX <= 10 && deltaY <= 7) {
					bot.status = 'Travelling';
					bot.iterationRate = 2;
					bot.iterationsLeft = 10;
					bot.pathfindMap = {};
					bot.destination = { x, y };
					bot.travelTime = 0;
					return;
				}
			});
		};
		search();
	}

	// travel to destination
	if (bot.status == 'Travelling') {
		// horizontal movement
		if (bot.x < bot.destination.x) {
			bot.xVelocity = 0.75;
		} else {
			bot.xVelocity = -0.75;
		}

		// vertical movement
		if (bot.y < bot.destination.y) {
			bot.jump();
		} else {
			if (bot.checkCollision(0, -1)) {
				bot.pushBreak(bot.getPos(0, -1).x, bot.getPos(0, -1).y);
			}
		}
	}

	// mining
	if (bot.mining) {
		const mine = function() {
			// get position
			let currentBlock = Object.keys(bot.blocksToBreak)[0];
			let position = bot.blocksToBreak[currentBlock];

			if (position == undefined) {
				bot.mining = false;
				return;
			}

      // cancel mining if necessary
			const cancelMine = function() {
				world.emit(uuid, 'Cancel Mine', { x, y, uuid: bot.uuid });
				bot.mineDuration = 0;
				delete bot.blocksToBreak[currentBlock];
			};

			let x = position[0];
			let y = position[1];

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
		} else {
			mine();
		}
	}
};

exports.iterate = iterate;
