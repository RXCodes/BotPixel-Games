// -- This is where the leaderboards are managed! -- \\

// initialize variables
var leaderboard = {};

// function: set a player's score in the leaderboard
var setScore = function (leaderboardName, playerUUID, score) {
  
  // check for undefined inputs
  if (score == undefined || playerUUID == undefined || leaderboardName == undefined || (playerUUID || {}).length < 10) {
    return "Error: One or more of the necessary inputs are undefined.";
  }
  
  // parse score to be an integer
  score = parseInt(score);
  
  // check if leaderboard exists -- create leaderboard if not
  if (leaderboard[leaderboardName] == undefined) {
    leaderboard[leaderboardName] = {};
  }
  
  // data structure of a single player
  let Player = {
      uuid: playerUUID,
      score: score
    };
  
  if (leaderboard[leaderboardName][playerUUID] == undefined) {
    
    // set the score if the player does not exist in the leaderboard yet
    leaderboard[leaderboardName][playerUUID] = Player;
    return true;
    
  } else {

    // otherwise, check if provided score is greater than or equal to the player's leaderboard score
    if (score >= leaderboard[leaderboardName][playerUUID].score) {
    
      // update player data structure if so -- this will update the score and other properties in the player data structure
      leaderboard[leaderboardName][playerUUID] = Player;
      return true;

    } else {
      return "Score has not changed. Provided score is not greater than or equal to current score."
    }
  }
}

// function: remove a player's score from the leaderboard
var removeScore = function(leaderboardName, playerUUID) {
  if (leaderboard[leaderboardName] !== undefined) {
    if (leaderboard[leaderboardName][playerUUID] !== undefined) {
      
      // remove the player from the leaderboard and return true
      delete leaderboard[leaderboardName][playerUUID];
      return true;
    } else {
      
      // otherwise return false if the player does not exist
      return false;
    
    }
  }
}

// function: sort leaderboard || convert to readable JSON for hyperPad
var sortLeaderboard = function(leaderboardName) {
  
  // return blank array if leaderboard does not exist.
  if (leaderboard[leaderboardName] == undefined) {
    return "[]";
  }
  
  // intialize local variables
  let scoresArray = []
  let scoresToName = {};
  let timesArray = [];
  let timesToName = {};
  let output = [];
  
  // iterate through all players and parse JSON
  Object.keys(leaderboard[leaderboardName]).forEach(function(key) {
    scoresArray.push(leaderboard[leaderboardName][key].score);
    if (scoresToName[leaderboard[leaderboardName][key].score] == undefined) {
      scoresToName[leaderboard[leaderboardName][key].score] = [];
    }
    scoresToName[leaderboard[leaderboardName][key].score].push(leaderboard[leaderboardName][key]);
  });
  
  // sort scores in descending fashion || highest scores first
  scoresArray.sort((a, b) => b - a);
  
  // sort player by score
  for (i = 0; i < scoresArray.length; i++) {
    let score = scoresArray[i];
    let store = scoresToName[score];
    for (x = 0; x < store.length; x++) {
      output.push(JSON.stringify(store[x]));
    }
  } 
  
  // return leaderboard data
  return JSON.stringify(output);
}

// function: combine all scores into accumulative
var globalScores = function() {
  leaderboard["global"] = {};
  Object.keys(leaderboard).forEach(function(key) {
    if (key !== "global") {
      Object.keys(leaderboard[key]).forEach(function(player) {
        let playerOBJ = leaderboard[key][player];
        if (playerOBJ.uuid !== undefined) {
          let currentScore = 0;
          if (leaderboard["global"][player] !== undefined) {
            currentScore = leaderboard["global"][player].score;
            currentScore += leaderboard[key][player].score;
          } else {
            currentScore = leaderboard[key][player].score;
          }    
          setScore("global", playerOBJ.uuid, currentScore);
        }
      });
    }
  });
  return (sortLeaderboard("global"));
}

// function: delete a leaderboard
var deleteLeaderboard = function(leaderboardName) {
  if (leaderboard[leaderboardName] !== undefined) {
    leaderboard[leaderboard] = {};
    delete leaderboard[leaderboardName];
    return true;
  } else {
    return "Error: Leaderboard does not exist or has already been deleted."
  }
}

// allow other scripts to use these functions
exports.setScore = setScore;
exports.removeScore = removeScore;
exports.sortLeaderboard = sortLeaderboard;
exports.globalScores = globalScores;
exports.deleteLeaderboard = deleteLeaderboard;