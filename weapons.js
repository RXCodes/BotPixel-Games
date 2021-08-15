const weapons = {
  "Warrior's Sword": {
    type: "Melee",
    attackSpeed: 0.4,
    damage: 10,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "1",
    swingSound: "slow"
  },
  "Battle Axe": {
    type: "Melee",
    attackSpeed: 0.25,
    damage: 12,
    range: 2.75,
    xBound: 2.75,
    yBound: 2.95,
    xOffset: 0.5,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "1",
    swingSound: "medium"
  },
  "Golden Swordfury": {
    type: "Melee",
    attackSpeed: 0.3,
    damage: 20,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "2",
    swingSound: "medium",
    particles: "Yellow"
  },
  "Corrupted Katana": {
    type: "Melee",
    attackSpeed: 0.175,
    damage: 7,
    range: 2.5,
    xBound: 3,
    yBound: 2.95,
    xOffset: 0.4,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 125,
    drawSound: "4",
    swingSound: "fast",
    particles: "Corrupt",
    inflicts: [
      {
        effect: "Poison",
        duration: 10,
        chance: 0.5
      }
    ]
  },
  "Cutlass": {
    type: "Melee",
    attackSpeed: 0.15,
    damage: 6,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "1",
    swingSound: "fast"
  },
  "Diamond Greatsword": {
    type: "Melee",
    attackSpeed: 0.35,
    damage: 30,
    range: 2.5,
    xBound: 3,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "5",
    swingSound: "slow",
    particles: "Blue"
  },
  "Flamefury": {
    type: "Melee",
    attackSpeed: 0.25,
    damage: 15,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "5",
    swingSound: "slow",
    particles: "Flame",
    inflicts: [
      {
        effect: "Burning",
        duration: 10,
        chance: 0.5
      }
    ]
  },
  "Golden Katana": {
    type: "Melee",
    attackSpeed: 0.15,
    damage: 8,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "2",
    swingSound: "fast"
  },
  "Hell Bent Axe": {
    type: "Melee",
    attackSpeed: 0.3,
    damage: 15,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "3",
    swingSound: "medium",
    particles: "Flame",
    inflicts: [
      {
        effect: "Burning",
        duration: 10,
        chance: 1
      }
    ]
  },
  "Guardian's Doomblade": {
    type: "Melee",
    attackSpeed: 0.3,
    damage: 25,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "5",
    swingSound: "medium",
    particles: "Blue"
  },
  "Ironhand Mace": {
    type: "Melee",
    attackSpeed: 0.4,
    damage: 15,
    range: 3.2,
    xBound: 3.2,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "1",
    swingSound: "slow"
  },
  "Leafcutter": {
    type: "Melee",
    attackSpeed: 0.3,
    damage: 18,
    range: 2.75,
    xBound: 2.75,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    swingSound: "medium",
    drawSound: "4"
  },
  "Magma Lamp": {
    type: "Melee",
    attackSpeed: 0.35,
    damage: 15,
    range: 2.5,
    xBound: 2.5,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "2",
    swingSound: "medium",
    particles: "Flame",
    inflicts: [
      {
        effect: "Burning",
        duration: 5,
        chance: 1
      }
    ]
  },
  "Night's Edge": {
    type: "Melee",
    attackSpeed: 0.25,
    damage: 10,
    range: 2.8,
    xBound: 2.8,
    yBound: 2.95,
    xOffset: 0.55,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    drawSound: "4",
    swingSound: "medium",
    particles: "Corruption"
  },
  "Soulblade": {
    type: "Melee",
    attackSpeed: 0.25,
    damage: 20,
    range: 3,
    xBound: 3,
    yBound: 3,
    xOffset: 0.35,
    yOffset: 0,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    initialHandRotation: -90,
    finalHandRotation: 45,
    initialObjectRotation: -45,
    finalObjectRotation: 105,
    lifesteal: 0.5,
    drawSound: "4",
    swingSound: "slow",
    particles: "Soul"
  },
  "Scar-L":  {
    type: "Firearm",
    attackSpeed: 0.2,
    damage: 8,
    range: 3,
    xAnchor: 90,
    yAnchor: 50,
    hotbarSize: 1.95,
    hotbarRotation: 45,
    equipSize: 1.5,
    equipRotation: -25,
    itemSize: 1.4,
    itemRotation: 0,
    rotationOffset: -2.5,
    drawSound: "Gun 1",
    shootColor: "#FFFF66",
    bulletColor: "#FFFF66",
    shootSound: "Scar",
    shootSize: 0.25
  }
}

exports.weapons = function() {return weapons};