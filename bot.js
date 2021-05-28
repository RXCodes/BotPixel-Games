var iterate = function(bot, game) {
  
  // setup
  if (!bot.botActive) {
    bot.botActive = true;
    bot.status = "Idle",
    bot.horizontalMovement = 0;
    bot.movementDuration = 0;
    bot.idleDuration = 0;
    bot.jumpDelay = 20;
    bot.start = Date.now();
    bot.blocks = 0;
  }
  let lifetime = (Date.now() - bot.start) / 1000;
  
  // idle activity
  if (bot.status == "Idle" && bot.horizontalMovement == 0) {
    bot.idleDuration++;
    if (bot.idleDuration > (Math.random() * 15) + 3) {
      if (Math.random() < 0.5) {
        bot.horizontalMovement = 0.75;
      } else {
        bot.horizontalMovement = -0.75;
      }
    }
  }
  if (bot.yVelocity > 0) {
    bot.jumpDelay = 10;
  }
  
  if (bot.status == "Idle" && bot.horizontalMovement !== 0) {
    bot.xVelocity = bot.horizontalMovement;
    bot.idleDuration = 0;
    bot.movementDuration++;
    if (bot.jumpDelay > 0) {
      bot.jumpDelay--;
    }
    if (Math.random() < 0.3 && bot.isOnGround && bot.jumpDelay == 0) {
      bot.jumpDelay = 15;
      bot.yVelocity = 0.75;
    }
    if (bot.movementDuration > (Math.random() * 50) + 10) {
      bot.movementDuration = 0;
      bot.horizontalMovement = 0;
      bot.xVelocity = 0;
    }
  }
  
  // initially find resources
  if (lifetime < 60 && bot.status == "Idle") {
    if (Math.random() > 0.15) {
      bot.status = "Checking for Loot";
    }
  }
  if (bot.status == "Checking for Loot") {
    
    // search for nearest features
    Object.keys(game.interests).forEach(function(key) {
      let x = key.split(',')[0];
      let y = key.split(',')[1];
      let deltaX = Math.abs(x - bot.x);
      let deltaY = Math.abs(y - bot.y);
      if (deltaX <= 10 && deltaY <= 7) {
        bot.status = "Pathfinding";
        bot.iterationRate = 2;
        bot.iterationsLeft = 15;
        bot.pathfindMap = {};
        bot.destination = [x, y];
        bot.pathfindGrowth = [x, y];
        break;
      }
    });
    
  }
  
  // pathfinding
  if (bot.status == "Pathfinding") {
    for (i = 0; i < bot.iterationRate; i++) {
      bot.iterationsLeft--;
      if (bot.iterationsLeft <= 0) {
        bot.status = "Idle";
        break;
      }
    }
  }
  
}

exports.iterate = iterate;