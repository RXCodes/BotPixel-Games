function shuffle(array) {
	var currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex]
		];
	}

	return array;
}

const missions = {
  kills: {
    possibleCounts: [5, 10, 15],
    currencyRate: 20,
    text: "Eliminate {count} enemies",
    objective: "kills",
    type: "count"
  },
  survival: {
    possibleCounts: [5, 10],
    currencyRate: 15,
    text: "Survive for {count} minutes in matches",
    objective: "survivalTimeMinutes",
    type: "count"
  },
  damage: {
    possibleCounts: [250, 500, 750, 1000],
    currencyRate: 0.5,
    text: "Deal {count} damage to enemies",
    objective: "damage",
    type: "count"
  },
  heal: {
    possibleCounts: [50, 75, 100, 200],
    currencyRate: 1,
    text: "Regenerate {count} HP",
    objective: "heal",
    type: "count"
  },
  mine: {
    possibleCounts: [50, 100, 125],
    currencyRate: 2,
    text: "Destroy {count} blocks",
    objective: "blocksDestroyed",
    type: "count"
  },
  build: {
    possibleCounts: [50, 100, 150],
    currencyRate: 1,
    text: "Place {count} blocks",
    objective: "blocksPlaced",
    type: "count"
  },
  outlive: {
    possibleCounts: [5, 10, 15],
    currencyRate: 5,
    text: "Outlive {count} players",
    objective: "outlived",
    type: "count"
  },
  matches: {
    possibleCounts: [3, 5, 10],
    currencyRate: 15,
    text: "Play {count} matches",
    objective: "matches",
    type: "count"
  },
  wins: {
    possibleCounts: [1, 3, 5],
    currencyRate: 50,
    text: "Win {count} matches",
    objective: "wins",
    type: "count"
  },
  explosion: {
    possibleCounts: [1],
    currencyRate: 150,
    text: "Eliminate 1 enemy using an explosion",
    objective: "explodedEnemies",
    type: "count"
  }
}

const generateMissions = function() {
  let missionCount = 3;
  let missionsAvailable = shuffle(Object.keys(missions));
  let output = [];
  for (i = 0; i < missionCount; i++) {
    
    // select mission
    let missionName = missionsAvailable[i];
    let missionData = missions[missionName];
    
    // set goals
    let count = shuffle(missionData.possibleCounts)[0];
    let reward = count * missionData.currencyRate;
    let mission = {
      text: missionData.text,
      count,
      reward,
      progress: 0,
      objective: missionData.objective
    }
    
    // add mission
    output.push(mission);
    
  }
  return output;
}

exports.generate = generateMissions;