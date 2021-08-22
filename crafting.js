const recipes = {
  "Oak Planks": {
    yieldItem: "Oak Planks",
    yieldCount: 4,
    recipe: [
      {
        item: "Oak Log",
        count: 1
      }
    ],
    display: "Blocks/Oak Planks",
    description: "Great and easy-to-craft starting building block!"
  },
  "Birch Planks": {
    yieldCount: 4,
    yieldItem: "Birch Planks",
    recipe: [
      {
        item: "Birch Log",
        count: 1
      }
    ],
    display: "Blocks/Birch Planks",
    description: "Great and easy-to-craft starting building block!"
  },
  "Stone Bricks": {
    yieldCount: 1,
    yieldItem: "Stone Bricks",
    recipe: [
      {
        item: "Stone",
        count: 4
      },
      {
        item: 'Basalt',
        count: 1
      }
    ],
    display: "Blocks/Stone Bricks",
    description: "Very durable building block! Resistant to acid rain decay."
  },
  "Golden Apple": {
    count: 1,
    yieldItem: "Golden Apple",
    recipe: [
      {
        item: "Apple",
        count: 1
      },
      {
        item: "Gold",
        count: 5
      }
    ],
    display: "Items/Golden Apple",
    description: "Instantly heals player to maximum health when consumed."
  },
  "Hell Bent Axe": {
    count: 1,
    yieldItem: "Hell Bent Axe",
    recipe: [
      {
        item: "Magma Lamp",
        count: 1
      },
      {
        item: "Battle Axe",
        count: 1
      }
    ],
    display: "Weapons/Hell Bent Axe",
    description: "Deals 15 damage for every hit. Inflicts burning."
  },
  "Diamond Greatsword": {
    count: 1,
    yieldItem: "Diamond Greatsword",
    recipe: [
      {
        item: "Golden Swordfury",
        count: 1
      },
      {
        item: "Diamond",
        count: 10
      }
    ],
    display: "Weapons/Diamond Greatsword",
    description: "Extremely strong melee weapon! Deals 20 damage for every hit."
  },
  "Corrupted Katana": {
    count: 1,
    yieldItem: "Corrupted Katana",
    recipe: [
      {
        item: "Golden Katana",
        count: 1
      },
      {
        item: "Bixbite",
        count: 3
      }
    ],
    display: "Weapons/Corrupted Katana",
    description: "Quickly slice your enemies! Deals 7 damage for every hit. Inflicts poison."
  },
  "Soulblade": {
    count: 1,
    yieldItem: "Soulblade",
    recipe: [
      {
        item: "Guardian's Doomblade",
        count: 1
      },
      {
        item: "Knight's Edge",
        count: 1
      },
      {
        item: "Amber",
        count: 3
      }
    ],
    display: "Weapons/Soulblade",
    description: "Deals 20 damage for every hit. 25% of damage dealt will be given to the player."
  },
}

exports.recipes = function() {
  return recipes;
}