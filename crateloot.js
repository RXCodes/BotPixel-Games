const crateCapacity = 10;
const blockDataScope = require('./blocks');
blocksJSON = {};
const setupBlocks = function() {
	blocksJSON = blockDataScope.blocks();
};

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

const lootTable = {
	'Oak Planks': {
		rarity: 3,
		rarityRange: 2.5,
		minCount: 4,
		maxCount: 20,
		includes: { name: 'Sticks', chance: 0.95 }
	},
	'Oak Log': {
		rarity: 1.5,
		rarityRange: 1.5,
		minCount: 5,
		maxCount: 9,
		includes: { name: 'Sticks', chance: 0.75 }
	},
	'Birch Planks': {
		rarity: 3,
		rarityRange: 2.5,
		minCount: 4,
		maxCount: 20,
		includes: { name: 'Sticks', chance: 0.95 }
	},
	'Birch Log': {
		rarity: 1.5,
		rarityRange: 1.5,
		minCount: 5,
		maxCount: 9,
		includes: { name: 'Sticks', chance: 0.75 }
	},
	Apple: {
		rarity: 3,
		rarityRange: 1.5,
		minCount: 1,
		maxCount: 3,
		includes: { name: 'Golden Apple', chance: 0.1 }
	},
	'Golden Apple': {
		rarity: 100,
		rarityRange: 1,
		minCount: 1,
		maxCount: 1
	},
	String: { rarity: 2, rarityRange: 3, minCount: 1, maxCount: 6 },
	Sticks: { rarity: 3, rarityRange: 3, minCount: 1, maxCount: 6 },
	TNT: { rarity: 8, rarityRange: 6, minCount: 1, maxCount: 10 },
	Bixbite: {
		rarity: 9,
		rarityRange: 2,
		minCount: 1,
		maxCount: 3
	},
	Diamond: {
		rarity: 10,
		rarityRange: 2.5,
		minCount: 1,
		maxCount: 5
	},
	Gold: {
		rarity: 7.5,
		rarityRange: 2,
		minCount: 2,
		maxCount: 7
	}
};

const pickItem = function(rarity) {
	// get items that can spawn in this rarity range
	let items = [];
	Object.keys(lootTable).forEach(function(item) {
		let object = lootTable[item];
		object.name = item;
		if (rarity > object.rarity - (object.rarityRange / 2)) {
			if (rarity < object.rarity + (object.rarityRange / 2)) {
				items.push(lootTable[item]);
			}
		}
	});

	// randomly select an item to put
	let index = Math.round(Math.random() * (items.length - 1));
	if (items[index]) {
		let count = Math.round(
			items[index].minCount +
				Math.random() * (items[index].maxCount - items[index].minCount)
		);
		items[index] = items[index] || {};
		items[index].count = count;
		return items[index];
	}
	return {};
};

const generateLoot = function(rarity) {
	// rarity value range
	rarity = Math.max(rarity, 1);
	rarity = Math.min(rarity, 10);

	// generate indexes for crate
	let indexes = [];
	for (i = 0; i < crateCapacity; i++) {
		indexes.push(i);
	}

	// determine number of items
	let count = 3 + Math.round(rarity / 3) + Math.round(Math.random() * 2);

	// pick indexes to be filled with items
	indexes = shuffle(indexes);
	let targetIndexes = [];
	for (i = 0; i < count; i++) {
		targetIndexes.push(indexes[i]);
	}

	// populate indexes with items
	let loot = {};
	let includeItem = false;
	targetIndexes.forEach(function(index) {
		if (!includeItem) {
			let item = pickItem(rarity);
			if (item.name) {
				loot[index] = {
					name: item.name,
					count: item.count
				};
				if (item.includes) {
					includeItem = lootTable[item.includes.name];
				}
			}
		} else {
			if (Math.random() < includeItem.chance) {
				loot[index] = {
					name: includeItem.name,
					count: includeItem.count
				};
			} else {
				let item = pickItem(rarity);
				if (item.name) {
					loot[index] = {
						name: item.name,
						count: item.count
					};
					if (item.includes) {
						includeItem = lootTable[item.includes.name];
					}
				}
			}
			includeItem = false;
		}
	});

	// return data
	Object.keys(loot).forEach(function(item) {
		// check if item is a block
		if (blocksJSON[loot[item].name] !== undefined) {
			loot[item].type = 'Blocks/';
		} else {
			loot[item].type = 'Items/';
		}
	});
	return loot;
};

exports.generateLoot = generateLoot;
exports.setup = setupBlocks;
