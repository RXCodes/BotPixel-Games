var playerPhysics = function(object, collisions) {
	// get position of bottom-left bounding area
	let boundX = Math.floor(object.x - object.widthHalf);
	let boundY = Math.floor(object.y - object.heightHalf);

	// check block and collision
	const checkBlock = function(x, y) {
		if (object.x - object.widthHalf < x - 0.5) {
			if (object.x + object.widthHalf > x + 0.5) {
				let yPos = object.y;
				let change = false;
				if (y + 0.5 <= object.y - object.heightHalf && object.yVelocity <= 0) {
					change = true;
					object.y = y + 1.5;
					object.yVelocity = 0;
				}
				if (object.yVelocity < 0 && !change) {
					yPos = Math.max(y + 0.5, yPos - object.heightHalf);
				}
				if (object.yVelocity > 0 && !change) {
					yPos = Math.min(y - 0.5, yPos + object.heightHalf);
				}
				if (yPos !== object.y && !change) {
					object.y = yPos;
					object.yVelocity = 0;
				}
			}
		}

		if (object.y - object.heightHalf < y + 0.5) {
			if (object.y + object.heightHalf > y - 0.5) {
				let xPos = object.x;
				if (object.xVelocity > 0) {
					xPos = Math.min(xPos + object.widthHalf, x - 0.5);
				}
				if (object.xVelocity < 0) {
					xPos = Math.max(xPos - object.widthHalf, x + 0.5);
				}
				if (xPos !== object.x) {
					object.x = xPos;
					object.xVelocity = 0;
				}
			}
		}
	};

	// check 3 by 4 block area around player
	for (x = 0; x < 3; x++) {
		for (y = 0; y < 4; y++) {
			if (collisions[boundX + x + ',' + (boundY + y)] !== undefined) {
				checkBlock(boundX + x, boundY + y);
			}
		}
	}

	return object;
};

exports.player = playerPhysics;
