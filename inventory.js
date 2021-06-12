const maxSlotCount = 7;
const maxItemCount = 99;
const blockDataScope = require('./blocks');
blocksJSON = {};

// store new item(s) to a given inventory
const storeItem = function(inventory, item, count) {
  
	// stack item to existing slots with item
	let index = 0;
	inventory.forEach(function(object) {
		if (object.name == item && object.count < maxItemCount) {
			if (object.count + count <= maxItemCount) {
				object.count += count;
				count = 0;
			} else {
				if (count > 0) {
				  let difference = maxItemCount - object.count;
					object.count = maxItemCount;
					count -= difference;
				}
			}
		}
		inventory[index] = object;
		index++;
	});
	
	// check if all items were picked up
	if (count == 0) {
	  return {
	    inventory,
	    success: true,
	    leftOver: 0
	  };
	}
	
	// for remaining items, append to inventory if possible
	let success = false;
	while (inventory.length < maxSlotCount && count > 0) {
	  let slotData = {name: item};
	  if (count <= maxItemCount) {
	    success = true;
	    slotData.count = count;
	    count = 0;
	  } else {
	    if (count > 0) {
	      success = true;
	      slotData.count = maxItemCount;
	      count -= maxItemCount;
	    }
	  }
	  inventory.push(slotData);
	}
	
	// return success if any items were picked up at this point
	if (success) {
	  return {
	    inventory,
	    success: true,
	    leftOver: count
	  }
	}
	
	// if no items were picked up at all, return an error
	return {
	  inventory,
	  success: false,
	  leftOver: count
	}
	
};

// check how many blocks are in the inventory
const checkForBlocks = function(inventory) {
  blocksJSON = blockDataScope.blocks();
  let totalBlocks = 0;
  let totalSolidBlocks = 0;
  let solidBlockSlots = [];
  let index = 0;
  inventory.forEach(function(object) {
    
    // check if it is a block
    if (blocksJSON[object.name] !== undefined) {
      totalBlocks++;
      
      // check if the block is solid
      if (blocksJSON[object.name].passable !== undefined) {
        totalSolidBlocks++;
        solidBlockSlots.push(index);
      }
    }
    
    index++;
  });
  
  return {
    totalBlocks,
    totalSolidBlocks,
    solidBlockSlots
  }
};

// remove a slot from the inventory
const deleteSlot = function(inventory, slot) {
  
  // check if slot contains anything
  if (inventory[slot] !== undefined) {
    inventory.splice(slot, 1);
  }
  
  return inventory;
  
}

// swap slots
const swapSlots = function(inventory, slotA, slotB) {
  
  // check it both slots contain items
  if (inventory[slotA] == undefined || inventory[slotB] == undefined) {
    return inventory;
  }
  
  // swap and return inventory
  let x = inventory[slotA];
  inventory[slotA] = inventory[slotB];
  inventory[slotB] = x;
  return inventory;
}

const remove = function(inventory, slotID, count = 1) {
  
  // check if slot exists
  if (inventory[slotID] == undefined) {
    return {inventory, drop: false}
  }
  
  // remove single item from stack from slot
  inventory[slotID].count -= count;
  
  // remove slot if count reaches 0
  if (inventory[slotID].count <= 0) {
    inventory.splice(slotID, 1);
    return {inventory, drop: true};
  }
  
  return {inventory, drop: false};
  
}

exports.give = storeItem;
exports.getBlocks = checkForBlocks;
exports.clear = deleteSlot;
exports.swap = swapSlots;
exports.remove = remove;