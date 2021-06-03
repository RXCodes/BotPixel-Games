const passableBlocks = ['Oak Log', 'Birch Log'];
const glowingBlocks = ['Glowing Amber', 'Deep Glowing Amber'];
const usefulBlocks = ['Oak Log', 'Birch Log'];
const blockBreakingTime = {
	Bedrock: 9999,
	'Bedrock Body Fossil': 9999,
	'Bedrock Fossil': 9999,
	'Bedrock Rip Fossil': 9999,
	Basalt: 2,
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
	Kimberlite: 1.5,
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
	'Tilled Rooted Grass Right': 0.5
};

var blocks = {};

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
	});

	// set glowing property
	glowingBlocks.forEach(function(block) {
		check(block);
		blocks[block].glowing = true;
	});

	// set useful blocks
	usefulBlocks.forEach(function(block) {
		check(block);
		blocks[block].useful = true;
	});

	// set breaking time property
	Object.keys(blockBreakingTime).forEach(function(block) {
	  check(block);
	  blocks[block].breakDuration = blockBreakingTime[block];
	});

	return blocks;
};

exports.blocks = blockCheck;
