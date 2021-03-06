const secret = process.env['Password'];
// -- This is where you tell the server what to do! -- \\

// load necessary modules to start a socket.io server
const setup = require('./setup');
require('./database').initialize();
require('./accounts').initialize();
require('./rooms').initialize();
require('./inventory').initialize();
require('./bot').initialize();
io = setup.io();

// load custom-created modules
const leaderboards = require('./leaderboard');
const worldGen = require('./worldgen');
const gameHandler = require('./game');
const blockData = require('./blocks');
const crateLoot = require('./crateloot');
const hyperPad = require('./jsonsafe');
const worldgen = require('./worldgen');
const food = require('./food');
const foodJSON = food.foodJSON();
const weapons = require('./weapons');
const weaponData = weapons.weapons();
const effects = require("./effects");
const crafting = require("./crafting");
const creative = require("./creative");
const craftingRecipes = crafting.recipes();
const creativeBlocksJSON = creative.blocks();
crateLoot.setup();
gameHandler.initialize();

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
	io.to(socket.id).emit('connected', "connected");
	io.to(socket.id).emit('default world gen', worldgen.defaultWorldSettings());
  io.to(socket.id).emit('weapon data', weaponData);
  io.to(socket.id).emit("effect status data", effects.effects());
  io.to(socket.id).emit("crafting recipe", craftingRecipes);
  io.to(socket.id).emit("creative blocks", creativeBlocksJSON);
	socket.uuid = socket.id;
	socket.matchmaking = false;
	socket.ingame = false;
	socket.name = 'Guest';

  socket.on('device check', function(input, callback) {
    callback(socket.request.headers);
  });

	socket.on('verify', function(input, callback) {
		if (input == secret) {
			socket.secure = true;
			callback('success');
		} else {
			callback('error');
		}
	});

	socket.on('change name', function(input, callback) {
		if (input.length >= 3 && input.length <= 20) {
			socket.name = input;
			if (socket.login) {
				socket.accountData.displayName = input;
			}
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
		if (isDictionary(packet) && socket.secure) {
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
				gameHandler.move(socket.room, socket.id, parsedPacket);
			}
		}
	});
	socket.on('destroy block', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y'])) {
				if (!socket.creative) {
					gameHandler.destroyBlockEvent(
						parseInt(parsedPacket.x),
						parseInt(parsedPacket.y),
						socket.id,
						socket.room
					);
				} else {
					gameHandler.destroyBlock(
						socket.room,
						parseInt(parsedPacket.x),
						parseInt(parsedPacket.y)
					);
				}
			}
			let inv = gameHandler.updateInventory(socket.room, socket.id);
			io.to(socket.id).emit('update inventory', JSON.stringify(inv));
			callback(parsedPacket.x + ',' + parsedPacket.y);
		}
	});
	socket.on('place block', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y', 'slotID'])) {
				if (!socket.creative) {
					gameHandler.placeBlockEvent(
						parseInt(parsedPacket.x),
						parseInt(parsedPacket.y),
						parseInt(parsedPacket.slotID),
						socket.id,
						socket.room
					);
				} else {
					gameHandler.placeBlock(
						socket.room,
						parseInt(parsedPacket.x),
						parseInt(parsedPacket.y),
						parsedPacket.block
					);
				}
			}
			callback(parsedPacket.x + ',' + parsedPacket.y);
		}
	});
	socket.on('animation', function(packet, callback) {
		if (socket.ingame) {
			socket.to(socket.room).emit('animation', {
				uuid: socket.id,
				name: packet
			});
			gameHandler.registerAnimation(socket.room, socket.id, packet);
      callback("done");
		}
	});
	socket.on('start mine', function(packet, callback) {
		if (isDictionary(packet) && socket.ingame) {
			let parsedPacket = JSON.parse(packet);
			if (checkPacket(parsedPacket, ['x', 'y'])) {
				parsedPacket.uuid = socket.id;
				io.to(socket.room).emit('Mine', parsedPacket);
			}
		}
    callback("done");
	});
	socket.on('bot debug', function(packet, callback) {
		if (socket.ingame) {
			socket.join(socket.room + '-debug');
		}
    callback("done");
	});
	socket.on('cancel mine', function(packet, callback) {
		if (socket.ingame) {
			io.to(socket.room).emit('Cancel Mine', { uuid: socket.uuid });
		}
    callback("done");
	});

	// get timestamp
	socket.on('get timestamp', function(packet, callback) {
		callback('Success', Date.now() / 1000);
	});

	// fetch block data
	socket.on('get block data', function(packet, callback) {
		callback(blockData.get());
	});

	// fetch default world gen data
	socket.on('get default world gen', function(packet, callback) {
		callback(worldgen.defaultWorldSettings());
	});

	// fetch food data
	socket.on('get food data', function(packet, callback) {
		callback(foodJSON);
	});

	// initiating matchmaking
	socket.on('matchmake', function(packet, callback) {
		socket.matchmake(packet, callback);
	});

	// matchmake function
	socket.matchmake = function(packet, callback = function() {}) {
		if (socket.secure) {
			let matchmake = function() {
				let parsedPacket = JSON.parse(packet);
				socket.matchmaking = true;
				quene[parsedPacket.mode] = quene[parsedPacket.mode] || {};
				if (Object.keys(quene[parsedPacket.mode]).length == 0) {
					queneCurrent[parsedPacket.mode] = generateUUID();
					queneCapacity[parsedPacket.mode] = parseInt(
						parsedPacket.capacity || 10
					);
					queneCache[parsedPacket.mode] = {};
					Object.keys(parsedPacket).forEach(function(key) {
						queneCache[parsedPacket.mode][key] = parsedPacket[key];
					});

					// random chance to have bots
					if (Math.random() < 0.3 && !parsedPacket.disableBots) {
						let clones = 1 + Math.round(Math.random() * 3);
						for (i = 0; i < clones; i++) {
							quene[parsedPacket['mode']][generateUUID()] = {
								type: 'Bot',
								uuid: generateUUID(),
								name: generateBotName()
							};
						}
					}
				}
				socket.join(queneCurrent[parsedPacket['mode']]);
				socket.room = queneCurrent[parsedPacket['mode']];
				socket.matchmakingMode = parsedPacket['mode'];
				quene[parsedPacket['mode']][socket.id] = {
					uuid: socket.uuid,
					type: 'Player',
					id: socket.id,
					name: socket.name
				};
				io.to(queneCurrent[parsedPacket['mode']]).emit(
					'update count',
					Object.keys(quene[parsedPacket['mode']]).length
				);
				callback(
					hyperPad.serialize({
						players: Object.keys(quene[parsedPacket['mode']]).length,
						quene: Object.keys(quene[parsedPacket['mode']]),
						id: queneCurrent[parsedPacket['mode']],
						capacity: queneCapacity[parsedPacket['mode']] || 10
					})
				);
			};
			if (isDictionary(packet) && !socket.matchmaking && !socket.ingame) {
				let parsedPacket = JSON.parse(packet);
				if (checkPacket(parsedPacket, ['mode', 'map'])) {
					matchmake();
				}
			}
		}
	};

	// cancel matchmaking
	let cancelMatchmake = function(reason) {
		if (socket.matchmaking) {
			socket.leave(socket.room);
			socket.matchmaking = false;
			socket.ingame = false;
			delete (quene[socket.matchmakingMode] || {})[socket.id];
			io.to(socket.room).emit(
				'update count',
				JSON.stringify(Object.keys(quene[socket.matchmakingMode] || {}).length)
			);
		}
	};
	socket.on('cancel matchmake', function(packet, callback) {
		cancelMatchmake('Matchmaking was cancelled.');
    callback("done");
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
			socket.leaveRoom();
		}
		callback('done');
	});
});

// matchmaking process
var quene = {};
var queneCurrent = {};
var queneCapacity = {};
var queneCache = {};
const matchmake = function() {
	// loop through each matchmaking room
	let deleteQuenes = [];
	Object.keys(quene).forEach(function(key) {
		// if quene is empty, delete matchmaking room
		if (quene[key] == {}) {
			deleteQuenes.push(key);
		}

		// if quene has players in it, randomly add bots
		let repeat = Math.max(Math.round(queneCapacity[key] / 10), 1);
		for (i = 0; i < repeat; i++) {
			if (
				Object.keys(quene[key] || {}).length >= 1 &&
				Object.keys(quene[key] || {}).length < queneCapacity[key]
			) {
				if (Math.random() < 0.15 && !queneCache[key].disableBots) {
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
		}

		// if quene is full, start match shortly
		if (Object.keys(quene[key] || {}).length >= queneCapacity[key]) {
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
				const startGame = function(roomData) {
					setTimeout(async function() {
						let world = await worldGen.generateWorld();
						let matchmakeData = gameHandler.startMatch(
							world,
							roomUUID,
							ids,
							roomData
						);
						Object.keys(matchmakeData.positions).forEach(function(id) {
							io.to(id).emit('start position', matchmakeData.positions[id]);
							getSocket(id).ingame = true;
							getSocket(id).matchmaking = false;
							getSocket(id).host = false;
						});
						io.to(roomUUID).emit(
							'open world',
							hyperPad.serialize(world.world),
							world.chunks,
							hyperPad.serialize(world.crateLoot)
						);
						io.to(roomUUID).emit('loot', hyperPad.serialize(world.crateLoot));
						io.to(roomUUID).emit('player count', JSON.stringify(ids.length));
            io.to(roomUUID).emit('room data', roomData);
					}, 500);
				};
				let meta = false;
				if (queneCache[key].customRoom) {
					meta = queneCache[key].meta;
				}
				startGame(meta);
			}

			// destroy matchmaking room if full
			deleteQuenes.push(key);
		}
	});

	// delete empty matchmaking rooms
	deleteQuenes.forEach(function(key) {
		delete quene[key];
		delete queneCache[key];
		delete queneCurrent[key];
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
	io.emit('timestamp', JSON.stringify(Date.now() / 1000));
}, 1000);
