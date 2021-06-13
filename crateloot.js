const crateCapacity = 10;

const lootTable = {
  "Oak Planks": {"rarity": 1, "rarityRange": 2, "minCount": 4, "maxCount": 20, "includes": ["Sticks"]},
  "Oak Log": {"rarity": 1.5, "rarityRange": 1.5, "minCount": 5, "maxCount": 9, "includes": ["Sticks"]},
  "Sticks": {"rarity": 1, "rarityRange": 2, "minCount": 1, "maxCount": 6}
}

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
  indexes.shuffle();
  let targetIndexes = [];
  for (i = 0; i < count; i++) {
    targetIndexes.push(indexes[i]);
  }
  
  // populate indexes with items
  let loot = {};
  
  // return data
  return loot;
  
}

exports.generateLoot = generateLoot;