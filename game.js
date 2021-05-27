var games = {};
const botFunction = require('./bot');

function generateUUID() {
	return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// start match
startMatch = function(world, uuid) {
	games[uuid] = {
		world: world.world,
		collisions: world.collisions,
		playerObjects: [],
		startTime: Date.now(),
		matchBegins: Date.now() + 20.9 * 1000,
		uuid,
		borderSize: 100,
		playzoneSize: 105
	};

	let spawnPlayer = function(x, y) {
		defaultWidth = 0.75;
		defaultHeight = 1.9;
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
			uuid: generateUUID()
		};
		games[uuid].playerObjects.push(object);
	};

	for (i = 0; i < 10; i++) {
		spawnPlayer((i - 5) * 10 + 5, 100);
	}
};

// iterate through each game
runGame = function(game) {
	let world = game.world;
	let collisions = game.collisions;

	let playerPhysics = function(object) {
		object.isOnGround = false;
		
		// physical movement
		object.y += object.yVelocity;
		object.x += object.xVelocity;
		let timeDelta = Date.now() / object.time;
		object.time = Date.now();
		object.yVelocity += (object.yGravity - object.yVelocity) / (timeDelta * 45);
		object.xVelocity += (0 - object.xVelocity) / (timeDelta * 45);

		// check if stuck in block
		while (
			collisions[Math.round(object.x) + ',' + Math.round(object.y - 0.4)] !==
			undefined
		) {
			object.y++;
			object.yVelocity = 0;
			object.isOnGround = true;
		}

		// bottom block detection
		if (
			collisions[
				Math.round(object.x) + ',' + Math.floor(object.y - object.heightHalf)
			] !== undefined
		) {
			if (
				Math.round(object.y - object.heightHalf + 0.5) >
				object.y - object.heightHalf
			) {
				object.y =
					Math.floor(object.y - object.heightHalf) + object.heightHalf + 0.5;
				object.yVelocity = 0;
				object.isOnGround = true;
			}
		}

		// top block detection
		if (
			collisions[
				Math.round(object.x) + ',' + Math.ceil(object.y + object.heightHalf)
			] !== undefined
		) {
			if (
				Math.round(object.y + object.heightHalf - 0.5) <
				object.y + object.heightHalf
			) {
				object.y =
					Math.ceil(object.y + object.heightHalf) - object.heightHalf - 0.5;
				object.yVelocity = -1;
			}
		}

		// left blocks detection
		if (
			collisions[
				Math.ceil(object.x - object.widthHalf) +
					',' +
					Math.round(object.y - object.heightHalf)
			] !== undefined ||
			collisions[
				Math.ceil(object.x - object.widthHalf) +
					',' +
					Math.round(object.y - object.heightHalf + 1)
			] !== undefined
		) {
			if (
				Math.round(object.x - object.widthHalf) + 0.5 >
				object.x - object.widthHalf
			) {
				object.x = Math.ceil(object.x + object.widthHalf) - object.width + 0.5;
				object.xVelocity = 0;
			}
		}

		// physical border check
		object.x = Math.max(game.borderSize / -2, object.x);
		object.x = Math.min(game.borderSize / 2, object.x);
	};

	game.playerObjects.forEach(function(player) {
		botFunction.iterate(player, game);
		if (game.matchBegins < Date.now()) {
			playerPhysics(player);
		}
	});
	pushEvent(game.uuid, 'Player Move', game.playerObjects, 'volatile');
};

// end match
var endMatch = function(uuid) {
	delete games[uuid];
};

// game clock
var gameClock = function() {
	Object.keys(games).forEach(function(uuid) {
		if ((Date.now() - games[uuid].startTime) / 1000 < 60 * 20) {
			runGame(games[uuid]);
		} else {
			endMatch(uuid);
		}
	});
};

pushEvent = function(worldUUID, event, data, type) {
	gameEvents.push({
		uuid: worldUUID,
		event,
		data,
		type
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
