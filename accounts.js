// account access and interaction
const setup = require('./setup');
var io = setup.io();
const db = require('./database').db;

// online player accounts
var players = {};

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

// reference a socket by id
const getSocket = function(id) {
	return io.sockets.connected[id] || {};
};

// uuid generator
function generateUUID() {
	return 'xxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		let string = v.toString(16);
		return string.toUpperCase();
	});
}

// check dictionary for missing keys
const checkPacket = function(input, keys) {
	keys.forEach(function(key) {
		if (input[key] == undefined) {
			return false;
		}
	});
	return true;
};

// socket.io events
const initialize = function() {
	io.on('connection', function(socket) {
		// check if username is taken
		socket.on('check username', function(input, callback) {
			if (socket.secure) {
				let pass = function() {
					if (input.length < 5) {
						return 'Provided username is too short.';
					}
					if (input.length > 30) {
						return 'Provided username is too long.';
					}

					user = db.collection('usernames').doc(input);
					let doc = user.get().then(doc => {
						if (doc.exists) {
						  callback("error", "Username has been taken.")
							return;
						} else {
						  callback("success", "Username is available.")
						}
					});
					return "None";
				};
				let output = pass();
				if (output !== true && output !== "None") {
					callback('error', output);
				}
				if (output !== "None" && output == true) {
					callback('success', 'Username is available.');
				}
			} else {
				callback(
					'error',
					'Invalid session. Please update to the newest version or restart the game.'
				);
			}
		});

		// register
		socket.on('register', function(input, callback) {
			if (socket.secure && isDictionary(input)) {
				let data = JSON.parse(input);
				if (checkPacket(data, ['username', 'password', 'displayName'])) {
					let pass = function() {
						if (data.username.length < 5) {
						  callback("error", "Provided username is too short.");
							return 'Provided username is too short.';
						}
						if (data.username.length > 30) {
						  callback("error", "Provided username is too long.");
							return 'Provided username is too long.';
						}
						if (data.displayName.length < 3) {
						  callback("error", "Provided display name is too short.");
							return 'Provided display name is too short.';
						}
						if (data.displayName.length > 20) {
						  callback("error", "Provided display name is too long.");
							return 'Provided display name is too long.';
						}
						if (data.password.length < 5) {
						  callback("error", "Provided password is too short.");
							return 'Provided password is too short.';
						}
						if (data.password.length > 50) {
						  callback("error", "Provided password is too long. 50 characters max.")
							return 'Provided password is too long. 50 characters max.';
						}

						let user = db.collection('usernames').doc(data.username);
						user.get().then(doc => {
							if (doc.exists) {
								callback('Username is already in use.');
							} else {
								// create user data
								let playerUUID = generateUUID();
								let account = {
									displayName: data.username,
									username: data.username,
									password: data.password,
									creationDate: Date.now() / 1000,
									lastSeen: Date.now() / 1000,
									currency: 100,
									uuid: playerUUID,
									friendRequests: [],
									friends: [],
									statistics: {}
								};
								let userdata = db.collection('users').doc(playerUUID);
								userdata.set(account);
								user.set({ uuid: playerUUID });
								callback('success', 'Account created.');
							}
						});
					};
					pass();
				} else {
					callback(
						'error',
						'Invalid session. Please update to the newest version or restart the game.'
					);
				}
			}
		});

		// login
		socket.on('login', function(input, callback) {
			if (socket.secure && isDictionary(input)) {
				let pass = function() {
					let data = JSON.parse(input);
					let user = db.collection('usernames').doc(data.username);
					user.get().then(doc => {
						if (doc.exists) {
							// get account data
							let uuid = doc.data().uuid;
							user = db.collection('users').doc(uuid);
							let account = {};
							doc = user.get().then(doc => {
								account = doc.data();
								if (account.password == data.password) {
								  if (players[account.uuid] !== undefined && false) {
								    io.to(players[account.uuid]).emit("force disconnect", "Your account was logged in from another location.");
								    getSocket(players[account.uuid]).disconnect();
								  }
								  players[account.uuid] = socket.id; 
									socket.login = true;
									socket.uuid = account.uuid;
									socket.name = account.displayName;
									socket.accountData = account;
									callback("success", account);
									return true;
								} else {
								  callback('error', 'Invalid password or username.');
								  return;
								}
							});
						} else {
						  callback('error', 'Invalid password or username.');
						  return;
						}
					});
				};
				if (checkPacket(JSON.parse(input), ['username', 'password'])) {
					let output = pass();
				} else {
					callback('error', 'Invalid packet sent.');
				}
			} else {
			  callback(
						'error',
						'Invalid session. Please update to the newest version or restart the game.'
					);
			}
		});
		
		// log out
		socket.on('log out', function(input, callback) {
			if (socket.secure && socket.login) {
			  socket.accountData.lastSeen = Date.now() / 1000;
			  user = db.collection('users').doc(socket.uuid);
			  user.set(socket.accountData);
			  delete socket.accountData;
			  delete players[socket.uuid];
			  socket.login = false;
			  socket.uuid = socket.id;
			  socket.name = "Guest";
			}
		});
		
		
		socket.on("change username", function(input, callback) {
		  if (socket.login && input.length >= 5 && input.length <= 30) {
		    let timeDifference = (Date.now() - parseInt(socket.accountData.lastUsernameChange || 0)) / 1000;
		    if (timeDifference <= 24 * 60 * 60) {
		      let hours = 24 - Math.floor(timeDifference / (60 * 60));
		      let s = "";
		      if (hours !== 1) {
		        s = "s";
		      }
		      callback("error", "Please wait for " + hours + " hour" + s + " to change your username again.");
		    } else {
		      user = db.collection('usernames').doc(input);
					let doc = user.get().then(doc => {
						if (doc.exists) {
						  callback("error", "Provided username has been taken. Try another one.")
							return;
						} else {
						  user = db.collection('usernames').doc(socket.accountData.username);
						  user.delete();
						  socket.accountData.lastUsernameChange = Date.now();
						  socket.accountData.username = input;
						  socket.accountData.lastSeen = Date.now() * 1000;
	            user = db.collection('users').doc(socket.uuid);
			        user.set(socket.accountData);
			        user = db.collection('usernames').doc(input);
						  user.set({uuid: socket.uuid});
			        callback("success", "Username has been changed!");
						}
					});
		    }
		  } else {
		    callback("error", "Invalid session. Please restart the game.")
		  }
		});
		
		// update settings
		socket.on("update settings", function(input, callback) {
		  if (socket.login) {
		    socket.accountData.settings = input;
		    callback("success");
		  }
		});
		
		// password change
		socket.on("change password", function(input, callback) {
		  if (socket.login) {
		    let pass = function() {
		      if (input.length < 5) {
		        callback("error", "Provided password is too short.")
		        return;
		      }
		      if (input.length > 50) {
		        callback("error", "Provided password is too long. 50 characters max.")
		        return;
		      }
		      socket.accountData.password = input;
		      user = db.collection('users').doc(socket.uuid);
			    user.set(socket.accountData);
			    callback("success", "Password successfully changed!")
		    }
		    pass();
		  } else {
		    callback("error", "Invalid session. Please restart the game.")
		  }
		});
		
		// backup data when player disconnects
		socket.on("disconnect", function() {
		  if (socket.login) {
		    socket.accountData.lastSeen = Date.now() / 1000;
			  user = db.collection('users').doc(socket.uuid);
			  user.set(socket.accountData);
			  delete players[socket.uuid];
		  }
		});
		
	});
	
	// backup account data every minute
	setInterval(function() {
	  console.log("Backup executed: " + Date.now() / 1000);
	  Object.keys(io.sockets.connected).forEach(function(socketID) {
	    socket = io.sockets.connected[socketID];
	    if (socket.login) {
	      socket.accountData.lastSeen = Date.now() * 1000;
	      user = db.collection('users').doc(socket.uuid);
			  user.set(socket.accountData);
	    }
	  });
	}, 60 * 1000);
	
};

exports.initialize = initialize;
