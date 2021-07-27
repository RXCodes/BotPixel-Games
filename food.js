const foodItems = {
  Apple: {
    heal: 15,
    eatDuration: 2
  },
  "Golden Apple": {
    heal: 100,
    eatDuration: 3
  },
  Croissant: {
    heal: 15,
    eatDuration: 1.5
  },
  Sandwich: {
    heal: 35,
    eatDuration: 3
  }
}

exports.foodJSON = function() {
  return foodItems;
}