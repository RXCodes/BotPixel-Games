const crateCapacity = 10;

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