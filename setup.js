// DO NOT MODIFY! This sets up the socket.io server.
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const app = express();
const httpserver = http.Server(app);
const io = socketio(httpserver);

const gamedirectory = path.join(__dirname, 'html');

app.use(express.static(gamedirectory));

httpserver.listen(3000);

const getIO = function() {
	return io;
};

exports.io = getIO;
