const passableBlocks = ['Oak Log', 'Birch Log'];
const glowingBlocks = ['Glowing Amber', 'Deep Glowing Amber'];
const usefulBlocks = ["Oak Log", "Birch Log"];

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
	
	return blocks;
};

exports.blocks = blockCheck;
