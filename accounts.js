const hyperPad = require('./jsonsafe');

// account access and interaction
const setup = require('./setup');
var io = setup.io();
const db = require('./database').db;
const missions = require('./missions');

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
							callback('error', 'Username has been taken.');
							return;
						} else {
							callback('success', 'Username is available.');
						}
					});
					return 'None';
				};
				let output = pass();
				if (output !== true && output !== 'None') {
					callback('error', output);
				}
				if (output !== 'None' && output == true) {
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
							callback('error', 'Provided username is too short.');
							return 'Provided username is too short.';
						}
						if (data.username.length > 30) {
							callback('error', 'Provided username is too long.');
							return 'Provided username is too long.';
						}
						if (data.displayName.length < 3) {
							callback('error', 'Provided display name is too short.');
							return 'Provided display name is too short.';
						}
						if (data.displayName.length > 20) {
							callback('error', 'Provided display name is too long.');
							return 'Provided display name is too long.';
						}
						if (data.password.length < 5) {
							callback('error', 'Provided password is too short.');
							return 'Provided password is too short.';
						}
						if (data.password.length > 50) {
							callback(
								'error',
								'Provided password is too long. 50 characters max.'
							);
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

    // world fetch function
    socket.fetchWorlds = function() {
      if (socket.login) {
        if (socket.accountData.worlds) {
          socket.accountdata.worlds = [];
        }
      }
    }

    // world creation
    socket.on('create custom world', function(input, callback) {
      if (socket.login && isDictionary(input)) {
        if (checkPacket(JSON.parse(input), ["name", "description", "settings", "privacy"])) {
          socket.fetchWorlds();
          const pass = function() {
            let parsedPacket = JSON.parse(input);

            if (parsedPacket.name.length > 3) {
              callback("error", "World name is too short.");
              return;
            }
            if (parsedPacket.name.length < 25) {
              callback("error", "World name is too long.");
              return;
            }
            if (socket.accountData.worlds.length < 10) {
              callback("error", "World limit exceeded. You can only have a maximum amount of 10 worlds.");
              return;
            }

            let worldID = socket.accountData.id + "/" + generateUUID()
            let world = {
              worldName: parsedPacket.name,
              description: parsedPacket.description,
              worldSettings: parsedPacket.settings,
              privacy: parsedPacket.privacy,
              opened: false,
              canonicalWorldID: worldID,
              customWorldID: undefined,
              hasCustomWorldID: false
            }
            socket.accountData.worlds.push(world);
            callback("success", world);
            return;
          }
          pass();
        }
      }
    });

    // world fetch
    socket.on('fetch worlds', function(input, callback) {
      if (socket.login && isDictionary(input)) {
        socket.fetchWorlds();
        callback(socket.accountData.worlds);
      }
    });

		// login
		socket.on('login', function(input, callback) {
			if (socket.secure && isDictionary(input) && !socket.login) {
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
								  console.log(players[account.uuid], socket.id);
									if (players[account.uuid] !== undefined) {
										io.to(players[account.uuid]).emit(
											'force disconnect',
											'Your account was logged in from another location.'
										);
										try {
											getSocket(players[account.uuid]).disconnect();
										} catch (e) {}
									}

									players[account.uuid] = socket.id;
									socket.login = true;
									socket.uuid = account.uuid;
									socket.name = account.displayName;
									socket.accountData = account;
									socket.checkDailyMissions();
									callback('success', hyperPad.serialize(account));
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

		// fetch daily missions
		socket.checkDailyMissions = function() {
			let dayLength = 1000 * 60 * 60 * 24;
			let currentDay = Math.floor(Date.now() / dayLength);
			if (socket.accountData.lastLoginDay !== currentDay) {
				socket.accountData.lastLoginDay = currentDay;
				socket.accountData.missions = missions.generate();
				socket.accountData.missionRefresh = (currentDay + 1) * dayLength;
			}
		};
		
		// satisfy mission
		socket.satisfyMissions = function(statistics) {
		  socket.checkDailyMissions();
		  let missions = socket.accountData.missions;
		  Object.keys(statistics).forEach(function(stat) {
		    let amount = statistics[stat];
		    Object.keys(missions).forEach(function(key) {
		      if (missions[key].objective == stat) {
            missions[key].progress = parseFloat(missions[key].progress);
		        missions[key].progress += parseFloat(amount) || 0;
		        if (missions[key].progress >= missions[key].count) {
		          missions[key].claimable = true;
		        }
		      }
		    });
		  })
		}
		
		// fetch missions
		socket.on('fetch missions', function(input, callback) {
		  if (socket.secure && socket.login) {
		    socket.checkDailyMissions();
		    let data = JSON.parse(JSON.stringify(socket.accountData.missions));
		    data.forEach(function(arr) {
		      arr.collected = JSON.stringify(arr.collected);
		      arr.claimable = JSON.stringify(arr.claimable);
		    });
		    callback("success", data);
		  } else {
		    callback("error", "You are not logged in.");
		  }
		});
		
		// collect mission rewards
		socket.on('collect daily mission rewards', function(input, callback) {
		  if (socket.secure && socket.login) {
		    socket.checkDailyMissions();
		    
		    let currencyAdd = 0;
		    socket.accountData.missions.forEach(function(mission) {
		      if (mission.claimable && !mission.collected) {
		        currencyAdd += mission.reward;
		        mission.claimable = false;
		        mission.collected = true;
		      }
		    });
		    if (currencyAdd > 0) {
		      socket.addCurrency(currencyAdd);
		      callback("success", "Reward collected.");
		    } else {
		      callback("error", "No reward to collect.")
		    }
		    
		  } else {
		    callback("error", "You are not logged in.");
		  }
		});
		
		// add currency
		socket.addCurrency = function(amount) {
		  socket.accountData.currency += amount;
		  io.to(socket.id).emit("add currency", hyperPad.serialize({
		    amount,
		    currency: socket.accountData.currency
		  }));
		}

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
				socket.name = 'Guest';
			}
		});

    // username change
		socket.on('change username', function(input, callback) {
			if (socket.login && input.length >= 5 && input.length <= 30) {
				let timeDifference =
					(Date.now() - parseInt(socket.accountData.lastUsernameChange || 0)) /
					1000;
				if (timeDifference <= 24 * 60 * 60) {
					let hours = 24 - Math.floor(timeDifference / (60 * 60));
					let s = '';
					if (hours !== 1) {
						s = 's';
					}
					callback(
						'error',
						'Please wait for ' +
							hours +
							' hour' +
							s +
							' to change your username again.'
					);
				} else {
					user = db.collection('usernames').doc(input);
					let doc = user.get().then(doc => {
						if (doc.exists) {
							callback(
								'error',
								'Provided username has been taken. Try another one.'
							);
							return;
						} else {
							user = db
								.collection('usernames')
								.doc(socket.accountData.username);
							user.delete();
							socket.accountData.lastUsernameChange = Date.now();
							socket.accountData.username = input;
							socket.accountData.lastSeen = Date.now() * 1000;
							user = db.collection('users').doc(socket.uuid);
							user.set(socket.accountData);
							user = db.collection('usernames').doc(input);
							user.set({ uuid: socket.uuid });
							callback('success', 'Username has been changed!');
						}
					});
				}
			} else {
				callback('error', 'Invalid session. Please restart the game.');
			}
		});

		// update settings
		socket.on('update settings', function(input, callback) {
			if (socket.login) {
				socket.accountData.settings = input;
				callback('success');
			}
		});

		// password change
		socket.on('change password', function(input, callback) {
			if (socket.login) {
				let pass = function() {
					if (input.length < 5) {
						callback('error', 'Provided password is too short.');
						return;
					}
					if (input.length > 50) {
						callback(
							'error',
							'Provided password is too long. 50 characters max.'
						);
						return;
					}
					socket.accountData.password = input;
					user = db.collection('users').doc(socket.uuid);
					user.set(socket.accountData);
					callback('success', 'Password successfully changed!');
				};
				pass();
			} else {
				callback('error', 'Invalid session. Please restart the game.');
			}
		});

    // player profile fetch
		socket.on('fetch players', async function(input, callback) {
      profiles = await db.collection("users").get();
      profiles = profiles || {};
      let output = [];
      profiles.forEach(function(id) {
        let account = profiles[id];
        if (players[account.uuid]) {
          let data = JSON.parse(JSON.stringify(account));
          delete data.password;
          delete data.username;
          delete data.missions;
          delete data.friendRequests;
          delete data.friends;
          output.push(data);
        }
      });
      profiles.forEach(function(account) {
        if (!players[account.uuid]) {
          let data = JSON.parse(JSON.stringify(account));
          delete data.password;
          delete data.username;
          delete data.missions;
          delete data.friendRequests;
          delete data.friends;
          output.push(data);
        }
      });
      callback("success", output);
    });

		// backup data when player disconnects
		socket.on('disconnect', function() {
			if (socket.login) {
				socket.accountData.lastSeen = Date.now() / 1000;
				user = db.collection('users').doc(socket.uuid);
				user.set(socket.accountData);
				delete players[socket.uuid];
			}
		});
	});

	// backup account data every 5 minutes
	setInterval(function() {
		console.log('Backup executed: ' + Date.now() / 1000);
		Object.keys(io.sockets.connected).forEach(function(socketID) {
			socket = io.sockets.connected[socketID];
			if (socket.login) {
				socket.accountData.lastSeen = Date.now() * 1000;
				user = db.collection('users').doc(socket.uuid);
				user.set(socket.accountData);
			}
		});
	}, 60 * 1000 * 5);
};

exports.initialize = initialize;
