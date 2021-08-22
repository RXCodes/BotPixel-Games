const defaultWorldSettings = {
	worldSize: 75,
	avgHeight: 75,
	sineCount: 20,
	minSineFrequency: 0.1,
	maxSineFrequency: 0.7,
	minSineMultiplier: 0.5,
	maxSineMultiplier: 25,
	caveCount: 8,
	caveSizeRange: 3,
	caveMinSize: 3,
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
	caveLengthRange: 50,
	woodCrateGapMin: 5,
	woodCrateGapRange: 5,
	dungeonCount: 5,
	dungeonSpawnLayer: 10,
	caveTypes: ['Limestone', "Overgrowth"],
	caveBiomeChance: 0.8,
	minStalagtiteLength: 2,
	stalagtiteLengthRange: 4,
	extendedStalagtiteChance: 0.4,
	limestoneRockFormationChance: 0.35,
	limestoneCaveClayFloorIntegrity: 0.25,
	limestoneCaveCrateChance: 0.2,
	mushroomSpawnRate: 0.3,
	vegetationSpawnRate: 0.4,
	undergroundVegetationSpawnRate: 0.55
};

const blockDataScope = require('./blocks');
const crates = require('./crateloot');
var blocksJSON = {};
const defaultSettings = function() {
  return defaultWorldSettings;
}
exports.defaultWorldSettings = defaultSettings;
const distance = function(x, y, x2, y2) {
	xDelta = (x2 - x) * (x2 - x);
	yDelta = (y2 - y) * (y2 - y);
	return Math.sqrt(xDelta + yDelta);
};
const proximity = function(xDelta, yDelta, distance) {
	let d = xDelta ** 2 + yDelta ** 2;
	if (d <= distance ** 2) {
		return true;
	}
	return false;
};

// generate world function
var generateWorld = async function(
	chunkSize = 5,
	worldSettings = defaultWorldSettings
) {

  return new Promise((resolve) => {

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
	let crateLoot = {};
	let blockCost = {};

	// useful functions
	const getBlock = function(x, y) {
		return world[x + ',' + y];
	};

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
	var chunkPosition = function(x, y, placeMode) {
		let chunkX = Math.round(x / chunkSize);
		let chunkY = Math.round(y / chunkSize);
		if (placeMode && chunks[chunkX + ',' + chunkY] == undefined) {
			chunks[chunkX + ',' + chunkY] = {};
		}
		return chunkX + ',' + chunkY;
	};

	var placeBlock = function(x, y, id, blockData = {}) {
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
		delete blockCost[position];
		if ((blocksJSON[id] || {}).glowing !== undefined) {
			lightBlocks[position] = id;
		}
		if ((blocksJSON[id] || {}).passable == undefined) {
			collisions[position] = true;
			blockCost[chunkPosition] = (blocksJSON[id] || {}).breakDuration;
		}
		if ((blocksJSON[id] || {}).useful !== undefined) {
			interests[position] = id;
		}
	};

	var destroyBlock = function(x, y) {
		let position = parseInt(x) + ',' + parseInt(y);
		if (world[position] !== undefined && world[position] !== 'Bedrock') {
			delete lightBlocks[position];
			delete collisions[position];
			delete world[position];
			delete worldBlockData[position];
			delete blockCost[position];
			let chunkX = Math.round(x / chunkSize) * chunkSize - 2;
			let chunkY = Math.round(y / chunkSize) * chunkSize - 2;
			delete chunks[chunkPosition(x, y, true)][x - chunkX + ',' + (y - chunkY)];
			blocksDestroyed++;
		}
	};

	var fillCrate = function(x, y, contents) {
		crateLoot[x + ',' + y] = contents;
	};

	var clearRadius = function(x, y, diameter) {
		let range = Math.floor(diameter / 2);
		x = Math.round(x);
		y = Math.round(y);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (proximity(xPos - x, yPos - y, diameter / 2)) {
					if (yPos > 5) {
						let position = parseInt(xPos) + ',' + parseInt(yPos);
						destroyBlock(xPos, yPos);
					}
				}
			}
		}
	};

	var setRadius = function(x, y, diameter, block, replaceBlock = 'All') {
		x = Math.round(x);
		y = Math.round(y);
		let range = Math.floor(diameter / 2);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (proximity(xPos - x, yPos - y, diameter / 2)) {
					let position = parseInt(xPos) + ',' + parseInt(yPos);
					if (world[position] !== undefined && world[position] !== 'Bedrock') {
						if (replaceBlock == 'All' || replaceBlock == world[position]) {
							placeBlock(xPos, yPos, block);
						}
						if (replaceBlock == 'Solid' && world[position]) {
							placeBlock(xPos, yPos, block);
						}
					}
				}
			}
		}
	};

	var scatterRadius = function(
		x,
		y,
		diameter,
		block,
		chance,
		replaceBlock = 'All'
	) {
		x = Math.round(x);
		y = Math.round(y);
		let range = Math.floor(diameter / 2);
		for (xPos = x - range; xPos < x + range; xPos++) {
			for (yPos = y - range; yPos < y + range; yPos++) {
				if (proximity(xPos - x, yPos - y, diameter / 2)) {
					let position = parseInt(xPos) + ',' + parseInt(yPos);
					if (world[position] !== undefined && world[position] !== 'Bedrock') {
						if (Math.random() < chance) {
							if (replaceBlock == 'All' || replaceBlock == world[position]) {
								placeBlock(xPos, yPos, block);
							}
							if (replaceBlock == 'Solid' && world[position]) {
								placeBlock(xPos, yPos, block);
							}
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
		let caveTypeIndex = Math.round(
			Math.random() * settings.caveTypes.length - 1
		);
		let caveType = 'None';
		if (Math.random() < settings.caveBiomeChance) {
			caveType = settings.caveTypes[caveTypeIndex];
		}
		let stalagmitePos = {};

		while (caveLength > 0) {
			caveLength--;
			clearRadius(caveX, caveY, caveRadius);

			// clear cave path
			caveX += xVelocity * 2.25;
			caveY += yVelocity * 0.9;
			xVelocity += (targetXVelocity - xVelocity) / 6;
			yVelocity += (targetYVelocity - yVelocity) / 6;
			if (Math.round((targetXVelocity - xVelocity) * 10) == 0) {
				if (Math.round((targetYVelocity - yVelocity) * 10) == 0) {
					targetAngle = Math.random() * 360;
					targetXVelocity = Math.sin(targetAngle);
					targetYVelocity = Math.cos(targetAngle);
				}
			}

			// limestone cave
			if (Math.random() < 0.8 && caveType == 'Limestone') {
				scatterRadius(
					caveX,
					caveY,
					caveRadius + 6.5 + Math.random(),
					'Limestone',
					0.5,
					'Solid'
				);
				scatterRadius(
					caveX,
					caveY,
					caveRadius + 6 + Math.random(),
					'Limestone Quartz Ore',
					0.1,
					'Solid'
				);
			}

			// overgrown cave
			if (caveType == 'Overgrown') {
				if (Math.random() < 0.3) {
					scatterRadius(
						caveX,
						caveY,
						caveRadius + 6.5 + Math.random(),
						'Dirt',
						0.25,
						'Solid'
					);
				}
				setRadius(caveX, caveY - caveRadius, caveRadius / 2.2, 'Dirt', 'Solid');
			}
			
			// clay cave
			if (caveType == 'Clay') {
				if (Math.random() < 0.3) {
					scatterRadius(
						caveX,
						caveY,
						caveRadius + 6.5 + Math.random(),
						'Clay',
						0.75,
						'Solid'
					);
				}
			}
			
			// determine position to spawn ceiling and ground objects 
			let stalX = Math.round((Math.random() - 0.5) * caveRadius + caveX);
			let stalPos = stalX + ',' + Math.ceil(caveY);
			stalagmitePos[stalPos] = { x: stalX, y: Math.ceil(caveY) };

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

		// after clearing path
		let iteratedX = {};

		// limestone caves
		if (caveType == 'Limestone') {
			Object.keys(stalagmitePos).forEach(function(stal) {
				let x = stalagmitePos[stal].x;
				let y = stalagmitePos[stal].y;
				if (iteratedX[x] == undefined) {
				  iteratedX[x] = true;
				  
					// find ceiling
					let ceiling = false;
					let ceilPos = undefined;
					for (i = 1; i <= 10; i++) {
						if (world[x + ',' + Math.round(y + i)]) {
							ceilPos = Math.round(y + i - 1);
							ceiling = true;
							break;
						}
					}

					// find floor
					let floor = false;
					let floorPos = undefined;
					for (i = 1; i <= 10; i++) {
						if (world[x + ',' + Math.round(y - i)]) {
							floorPos = Math.round(y - i + 1);
							floor = true;
							break;
						}
					}

					// place stalagtites
					if (ceiling && !world[x + "," + ceilPos]) {
						if (Math.random() > settings.extendedStalagtiteChance) {
							let stalagtites = [
								'Big Stalagtite',
								'Big Stalagtite',
								'Medium Stalagtite',
								'Medium Stalagtite 2',
								'Medium Stalagtite 3',
								'Small Stalagtite',
								'Small Stalagtite 2',
								'Small Stalagtite 3',
								'Small Stalagtite 4',
								'Small Stalagtite 5',
								'Small Stalagtite 6',
								'Small Stalagtite 7'
							];
							let index = Math.round(Math.random() * (stalagtites.length - 1));
							placeBlock(x, ceilPos, stalagtites[index]);
						} else {
							let stalagtiteLength =
								settings.minStalagtiteLength +
								Math.round(Math.random() * settings.stalagtiteLengthRange);
							let finalYPos = 0;
							for (i = 0; i < stalagtiteLength - 1; i++) {
								if (!world[x + ',' + ceilPos - i]) {
									if (Math.random() < 0.15) {
										placeBlock(x, ceilPos - i, 'Big Blooming Stalagtite');
									} else {
										placeBlock(x, ceilPos - i, 'Big Stalagtite 2');
									}
									finalYPos = ceilPos - i;
								} else {
									break;
								}
							}
							placeBlock(x, finalYPos, 'Big Stalagtite');
						}
					}
					
					// place limestone rocks and clay floor
					if (Math.random() < settings.limestoneRockFormationChance && floor && !world[x + "," + floorPos]) {
					  let limestoneRocks = ["Limestone Rock", "Limestone Rock 2", "Limestone Rock 3"];
					  let index = Math.round(Math.random() * (limestoneRocks.length - 1));
					  placeBlock(x, floorPos, limestoneRocks[index]);
					}
					if (Math.random() < settings.mushroomSpawnRate && floor && !world[x + "," + floorPos]) {
					  let mushrooms = ["Brown Mushroom", "Brown Mushroom Patch"];
					  let index = Math.round(Math.random() * (mushrooms.length - 1));
					  placeBlock(x, floorPos, mushrooms[index]);
					}
					if (Math.random() < settings.limestoneCaveCrateChance && floor && !world[x + "," + floorPos]) {
					  if (Math.random() < 0.75) {
					    placeBlock(x, floorPos, "Iron Crate");
					    let loot = crates.generateLoot(4 + Math.round(Math.random() * 4));
					    fillCrate(x, floorPos, loot)
					  } else {
					    placeBlock(x, floorPos + 1, "Gold Crate");
					    placeBlock(x, floorPos, "Limestone Table");
					    let loot = crates.generateLoot(8 + Math.round(Math.random() * 4));
					    fillCrate(x, floorPos + 1, loot)
					  }
					}
				  if (Math.random() < settings.limestoneCaveClayFloorIntegrity) {
					  setRadius(x, floorPos - 1, "Clay", 3.5, "Solid");
					}
				}
			});
		}
		
		// overgrown cave
		if (caveType == 'Overgrown') {
			Object.keys(stalagmitePos).forEach(function(stal) {
				let x = stalagmitePos[stal].x;
				let y = stalagmitePos[stal].y;
				if (iteratedX[x] == undefined) {
				  iteratedX[x] = true;
				  
					// find ceiling
					let ceiling = false;
					let ceilPos = undefined;
					for (i = 1; i <= 10; i++) {
						if (world[x + ',' + Math.round(y + i)]) {
							ceilPos = Math.round(y + i - 1);
							ceiling = true;
							break;
						}
					}

					// find floor
					let floor = false;
					let floorPos = undefined;
					for (i = 1; i <= 10; i++) {
						if (world[x + ',' + Math.round(y - i)]) {
							floorPos = Math.round(y - i + 1);
							floor = true;
							break;
						}
					}

					// place stalagtites
					if (ceiling && !world[x + "," + ceilPos]) {
						if (Math.random() > settings.extendedStalagtiteChance) {
							let stalagtites = [
								'Big Stalagtite',
								'Big Stalagtite',
								'Medium Stalagtite',
								'Medium Stalagtite 2',
								'Medium Stalagtite 3',
								'Small Stalagtite',
								'Small Stalagtite 2',
								'Small Stalagtite 3',
								'Small Stalagtite 4',
								'Small Stalagtite 5',
								'Small Stalagtite 6',
								'Small Stalagtite 7'
							];
							let index = Math.round(Math.random() * (stalagtites.length - 1));
							placeBlock(x, ceilPos, stalagtites[index]);
						} else {
							let stalagtiteLength =
								settings.minStalagtiteLength +
								Math.round(Math.random() * settings.stalagtiteLengthRange);
							let finalYPos = 0;
							for (i = 0; i < stalagtiteLength - 1; i++) {
								if (!world[x + ',' + ceilPos - i]) {
									if (Math.random() < 0.15) {
										placeBlock(x, ceilPos - i, 'Big Blooming Stalagtite');
									} else {
										placeBlock(x, ceilPos - i, 'Big Stalagtite 2');
									}
									finalYPos = ceilPos - i;
								} else {
									break;
								}
							}
							placeBlock(x, finalYPos, 'Big Stalagtite');
						}
					}
					
					// place limestone rocks and grass floor
					if (floor) {
					  placeBlock(x, floorPos - 1, "Grass");
					}
					if (Math.random() < settings.limestoneRockFormationChance && floor && !world[x + "," + floorPos]) {
					  let limestoneRocks = ["Limestone Rock", "Limestone Rock 2", "Limestone Rock 3"];
					  let index = Math.round(Math.random() * (limestoneRocks.length - 1));
					  placeBlock(x, floorPos, limestoneRocks[index]);
					}
					if (Math.random() < settings.mushroomSpawnRate && floor && !world[x + "," + floorPos]) {
					  let mushrooms = ["Brown Mushroom", "Brown Mushroom Patch", "Red Mushroom"];
					  let index = Math.round(Math.random() * (mushrooms.length - 1));
					  placeBlock(x, floorPos, mushrooms[index]);
					}
					if (Math.random() < settings.vegetationSpawnRate && floor && !world[x + "," + floorPos]) {
					  let vegetation = ["Brown Mushroom", "Red Mushroom", "Tall Grass", "Short Grass"];
					  let index = Math.round(Math.random() * (vegetation.length - 1));
					  placeBlock(x, floorPos, vegetation[index]);
					}
					if (Math.random() < settings.limestoneCaveCrateChance && floor && !world[x + "," + floorPos]) {
					  if (Math.random() < 0.75) {
					    placeBlock(x, floorPos, "Iron Crate");
					    let loot = crates.generateLoot(4 + Math.round(Math.random() * 4));
					    fillCrate(x, floorPos + 1, loot)
					  } else {
					    placeBlock(x, floorPos + 2, "Gold Crate");
					    placeBlock(x, floorPos + 1, "Limestone Table");
					    let loot = crates.generateLoot(8 + Math.round(Math.random() * 4));
					    fillCrate(x, floorPos + 2, loot)
					  }
					}
				  if (Math.random() < settings.limestoneCaveClayFloorIntegrity && floor) {
					  setRadius(x, floorPos - 1, 3, "Clay", "Solid");
					}
				}
			});
		}
	};

	// cave placement
	for (i = 0; i < settings.caveCount; i++) {
		let x = Math.round((Math.random() - 0.5) * settings.worldSize);
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
	iterate = true;
	let woodCrateIndex = 0;
	const placeWoodCrate = function(x, y) {
		if (getBlock(x, y) == undefined) {
			placeBlock(x, y, 'Wood Crate');
			loot = crates.generateLoot(Math.round(Math.random() * 4));
			fillCrate(x, y, loot);
		}
	};
	while (iterate == true) {
		woodCrateIndex += parseInt(
			Math.round(Math.random() * settings.woodCrateGapRange) +
				settings.woodCrateGapMin
		);
		placeWoodCrate(
			woodCrateIndex - settings.worldSize,
			grassLayer[woodCrateIndex] + 1
		);
		if (woodCrateIndex + settings.woodCrateGapMin > settings.worldSize * 2) {
			iterate = false;
		}
	}
	
	// spawn surface vegetation
	iterate = true;
	let grassLayerIndex = 0;
	let vegetation = ["Brown Mushroom", "Tall Grass", "Red Mushroom", "Short Grass", "Tall Grass", "Short Grass"];
	while (iterate == true) {
		grassLayerIndex++;
		index = Math.round(Math.random() * (vegetation.length - 1));
		if (Math.random() < settings.vegetationSpawnRate) {
		  if (!world[Math.round(grassLayerIndex - settings.worldSize) + "," +
		    Math.round(grassLayer[grassLayerIndex] + 1)]) {
		      placeBlock(
		        grassLayerIndex - settings.worldSize,
		        grassLayer[grassLayerIndex] + 1,
		      vegetation[index]
		      );
		    }
		}
		if (grassLayerIndex > settings.worldSize * 2) {
			iterate = false;
		}
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
		});
		if (!check) {
			return false;
		}

		// spawn crate
		crateLocations.push([x, y]);
		fillArea(x - 3, y - 3, x + 3, y + 3, 'Stone Bricks');
		clearArea(x - 2, y - 2, x + 2, y + 2);
		if (y > settings.deepLayerLevel) {
			placeBlock(x, y - 2, 'Iron Crate');
			let loot = crates.generateLoot(3 + Math.round(Math.random() * 4));
			fillCrate(x, y - 2, loot);
		} else {
			placeBlock(x, y - 2, 'Gold Crate');
			let loot = crates.generateLoot(7 + Math.round(Math.random() * 3));
			fillCrate(x, y - 2, loot);
		}
		return true;
	};
	let dungeonCount = 0;
	let maxIteration = 100;
	while (dungeonCount < settings.dungeonCount) {
		let x = Math.round((Math.random() - 0.5) * 2 * settings.worldSize);
		let y =
			Math.round(
				Math.random() * (settings.avgHeight - 10 - settings.dungeonSpawnLayer)
			) + 10;
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
	resolve({
		world,
		blockData: worldBlockData,
		lightBlocks,
		generationTime: Date.now() - initialTime + 'ms',
		blocksDestroyed,
		blocksPlaced,
		collisions,
		chunks,
		interests,
		crateLoot,
		blockCost
	});
  })
};

exports.generateWorld = generateWorld;
