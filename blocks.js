const passableBlocks = ['Oak Log', 'Birch Log', "Wood Crate", "Iron Crate", "Gold Crate"];
const glowingBlocks = ['Glowing Amber', 'Deep Glowing Amber'];
const usefulBlocks = ['Oak Log', 'Birch Log', 'Wood Crate', 'Iron Crate', 'Gold Crate', 'Gold Ore', 'Diamond Ore', 'Deep Gold Ore', 'Deep Glowing Amber', 'Glowing Amber', 'Deep Bixbite Ore', 'Bixbite Ore'];
const interestPriority = {
  'Oak Log': 4,
  'Birch Log': 4,
  'Wood Crate': 5,
  'Iron Crate': 6,
  'Gold Crate': 8,
  'Diamond Ore': 7,
  'Gold Ore': 7,
  'Deep Gold Ore': 7,
  'Deep Glowing Amber': 6,
  'Glowing Amber': 6,
  'Deep Bixbite Ore': 9,
  'Bixbite Ore': 9
}
const blockBreakingTime = {
	Bedrock: 9999,
	'Bedrock Body Fossil': 9999,
	'Bedrock Fossil': 9999,
	'Bedrock Rib Fossil': 9999,
	Basalt: 1.4,
	'Birch Leaves': 0.3,
	'Birch Log': 0.7,
	'Birch Planks': 0.5,
	'Body Fossil': 1.1,
	'Deep Bixbite Ore': 2,
	'Deep Body Fossil': 2,
	'Deep Fossil': 2,
	'Deep Glowing Amber': 1.7,
	'Deep Gold Ore': 2,
	'Deep Rib Fossil': 2,
	'Diamond Ore': 2.2,
	Dirt: 0.3,
	'Dirty Stone': 0.4,
	Fossil: 1,
	'Fossil 2': 1,
	'Glowing Amber': 0.8,
	'Gold Ore': 1.3,
	Grass: 0.4,
	'Grass Left': 0.4,
	'Grass Right': 0.4,
	Gravel: 0.5,
	Kimberlite: 1.3,
	'Oak Leaves': 0.3,
	'Oak Log': 0.7,
	'Oak Planks': 0.5,
	'Rib Fossil': 1,
	'Rooted Dirt': 0.5,
	'Rooted Grass': 0.5,
	'Rooted Grass Left': 0.5,
	'Rooted Grass Right': 0.5,
	'Standalone Grass': 0.4,
	Stone: 0.6,
	'Tilled Rooted Dirt': 0.5,
	'Tilled Rooted Grass': 0.5,
	'Tilled Rooted Grass Left': 0.5,
	'Tilled Rooted Grass Right': 0.5,
	'Wood Crate': 2,
	'Iron Crate': 2.5,
	'Gold Crate': 3,
	'Stone Bricks': 2.8
};

const blockBreakSoundFX = {
	Bedrock: 'Bedrock',
	'Bedrock Body Fossil': 'Bedrock Fossil',
	'Bedrock Fossil': 'Bedrock Fossil',
	'Bedrock Rib Fossil': 'Bedrock Fossil',
	Basalt: 'Basalt',
	'Birch Leaves': 'Leaves',
	'Birch Log': 'Wood',
	'Birch Planks': 'Wood',
	'Body Fossil': 'Stone Fossil',
	'Deep Bixbite Ore': 'Diamond',
	'Deep Body Fossil': 'Deep Fossil',
	'Deep Fossil': 'Deep Fossil',
	'Deep Glowing Amber': 'Deep Amber',
	'Deep Gold Ore': 'Deep Ore',
	'Deep Rib Fossil': 'Deep Fossil',
	'Diamond Ore': 'Diamond',
	Dirt: 'Dirt',
	'Dirty Stone': 'Stone',
	Fossil: 'Stone Fossil',
	'Fossil 2': 'Stone Fossil',
	'Glowing Amber': 'Amber',
	'Gold Ore': 'Ore',
	Grass: 'Grass',
	'Grass Left': 'Grass',
	'Grass Right': 'Grass',
	Gravel: 'Dirt',
	Kimberlite: 'Kimberlite',
	'Oak Leaves': 'Leaves',
	'Oak Log': 'Wood',
	'Oak Planks': 'Wood',
	'Rib Fossil': 'Stone Fossil',
	'Rooted Dirt': 'Dirt',
	'Rooted Grass': 'Grass',
	'Rooted Grass Left': 'Grass',
	'Rooted Grass Right': 'Grass',
	'Standalone Grass': 'Grass',
	Stone: 'Stone',
	'Tilled Rooted Dirt': 'Dirt',
	'Tilled Rooted Grass': 'Grass',
	'Tilled Rooted Grass Left': 'Grass',
	'Tilled Rooted Grass Right': 'Grass',
	'Wood Crate': 'Wood',
	'Iron Crate': 'Stone Fossil',
	'Gold Crate': 'Amber',
	'Stone Bricks': 'Stone Fossil'
};
const lootTable = {
	Basalt: 'Basalt',
	'Birch Log': 'Birch Log',
	'Birch Planks': 'Birch Planks',
	'Body Fossil': 'Stone',
	'Deep Bixbite Ore': 'Bixbite',
	'Deep Body Fossil': 'Basalt',
	'Deep Fossil': 'Basalt',
	'Deep Glowing Amber': 'Amber',
	'Deep Gold Ore': 'Gold',
	'Deep Rib Fossil': 'Basalt',
	'Diamond Ore': 'Diamond',
	Dirt: 'Dirt',
	'Dirty Stone': 'Stone',
	Fossil: 'Stone',
	'Fossil 2': 'Stone',
	'Glowing Amber': 'Amber',
	'Gold Ore': 'Gold',
	Grass: 'Dirt',
	'Grass Left': 'Dirt',
	'Grass Right': 'Dirt',
	Gravel: 'Gravel',
	Kimberlite: 'Kimberlite',
	'Oak Log': 'Oak Log',
	'Oak Planks': 'Oak Planks',
	'Rib Fossil': 'Stone',
	'Rooted Dirt': 'Dirt',
	'Rooted Grass': 'Dirt',
	'Rooted Grass Left': 'Dirt',
	'Rooted Grass Right': 'Dirt',
	'Standalone Grass': 'Dirt',
	Stone: 'Stone',
	'Tilled Rooted Dirt': 'Dirt',
	'Tilled Rooted Grass': 'Dirt',
	'Tilled Rooted Grass Left': 'Dirt',
	'Tilled Rooted Grass Right': 'Dirt',
	'Stone Bricks': 'Stone Bricks'
};

var blocks = {};
var hyperPadPassable = {};

const blockCheck = function() {
	const check = function(block) {
		if (blocks[block] == undefined) {
			blocks[block] = {};
		}
	};

	// set passable property
	passableBlocks.forEach(function(block) {
		check(block);
		blocks[block].passable = true;
		hyperPadPassable[block] = 1;
	});

	// set glowing property
	glowingBlocks.forEach(function(block) {
		check(block);
		blocks[block].glowing = true;
	});

	// set useful blocks & priority
	Object.keys(interestPriority).forEach(function(block) {
		check(block);
		blocks[block].useful = true;
		blocks[block].priority = interestPriority[block];
	});

	// set breaking time property
	Object.keys(blockBreakingTime).forEach(function(block) {
		check(block);
		blocks[block].breakDuration = blockBreakingTime[block];
	});

	// set break sound fx property
	Object.keys(blockBreakSoundFX).forEach(function(block) {
		check(block);
		blocks[block].breakSound = blockBreakSoundFX[block];
	});
	
	// set break sound fx property
	Object.keys(lootTable).forEach(function(block) {
		check(block);
		blocks[block].drops = lootTable[block];
	});

	return blocks;
};

const getBlockData = function() {
  blockCheck();
	let data = JSON.stringify({
		breakingSoundFX: JSON.stringify(blockBreakSoundFX),
		blockBreakingTime: JSON.stringify(blockBreakingTime),
		passableBlocks: JSON.stringify(hyperPadPassable),
		glowingBlocks: JSON.stringify(glowingBlocks),
		lootTable: JSON.stringify(lootTable)
	});
	return data;
};

exports.blocks = blockCheck;
exports.get = getBlockData;