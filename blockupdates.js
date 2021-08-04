const blockUpdate = function(x, y, world) {
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
		if (world[x + "," + Math.round(y + 1)]) {
		  placeBlock(x, y, 'Dirt');
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
	
	return world;
};

const targetBlockUpdate = function(x, y, world) {
	world = blockUpdate(x - 1, y, world);
	world = blockUpdate(x + 1, y, world);
	world = blockUpdate(x, y - 1, world);
	world = blockUpdate(x, y + 1, world);
	return world;
};

exports.update = targetBlockUpdate;
