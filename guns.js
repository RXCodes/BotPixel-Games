const interval = 0.25; // interval to increment bullet distance by
const weapons = require("./weapons");
var weaponsJSON = {};
const initialize = function() {
  weaponsJSON = weapons.weapons();
}

const shoot = async function(weapon, collisions, angle, maxDistance, players = []) {
  let self = this;
  return new Promise((resolve) => {
    let xPos = parseFloat(self.xPos);
    let yPos = parseFloat(self.yPos);
    let outputPosition = undefined;
    let dmg = parseFloat((weaponsJSON[weapon] || {}).damage);
    angle = parseFloat(angle);
    let playersHit = {};
    for (currentDistance = 0; currentDistance < maxDistance; currentDistance += interval) {
      currentDistance += interval;
      let xDelta = Math.sin(angle);
      let yDelta = Math.cos(angle);
      let x = xPos + xDelta;
      let y = yPos + yDelta;
      let position = x + "," + y;
      outputPosition = [x, y];
      players.forEach(function(player) {
        let xDiff = Math.abs(player.x - x);
        let yDiff = Math.abs(player.y - y);
        if (xDiff <= 1 && yDiff <= 2 && !playersHit[player.uuid]) {
          playersHit[player.uuid] = true;
          players.addToHealth(-dmg, {
            uuid: self.uuid,
            type: "Player",
            weapon: weapon
          });
        }
      });
      if (collisions[position]) {
        break;
      }
    }
    resolve(outputPosition[0], outputPosition[1]);
  })
}

exports.shoot = shoot;