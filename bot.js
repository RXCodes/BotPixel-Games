var iterate = function(bot, game) {
  
  // setup
  if (!bot.botActive) {
    bot.botActive = true;
    bot.status = "Idle",
    bot.horizontalMovement = 0;
    bot.movementDuration = 0;
    bot.idleDuration = 0;
  }
  
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
  if (bot.status == "Idle" && bot.horizontalMovement !== 0) {
    bot.xVelocity = bot.horizontalMovement;
    bot.idleDuration = 0;
    bot.movementDuration++;
    if (Math.random() < 0.3 && bot.isOnGround) {
      bot.yVelocity = 1;
    }
    if (bot.movementDuration > (Math.random() * 50) + 10) {
      bot.movementDuration = 0;
      bot.horizontalMovement = 0;
      bot.xVelocity = 0;
    }
  }
  
}

exports.iterate = iterate;