const recipes = {
  "Oak Planks": {
    yieldCount: 4,
    recipe: [
      {
        item: "Oak Log",
        count: 1
      }
    ]
  },
  "Birch Planks": {
    yieldCount: 4,
    recipe: [
      {
        item: "Birch Log",
        count: 1
      }
    ]
  },
  "Golden Apple": {
    count: 1,
    recipe: [
      {
        item: "Apple",
        count: 1
      },
      {
        item: "Gold",
        count: 5
      }
    ]
  }
}

exports.recipes = function() {
  return recipes;
}