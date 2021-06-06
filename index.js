// -- This is where you tell the server what to do! -- \\

// load necessary modules to start a socket.io server
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const path = require('path');

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

// uuid generator
function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// initiate socket.io server
const app = express();
const httpserver = http.Server(app);
const io = socketio(httpserver);
const gamedirectory = path.join(__dirname, 'html');
app.use(express.static(gamedirectory));
httpserver.listen(3000);

// socket.io events
io.on('connection', function(socket) {
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

	socket.on('start game', function(packet, callback) {
		let world = worldGen.generateWorld();
		let roomUUID = socket.id + '-game';
		if (socket.room) {
			socket.leave(socket.room);
		}
		gameHandler.startMatch(world, roomUUID);
		socket.join(roomUUID);
		socket.room = roomUUID;
		io.to(socket.id).emit('open world', world.world, world.chunks);
	});
	
	socket.on('get block data', function(packet, callback) {
	  callback(blockData.get());
	});
	
});

// run game clock
var currentTime = Date.now();
setInterval(function() {
	gameHandler.gameClock();

	// send in-game event data to players
	gameHandler.gameEvents().forEach(function(event) {
		if (event.type !== 'volatile') {
			io.in(event.uuid).emit(event.event, event.data);
		} else {
			io.volatile.in(event.uuid).emit(event.event, event.data);
		}
	});

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
