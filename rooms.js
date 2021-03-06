const setup = require('./setup');
const hyperPad = require('./jsonsafe');
io = setup.io();
var rooms = {};
var roomPasswords = {};

// reference a socket by id
const getSocket = function(id) {
	return io.sockets.connected[id] || {};
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
	return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

const initialize = function() {

// socket.io events
io.on('connection', function(socket) {
  
  // fetch rooms
  socket.on("fetch rooms", function(input, callback) {
    let array = [];
    Object.keys(rooms).forEach(function(key) {
      array.push(rooms[key]);
    });
    callback(array);
  });
  
  // create rooms
  socket.on("create room", function(input, callback) {
    
    if (socket.secure && isDictionary(input) && socket.login) {
      
      let pass = function() {
        
        let data = JSON.parse(input);
        if (!checkPacket(data, ["name", "capacity", "metadata"])) {
          callback("error", "Invalid packet sent.");
          return;
        }
        if (socket.inCustomRoom) {
          callback("error", "You are already in a room.");
          return;
        }
        data.name = data.name || "My Room";
        if (data.name.length < 3 || data.name.length > 30) {
          callback("error", "Room name is either too long or too short.");
          return;
        }
        if (parseInt(data.capacity) == NaN) {
          callback("error", "Capacity is not a number.");
          return;
        };
        if (parseInt(data.capacity) < 1 && parseInt(data.capacity) > 50) {
          callback("error", "Capacity is out of range.");
          return;
        }
        if (!isDictionary(data.metadata)) {
          callback("error", "Metadata is not a dictionary.");
          return;
        };
        if (socket.ingame) {
          callback("error", "You must leave the room to create one.");
          return;
        }
        
        let roomID = generateUUID();
        let privacy = "Public";
        if (data.password) {
          privacy = "Private";
          roomPasswords[roomID] = data.password;
        }
        let room = {
          players: 1,
          capacity: parseInt(data.capacity),
          meta: JSON.parse(data.metadata),
          privacy: privacy,
          id: roomID,
          creationDate: Date.now(),
          roomName: data.name,
          host: socket.name,
          takenNames: {},
          playerList: {},
          state: "Ready"
        };
        room.takenNames[socket.name] = socket.id;
        room.playerList[socket.name] = {uuid: socket.uuid, avatar: socket.accountData.avatar || {}};
        rooms[roomID] = room;
        socket.join(roomID);
        socket.room = roomID;
        socket.customRoom = roomID;
        socket.inCustomRoom = true;
        socket.host = true;
        let output = JSON.parse(JSON.stringify(room));
        output.playerList = JSON.stringify(room.playerList);
        output.takenNames = JSON.stringify(room.takenNames);
        output.meta = JSON.stringify(room.meta);
        callback("success", output)
        
      }
      pass();
      
    } else {
      callback("error", "You cannot create a room.");
    }
    
  });
  
  // leave a custom created room 
  socket.leaveRoom = function() {
    if (socket.secure && socket.inCustomRoom && rooms[socket.customRoom]) {
      socket.leave(socket.room);
      socket.inCustomRoom = false;
      socket.creative = false;
      rooms[socket.customRoom].players--;
      io.to(socket.customRoom).emit("Room Disconnect", socket.name);
      delete rooms[socket.customRoom].takenNames[socket.name];
      delete rooms[socket.customRoom].playerList[socket.name];
      if (rooms[socket.customRoom].players == 0) {
        delete rooms[socket.customRoom];
      } else if (socket.host) {
        let newHost = Object.keys(rooms[socket.customRoom].takenNames)[0];
        getSocket(newHost).host = true;
        io.to(newHost).emit("Nominated Host", "You are now the host of the room.");
      }
      socket.host = false;
    }
  }
  
  // send chat message in room 
  socket.on("send message", function(input, callback) {
    if (socket.secure && socket.inCustomRoom) {
      io.to(socket.room).emit("room chat message", socket.name, input);
    }
  });
  
  // join custom created room
  socket.on("join room", function(input, callback) {
    if (socket.secure && !socket.inCustomRoom && !socket.ingame && isDictionary(input)) {
      let data = JSON.parse(input);
      if (rooms[data.id] !== undefined) {
        
        let pass = function() {
          
          // check state
          if (rooms[data.id].state !== "Ready") {
            callback("error", "Room is not open for new players.")
            return;
          }
          
          // check privacy
          if (rooms[data.id].privacy == "Private" && roomPasswords[data.id] !== data.password) {
            callback("error", "Provided password is not correct.");
            return;
          }
          
          // check capacity
          if (rooms[data.id].players >= rooms[data.id].capacity) {
            callback("error", "Room is full.");
            return;
          }
          
          // check taken name
          if (rooms[data.id].takenNames[socket.name]) {
            callback("error", "Display name has been taken.");
            return;
          }
          
          // join room
          io.to(data.id).emit("Player Join", {uuid: socket.uuid, name: socket.name});
          socket.join(data.id);
          socket.room = data.id;
          socket.customRoom = data.id;
          socket.inCustomRoom = true;
          rooms[data.id].players++;
          rooms[data.id].takenNames[socket.name] = socket.id;
          rooms[data.id].playerList[socket.name] = {uuid: socket.uuid, avatar: socket.accountData || {}.avatar || {}};
          
          callback("success", hyperPad.serialize(rooms[data.id]));
          
        }
        pass();
        
      } else {
        callback("error", "Room does not exist.");
      }
    } else {
      callback("error", "You cannot join a room.");
    }
  });
  
  socket.on("initiate match", function(input, callback) {
    if (socket.secure && socket.host) {
      let roomData = rooms[socket.room] || {};
      if (roomData.state == "Ready") {
        io.to(socket.room).emit("room start");
        roomData.state = "Playing";
        let disableBots = false;
        let capacity = roomData.capacity;
        if (!roomData.meta.autofillBot) {
          disableBots = true;
          capacity = roomData.players;
        }
        roomData.meta.customRoom = true;
        let matchmakingPacket = {
          capacity,
          mode: roomData.id,
          disableBots,
          customRoom: true,
          meta: roomData.meta,
          map: "Custom"
        }
        matchmakingPacket = JSON.stringify(matchmakingPacket);
        Object.keys(roomData.takenNames).forEach(function(name) {
          if (getSocket(roomData.takenNames[name]).uuid) {
            getSocket(roomData.takenNames[name]).matchmake(matchmakingPacket);
            if (roomData.meta.creative) {
              getSocket(roomData.takenNames[name]).creative = true;
            }
          }
        });
        callback("success", "Game is starting!");
      } else {
        callback("error", "Matchmaking has already started.")
      }
    } else {
      callback("error", "You are not the host of this room.")
    }
  });
  
  socket.on("leave room", function() {
    socket.leaveRoom();
  });
  socket.on("disconnect", function() {
    socket.leaveRoom();
  });
  
});

}

exports.initialize = initialize;