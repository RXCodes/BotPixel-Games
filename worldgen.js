const defaultWorldSettings = {
	worldSize: 75,
	avgHeight: 75,
	sineCount: 20,
	minSineFrequency: 0.1,
	maxSineFrequency: 0.7,
	minSineMultiplier: 0.5,
	maxSineMultiplier: 25,
	caveCount: 8,
	caveSizeRange: 5,
	caveMinSize: 2,
	maxCaveLevel: 50,
	dirtBallCount: 18,
	dirtBallSizeRange: 5,
	dirtBallMinSize: 5,
	maxDirtBallLevel: 60,
	deepLayerLevel: 40,
	minTreeGap: 4,
	treeGapRange: 6,
	treeHeightRange: 4,
	minTreeHeight: 3,
	minCaveLength: 10,
	caveLengthRange: 45,
	woodCrateGapMin: 5,
	woodCrateGapRange: 6,
	dungeonCount: 10,
	dungeonSpawnLayer: 30
};

const blockDataScope = require("./blocks");
var blocksJSON = {};

const distance = function(x, y, x2, y2) {
	xDelta = (x2 - x) * (x2 - x);
	yDelta = (y2 - y) * (y2 - y);
	return Math.sqrt(xDelta + yDelta);
};

var generateWorld = function(chunkSize = 5, worldSettings = defaultWorldSettings) {
	// initialize
	blocksJSON = blockDataScope.blocks();
	let settings = worldSettings;
	let sine = [];
	let grassLayer = [];
	let world = {};
	let worldBlockData = {};
	let initialTime = Date.now();
	let collisions = {};
	let blocksDestroyed = 0;
	let blocksPlaced = 0;
	let chunks = {};
	let lightBlocks = {};
	let interests = {};

  // useful functions
  const getBlock = function(x, y) {
    return world[x + "," + y];
  }

	// populate sine
	for (i = 0; i < settings.sineCount; i++) {
		sine.push({
			frequency:
				Math.random() *
					(settings.maxSineFrequency - settings.minSineFrequency) +
				settings.minSineFrequency,
			multiplier:
				Math.random() *
					(settings.maxSineMultiplier - settings.minSineMultiplier) +
				settings.minSineMultiplier,
			index: 0
		});
	}

	// create grass layer
	for (i = 0; i < settings.worldSize * 2 + 1; i++) {
		let yPosition = 0;
		sine.forEach(function(object) {
			object.index += object.frequency;
			yPosition += Math.sin(object.index) * object.multiplier;
		});
		grassLayer.push(Math.round(yPosition / sine.length + settings.avgHeight));
	}

	// initialize block events
	let chunkPosition = function(x, y, placeMode) {
		let chunkX = Math.round(x / chunkSize);
		let chunkY = Math.round(y / chunkSize);
		if (placeMode && chunks[chunkX + ',' + chunkY] == undefined) {
			chunks[chunkX + ',' + chunkY] = {};
		}
		return chunkX + ',' + chunkY;
	};

	let placeBlock = function(x, y, id, blockData) {
		let position = parseInt(x) + ',' + parseInt(y);
		world[position] = id;
		worldBlockData[position] = blockData;
		let chunkX = Math.round(x / chunkSize) * chunkSize - 2;
		let chunkY = Math.round(y / chunkSize) * chunkSize - 2;
		chunks[chunkPosition(x, y, true)][x - chunkX + ',' + (y - chunkY)] = id;
		blocksPlaced++;
	  delete lightBlocks[position];
	  delete collisions[position];
	  delete interests[position];
	  if ((blocksJSON[id] || {}).glowing !== undefined) {
	    lightBlocks[position] = id;
	  }
	  if ((blocksJSON[id] || {}).passable == undefined) {
	    collisions[position] = true;
	  }
	  if ((blocksJSON[id] || {}).useful !== undefined) {
	    interests[position] = id;
	  }
	};

	let destroyBlock = function(x, y) {
		let position = parseInt(x) + ',' + parseInt(y);
		if (world[position] !== undefined && world[position] !== 'Bedrock') {
		  delete lightBlocks[position];
		  delete collisions[position];
			delete world[position];
			delete worldBlockData[position];
			let chunkX = Math.round(x / chunkSize) * chunkSize - 2;
			let chunkY = Math.round(y / chunkSize) * chunkSize - 2;
			delete chunks[chunkPosition(x, y, true)][x - chunkX + ',' + (y - chunkY)];
			blocksDestroyed++;
		}
	};

	var clearRadius = function(x, y, diameter) {
		let range = Math.floor(diameter / 2);
		x = Math.round(x);
		y = Math.round(y);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (distance(xPos, yPos, x, y) < diameter / 2) {
					if (yPos > 5) {
						let position = parseInt(xPos) + ',' + parseInt(yPos);
						destroyBlock(xPos, yPos);
					}
				}
			}
		}
	};

	var setRadius = function(x, y, diameter, block) {
		let range = Math.floor(diameter / 2);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (distance(xPos, yPos, x, y) < diameter / 2) {
					let position = parseInt(xPos) + ',' + parseInt(yPos);
					if (world[position] !== undefined && world[position] !== 'Bedrock') {
						placeBlock(xPos, yPos, block);
					}
				}
			}
		}
	};

	var scatterRadius = function(x, y, diameter, block, chance) {
		let range = Math.floor(diameter / 2);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (distance(xPos, yPos, x, y) < diameter / 2) {
					let position = parseInt(xPos) + ',' + parseInt(yPos);
					if (world[position] !== undefined && world[position] !== 'Bedrock') {
						if (Math.random() < chance) {
							placeBlock(xPos, yPos, block);
						}
					}
				}
			}
		}
	};

	var fillArea = function(x, y, x2, y2, block) {
		minX = Math.min(x, x2);
		minY = Math.min(y, y2);
		maxX = Math.max(x, x2);
		maxY = Math.max(y, y2);
		for (xPos = minX; xPos <= maxX; xPos++) {
			for (yPos = minY; yPos <= maxY; yPos++) {
				placeBlock(xPos, yPos, block);
			}
		}
	};
	
	var clearArea = function(x, y, x2, y2) {
		minX = Math.min(x, x2);
		minY = Math.min(y, y2);
		maxX = Math.max(x, x2);
		maxY = Math.max(y, y2);
		for (xPos = minX; xPos <= maxX; xPos++) {
			for (yPos = minY; yPos <= maxY; yPos++) {
				destroyBlock(xPos, yPos);
			}
		}
	};

	// depth function
	var depthCalculate = function(yPos, depth) {
		if (depth == 1) {
			return 'Grass';
		}
		if (depth > 1 && depth < 4 + Math.random() * 4) {
			return 'Dirt';
		}
		if (y > Math.random() * 5 + 2 && depth < 6) {
			return 'Dirty Stone';
		}

		if (Math.random() < 0.01 && y > settings.deepLayerLevel) {
			let fossilChoices = ['Fossil', 'Fossil 2', 'Body Fossil', 'Rib Fossil'];
			let index = Math.round(Math.random() * (fossilChoices.length - 1));
			return fossilChoices[index];
		} else if (Math.random() < 0.01 && y < settings.deepLayerLevel && y > 6) {
			let fossilChoices = [
				'Deep Fossil',
				'Deep Body Fossil',
				'Deep Rib Fossil'
			];
			let index = Math.round(Math.random() * (fossilChoices.length - 1));
			return fossilChoices[index];
		} else if (Math.random() < 0.005 && y <= 5) {
			let fossilChoices = [
				'Bedrock Fossil',
				'Bedrock Body Fossil',
				'Bedrock Rib Fossil'
			];
			let index = Math.round(Math.random() * (fossilChoices.length - 1));
			return fossilChoices[index];
		}

		if (Math.random() < 0.0025 && y > settings.deepLayerLevel) {
			return 'Glowing Amber';
		}

		if (Math.random() < 0.002 && y < settings.deepLayerLevel && y > 6) {
			return 'Deep Glowing Amber';
		}

		if (Math.random() < 0.0025 && y > settings.deepLayerLevel) {
			return 'Gold Ore';
		}

		if (Math.random() < 0.002 && y < settings.deepLayerLevel && y > 6) {
			return 'Deep Gold Ore';
		}

		if (Math.random() < 0.01 && y > 6) {
			let normalOreChoices = ['Coal Ore', 'Iron Ore', 'Bronze Ore'];
			let rareOreChoices = ['Ruby Ore', 'Tanzanite Ore'];
		}

		if (Math.random() < 0.001 && y < settings.deepLayerLevel && y > 6) {
			return 'Deep Bixbite Ore';
		}

		if (y > Math.random() * 5 + settings.deepLayerLevel) {
			return 'Stone';
		}

		if (y > Math.random() * 7 + 3) {
			return 'Basalt';
		}

		return 'Bedrock';
	};

	// generate layers
	for (x = 0; x < grassLayer.length; x++) {
		let depth = 0;
		let xPosition = x - settings.worldSize;
		for (y = grassLayer[x]; y >= 0; y--) {
			depth++;
			placeBlock(xPosition, y, depthCalculate(y, depth), {});
		}
	}

	// make rocky circles
	for (i = 0; i < settings.dirtBallCount; i++) {
		let x = Math.round(Math.random() * settings.worldSize * 2);
		x -= Math.floor(settings.worldSize);
		let y = Math.round(Math.random() * settings.maxDirtBallLevel);
		let size =
			Math.random() * settings.dirtBallSizeRange + settings.dirtBallMinSize;
		if (y > settings.deepLayerLevel) {
			if (Math.random() < 0.3) {
				setRadius(x, y, size, 'Gravel');
			} else {
				setRadius(x, y, size, 'Dirt');
			}
		} else {
				setRadius(x, y, size, 'Kimberlite');
				scatterRadius(x, y, size, 'Diamond Ore', 0.2);
		}
	}

	// generate trees
	let buildTree = function(x, y) {
		let build = function(height, block) {
			for (i = 0; i < height; i++) {
				placeBlock(x, y + 1 + i, block + ' Log');
			}
			fillArea(x - 2, y + height + 1, x + 2, y + height + 3, block + ' Leaves');
			fillArea(x - 1, y + height + 4, x + 1, y + height + 4, block + ' Leaves');
		};

		let height = Math.round(
			Math.random() * settings.treeHeightRange + settings.minTreeHeight
		);
		let treeTypes = ['Oak', 'Birch'];
		let logIndex = Math.round(Math.random() * (treeTypes.length - 1));
		build(height, treeTypes[logIndex]);
	};

	// place trees
	let iterate = true;
	let treeIndex = 0;
	let treePos = [];
	while (iterate == true) {
		treeIndex += parseInt(
			Math.round(Math.random() * settings.treeGapRange) + settings.minTreeGap
		);
		buildTree(treeIndex - settings.worldSize, grassLayer[treeIndex]);
		treePos.push([treeIndex - settings.worldSize, grassLayer[treeIndex]]);
		if (treeIndex + settings.minTreeGap > settings.worldSize * 2) {
			iterate = false;
		}
	}

	// cave generation
	let generateCave = function(x, y, radius) {
		let caveX = x;
		let caveY = y;
		let caveRadius = radius;
		let targetCaveRadius =
			Math.random() * settings.caveSizeRange + settings.caveMinSize;
		let angle = Math.random() * 360;
		let targetAngle = Math.random() * 360;
		let caveLength =
			Math.random() * settings.caveLengthRange + settings.minCaveLength;
		let xVelocity = Math.sin(angle);
		let yVelocity = Math.cos(angle);
		let targetXVelocity = Math.sin(targetAngle);
		let targetYVelocity = Math.cos(targetAngle);

		while (caveLength > 0) {
			caveLength--;
			clearRadius(caveX, caveY, caveRadius);

			// clear cave path
			caveX += xVelocity * 2.15;
			caveY += yVelocity * 1.2;
			xVelocity += (targetXVelocity - xVelocity) / 6;
			yVelocity += (targetYVelocity - yVelocity) / 6;
			if (Math.round((targetXVelocity - xVelocity) * 10) == 0) {
				if (Math.round((targetYVelocity - yVelocity) * 10) == 0) {
					targetAngle = Math.random() * 360;
					targetXVelocity = Math.sin(targetAngle);
					targetYVelocity = Math.cos(targetAngle);
				}
			}

			// vary in size throughout path
			caveRadius += (targetCaveRadius - caveRadius) / 7.5;
			if (Math.round((targetCaveRadius - caveRadius) * 10)) {
				targetCaveRadius =
					Math.random() * settings.caveSizeRange + settings.caveMinSize;
			}

			// prevent cave from reaching surface
			if (caveY > settings.avgHeight) {
				break;
			}
		}
	};

	// cave placement
	for (i = 0; i < settings.caveCount; i++) {
		let x = Math.round(Math.random() * settings.worldSize * 2);
		x -= Math.floor(settings.worldSize);
		let y = Math.round(Math.random() * settings.maxCaveLevel);
		let radius = Math.random() * settings.caveSizeRange + settings.caveMinSize;
		generateCave(x, y, radius);
	}
	generateCave(0, 30, 8);

	// place rooted dirt under trees
	treePos.forEach(function(position) {
		let left = world[position[0] - 1 + ',' + position[1]] !== undefined;
		let right = world[position[0] + 1 + ',' + position[1]] !== undefined;
		if (left == true && right == true) {
			placeBlock(position[0], position[1], 'Rooted Grass');
		}
		if (!left && !right) {
			placeBlock(position[0], position[1], 'Rooted Dirt');
		}
		if (!left && right) {
			placeBlock(position[0], position[1], 'Rooted Grass Right');
		}
		if (left && !right) {
			placeBlock(position[0], position[1], 'Rooted Grass Left');
		}
	});

	// change grass layer sprites
	let currentXPos = settings.worldSize * -1;
	grassLayer.forEach(function(position) {
		if (
			world[currentXPos + ',' + (position + 1)] == undefined ||
			world[currentXPos + ',' + position] == undefined
		) {
			let leftPos = currentXPos - 1 + ',' + position;
			let rightPos = currentXPos + 1 + ',' + position;
			let left = world[leftPos] !== undefined;
			let right = world[rightPos] !== undefined;
			if (!left && right == true) {
				placeBlock(currentXPos, position, 'Grass Left');
			}
			if (left == true && !right) {
				placeBlock(currentXPos, position, 'Grass Right');
			}
			if (!left && !right) {
				placeBlock(currentXPos, position, 'Standalone Grass');
			}
		}
		currentXPos++;
	});
	
	// scatter wood crates at surface
	currentXPos = settings.worldSize * -1;
	let grassLayerIndex = 0;
	while (currentXPos < settings.worldSize) {
	  let gap = Math.round(settings.woodCrateGapMin + (Math.random() * settings.woodCrateGapRange));
	  currentXPos += gap;
	  if (getBlock(currentXPos, grassLayer[grassLayerIndex] + 1) == undefined) {
	    placeBlock(currentXPos, grassLayer[grassLayerIndex] + 1, "Wood Crate");
	  }
	  grassLayerIndex++;
	}
	
	// scatter dungeons underground
	let crateLocations = [];
	const spawnDungeon = function(x, y) {
	  
	  // check if other crates already occupy its area
	  let check = true;
	  crateLocations.forEach(function(position) {
	    let xDiff = Math.abs(position[0] - x);
	    let yDiff = Math.abs(position[1] - y);
	    if (xDiff < 8 && yDiff < 8) {
	      check = false;
	    }
	  })
	  if (!check) {
	    return false;
	  }
	  
	  // spawn crate
	  crateLocations.push([x, y]);
	  fillArea(x - 3, y - 3, x + 3, y + 3, "Stone Bricks");
	  clearArea(x - 2, y - 2, x + 2, y + 2);
	  if (y > settings.deepLayerLevel) {
	    placeBlock(x, y - 2, "Iron Crate");
	  } else {
	    placeBlock(x, y - 2, "Gold Crate");
	  }
	  return true;
	  
	}
	let dungeonCount = 0;
	let maxIteration = 100;
	while (dungeonCount < settings.dungeonCount) {
	  let x = Math.round((Math.random() - 0.5) * 2 * settings.worldSize);
	  let y = Math.round(Math.random() * (settings.avgHeight - 10 - settings.dungeonSpawnLayer)) + 10;
	  if (spawnDungeon(x, y)) {
	    dungeonCount++;
	  }
	  maxIteration--;
	  if (maxIteration <= 0) {
	    dungeonCount = settings.dungeonCount;
	    return;
	  }
	}

	// return data
	return {
		world,
		blockData: worldBlockData,
		lightBlocks,
		generationTime: Date.now() - initialTime + 'ms',
		blocksDestroyed,
		blocksPlaced,
		collisions,
		chunks,
		interests
	};
};

exports.generateWorld = generateWorld;
