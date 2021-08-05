const gameHandler = require('./game');
const requireSolidTopSupport = [
	'Big Stalagtite',
	'Big Stalagtite 2',
	'Big Blooming Stalagtite',
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
const requireSolidGroundSupport = [
	'Limestone Rock',
	'Limestone Rock 2',
	'Limestone Rock 3',
	'Red Mushroom',
	'Brown Mushroom',
	'Brown Mushroom Patch',
	'Tall Grass',
	'Short Grass'
];

const blockUpdate = function(x, y, world, worldUUID) {
	let block = world[x + ',' + y];

	// block does not exist
	if (block == undefined) {
		return world;
	}

	const placeBlock = function(x, y, block) {
		world[x + ',' + y] = block;
	};

	// grass block
	if (
		block == 'Grass' ||
		block == 'Grass Left' ||
		block == 'Grass Right' ||
		block == 'Standalone Grass'
	) {
		let leftPos = x - 1 + ',' + y;
		let rightPos = x + 1 + ',' + y;
		let left = world[leftPos] !== undefined;
		let right = world[rightPos] !== undefined;
		placeBlock(x, y, 'Grass');
		if (!left && right == true) {
			placeBlock(x, y, 'Grass Left');
		}
		if (left == true && !right) {
			placeBlock(x, y, 'Grass Right');
		}
		if (!left && !right) {
			placeBlock(x, y, 'Standalone Grass');
		}
	}

	// root block
	if (
		block == 'Rooted Grass' ||
		block == 'Rooted Dirt' ||
		block == 'Rooted Grass Right' ||
		block == 'Rooted Grass Left'
	) {
		let leftPos = x - 1 + ',' + y;
		let rightPos = x + 1 + ',' + y;
		let left = world[leftPos] !== undefined;
		let right = world[rightPos] !== undefined;
		if (left == true && right == true) {
			placeBlock(x, y, 'Rooted Grass');
		}
		if (!left && !right) {
			placeBlock(x, y, 'Rooted Dirt');
		}
		if (!left && right) {
			placeBlock(x, y, 'Rooted Grass Right');
		}
		if (left && !right) {
			placeBlock(x, y, 'Rooted Grass Left');
		}
	}

	// block requiring top support
	if (true) {
		let index = 0;
		while (
			requireSolidTopSupport.includes(world[x + ',' + Math.round(y - index)])
		) {
			if (!world[x + ',' + Math.round(y - index + 1)]) {
				gameHandler.destroyBlock(worldUUID, x, Math.round(y - index), "Block Update");
			}
			index++;
		}
	}

	// block requiring bottom support
	if (true) {
		let index = 0;
		while (
			requireSolidGroundSupport.includes(world[x + ',' + Math.round(y + index)])
		) {
			if (!world[x + ',' + Math.round(y + index - 1)]) {
				gameHandler.destroyBlock(worldUUID, x, Math.round(y + index), "Block Update");
			}
			index++;
		}
	}

	return world;
};

const targetBlockUpdate = function(x, y, world, worldUUID) {
	world = blockUpdate(x - 1, y, world, worldUUID);
	world = blockUpdate(x + 1, y, world, worldUUID);
	world = blockUpdate(x, y - 1, world, worldUUID);
	world = blockUpdate(x, y + 1, world, worldUUID);
	return world;
};

exports.update = targetBlockUpdate;
