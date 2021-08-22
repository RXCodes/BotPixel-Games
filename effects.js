/// --- properties --- //
// addToHealth: amount of health to add each time
// emitterColor: the color of the effect particles emitted from the player
// effectSprite: the graphic to use (Default, Fire, Smoke)

/// Effects apply properties every second

const effects = {
  Poison: {
    addToHealth: -3,
    emitterColor: "#20BB30FF",
    effectSprite: "Smoke"
  },
  Regeneration: {
    addToHealth: 5,
    emitterColor: "#99BB98FF",
    effectSprite: "Default"
  },
  Burning: {
    addToHealth: -5,
    emitterColor: "#FF49FFFF",
    effectSprite: "Fire"
  },
  Electric: {
    addToHealth: -6,
    emitterColor: "#FFFFFF60",
    effectSprite: "Lightning"
  }
}

exports.effects = function() {
  return effects;
}