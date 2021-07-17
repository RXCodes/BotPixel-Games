// -- This is where you tell the server what to do! -- \\

// load necessary modules to start a socket.io server
const setup = require('./setup');
io = setup.io();

// load custom-created modules
const leaderboards = require('./leaderboard');
const worldGen = require('./worldgen');
const gameHandler = require('./game');
const blockData = require('./blocks');

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

// check dictionary for missing keys
const checkPacket = function(input, keys) {
	keys.forEach(function(key) {
		if (input[key] == undefined) {
			return false;
		}
	});
	return true;
};

// uuid generator
function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// reference a socket by id
const getSocket = function(id) {
	return io.sockets.connected[id] || {};
};

// generate bot name
const generateBotName = function() {
	let name = 'Bot';
	name += Math.round(Math.random() * 10000);
	return name;
};

// socket.io events
io.on('connection', function(socket) {
	// initialize variables
	io.to(socket.id).emit('connected', Date.now() / 1000);
	socket.uuid = socket.id;
	socket.matchmaking = false;
	socket.ingame = false;
	socket.name = 'Guest';

	socket.on('change name', function(input, callback) {
		if (input.length >= 3 && input.length <= 20) {
			socket.name = input;
		}
	});

	socket.on('fetch leaderboard', function(leaderboardName, callback) {
		callback(leaderboards.sortLeaderboard(leaderboardName));
	});

	socket.on('fetch global leaderboard', function(input, callback) {
		callback(leaderboards.globalLeaderboard());
	});

	socket.on('set score', function(packet, callback) {
		if (isDictionary(packet)) {
			let parsedPacket = JSON.parse(packet);
			let leaderboardName = parsedPacket.leaderboardName;
			let playerName = parsedPacket.name;
			let score = parsedPacket.score;
			let result = leaderboards.setScore(leaderboardName, playerName, score);

			if (result == true) {
				callback('The score has been successfully updated.');
			} else {
				callback(result);
			}
		} else {
			callback('Invalid packet sent. Input must be a dictionary.');
		}
	});

	socket.on('remove score', function(packet, callback) {
		if (isDictionary(packet)) {
			let parsedPacket = JSON.parse(packet);
			let leaderboardName = parsedPacket.leaderboardName;
			let playerName = parsedPacket.name;
			let result = leaderboards.removeScore(leaderboardName, playerName);

			if (result == true) {
				callback('The score has been successfully removed.');
			} else {
				callback('Error: Player does not exist.');
			}
		} else {
			callback('Invalid packet sent. Input must be a dictionary.');
		}
	});

	socket.on('generate world', function(packet, callback) {
		if (isDictionary(packet)) {
			let parsedPacket = JSON.parse(packet);
			if (parsedPacket.type == 'chunks') {
				let world = worldGen.generateWorld(parsedPacket.chunkSize);
				callback(world.chunks, world.world, world.lightingBlocks);
			} else {
				callback(worldGen.generateWorld().world);
			}
		} else {
			callback(worldGen.generateWorld().world);
		}
	});

	// player actions
	socket.on('move', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (
				checkPacket(parsedPacket, ['xPos', 'yPos', 'xVelocity', 'yVelocity'])
			) {
				gameHandler.move(socket.room, socket.uuid, parsedPacket);
			}
		}
	});
	socket.on('destroy block', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y'])) {
				gameHandler.destroyBlockEvent(
					parseInt(parsedPacket.x),
					parseInt(parsedPacket.y),
					socket.uuid,
					socket.room
				);
			}
			let inv = gameHandler.updateInventory(socket.room, socket.uuid);
			io.to(socket.id).emit('update inventory', JSON.stringify(inv));
		}
	});
	socket.on('place block', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y', 'slotID'])) {
				gameHandler.placeBlockEvent(
					parseInt(parsedPacket.x),
					parseInt(parsedPacket.y),
					parseInt(parsedPacket.slotID),
					socket.uuid,
					socket.room
				);
			}
		}
	});
	socket.on('animation', function(packet, callback) {
		if (socket.ingame) {
			socket.to(socket.room).emit('animation', {
				uuid: socket.uuid,
				name: packet
			});
			gameHandler.registerAnimation(socket.room, socket.uuid, packet);
		}
	});
	socket.on('start mine', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y'])) {
				parsedPacket.uuid = socket.uuid;
				io.to(socket.room).emit('Mine', parsedPacket);
			}
		}
	});
	socket.on('bot debug', function(packet, callback) {
		if (socket.ingame) {
			socket.join(socket.room + '-debug');
		}
	});
	socket.on('cancel mine', function(packet, callback) {
		if (socket.ingame) {
			io.to(socket.room).emit('Cancel Mine', { uuid: socket.uuid });
		}
	});

	// get timestamp
	socket.on('get timestamp', function(packet, callback) {
		callback('Success', Date.now() / 1000);
	});

	// fetch block data
	socket.on('get block data', function(packet, callback) {
		callback(blockData.get());
	});

	// initiating matchmaking
	socket.on('matchmake', function(packet, callback) {
		let matchmake = function() {
			let parsedPacket = JSON.parse(packet);
			socket.matchmaking = true;
			quene[packet['mode']] = quene[packet['mode']] || {};
			if (quene[packet['mode']] == {}) {
				queneCurrent[packet['mode']] = generateUUID();

				// random chance to have bots
				if (Math.random() < 0.4) {
					let clones = 2 + Math.round(Math.random() * 5);
					for (i = 0; i < clones; i++) {
						quene[packet['mode']][generateUUID()] = {
							type: 'Bot',
							uuid: generateUUID(),
							name: generateBotName()
						};
					}
				}
			}
			socket.join(queneCurrent[packet['mode']]);
			socket.room = queneCurrent[packet['mode']];
			socket.matchmakingMode = packet['mode'];
			quene[packet['mode']][socket.id] = {
				uuid: socket.uuid,
				type: 'Player',
				id: socket.id,
				name: socket.name
			};
			callback({
				players: Object.keys(quene[packet['mode']]).length,
				quene: Object.keys(quene[packet['mode']]),
				id: queneCurrent[packet['mode']]
			});
			io.to(queneCurrent[packet['mode']]).emit(
				'update count',
				Object.keys(quene[packet['mode']]).length
			);
		};
		if (isDictionary(packet) && !socket.matchmaking && !socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['mode', 'map'])) {
				matchmake();
			}
		}
	});

	// cancel matchmaking
	let cancelMatchmake = function(reason) {
		if (socket.matchmaking) {
			socket.leave(socket.room);
			socket.matchmaking = false;
			socket.ingame = false;
			delete (quene[socket.matchmakingMode] || {})[socket.id];
			io.to(socket.room).emit(
				'update count',
				Object.keys(quene[socket.matchmakingMode] || {}).length
			);
		}
	};
	socket.on('cancel matchmake', function(packet, callback) {
		cancelMatchmake('Matchmaking was cancelled.');
	});

	socket.on('disconnect', function(packet, callback) {
		cancelMatchmake('A player disconnected.');
	});

	socket.on('quit game', function(packet, callback) {
		if (socket.ingame) {
			socket.ingame = false;
			socket.leave(socket.room);
			socket.leave(socket.room + '-debug');
			socket.matchmaking = false;
		}
		callback('done');
	});
});

// matchmaking process
var quene = {};
var queneCurrent = {};
const matchmake = function() {
	// loop through each matchmaking room
	let deleteQuenes = [];
	Object.keys(quene).forEach(function(key) {
		// if quene is empty, delete matchmaking room
		if (quene[key] == {}) {
			deleteQuenes.push(key);
		}

		// if quene has players in it, randomly add bots
		if (
			Object.keys(quene[key] || {}).length >= 1 &&
			Object.keys(quene[key] || {}).length < 10
		) {
			if (Math.random() < 0.15) {
				quene[key][generateUUID()] = {
					type: 'Bot',
					uuid: generateUUID(),
					name: generateBotName()
				};
				io.to(queneCurrent[key]).emit(
					'update count',
					Object.keys(quene[key] || {}).length
				);
			}
		}

		// if quene is full, start match shortly
		if (Object.keys(quene[key] || {}).length >= 10) {
			let roomUUID = queneCurrent[key];
			let start = false;
			let ids = [];
			Object.keys(quene[key]).forEach(function(player) {
				if (quene[key][player].type == 'Player') {
					io.to(player).emit('set id', player);
					start = true;
					ids.push({
						type: 'Player',
						id: player,
						name: quene[key][player].name
					});
				} else {
					ids.push({ type: 'Bot', id: player, name: quene[key][player].name });
				}
			});
			if (start) {
				setTimeout(function() {
					let world = worldGen.generateWorld();
					let matchmakeData = gameHandler.startMatch(world, roomUUID, ids);
					Object.keys(matchmakeData.positions).forEach(function(id) {
						io.to(id).emit('start position', matchmakeData.positions[id]);
						getSocket(id).ingame = true;
						getSocket(id).matchmaking = false;
					});
					io.to(roomUUID).emit('open world', world.world, world.chunks);
					io.to(roomUUID).emit('loot', world.crateLoot);
				}, 1000);
			}

			// destroy matchmaking room if full
			deleteQuenes.push(key);
		}
	});

	// delete empty matchmaking rooms
	deleteQuenes.forEach(function(key) {
		delete quene[key];
		queneCurrent[key] = generateUUID();
	});
};

// run game clock
var currentTime = Date.now();
setInterval(function() {
	gameHandler.gameClock();

	// send in-game event data to players
	if (false) {
		gameHandler.gameEvents().forEach(function(event) {
			if (event.type !== 'volatile') {
				io.in(event.uuid).emit(event.event, event.data);
			} else {
				io.volatile.in(event.uuid).emit(event.event, event.data);
			}
		});
	}

	matchmake();

	// log input
	let debug = false;
	if (debug) {
		console.log('Sent events: ' + gameHandler.gameEvents().length);
		console.log('Time delta: ' + (Date.now() - currentTime + 'ms'));
		currentTime = Date.now();
	}

	// clear events after sending them
	gameHandler.clearEvents();
}, 100);

// ping all connected clients
setInterval(function() {
	io.emit('timestamp', Date.now() / 1000);
}, 1000);
