var playerPhysics = function(object, collisions) {
	// get position of bottom-left bounding area
	let boundX = Math.floor(object.x - object.widthHalf);
	let boundY = Math.floor(object.y - object.heightHalf);

	// check block and collision
	const checkBlock = function(x, y) {
		// collision check
		const collide = function(a, b) {
			// no horizontal overlap
			if (a.x1 >= b.x2 || b.x1 >= a.x2) {
				return false;
			}

			// no vertical overlap
			if (a.y1 >= b.y2 || b.y1 >= a.y2) {
				return false;
			}

			return true;
		};
		let player = {
			x1: object.x - object.widthHalf,
			y1: object.y - object.heightHalf,
			x2: object.x + object.widthHalf,
			y2: object.y + object.heightHalf
		};
		let block = {
			x1: x - 0.5,
			y1: y - 0.5,
			x2: x + 0.5,
			y2: y + 0.5
		};
		if (collide(player, block) == false) {
			return;
		}

		// displace player
		let planckDistance = 0.01;
		if (object.x > x) {
			object.x = x + 0.5 + object.widthHalf + planckDistance;
			object.xVelocity = 0.1;
		}
		if (object.x < x) {
			object.x = x - 0.5 - object.widthHalf - planckDistance;
			object.xVelocity = -0.1;
		}
		let xPos = Math.round(object.x);
		let yPos = Math.round(object.y);
		if (object.y > y && collisions[xPos + "," + yPos] !== undefined) {
			object.y = y + 0.5 + object.heightHalf;
			object.yVelocity = 0;
		}
		if (object.y < y) {
			object.y = y - 0.5 - object.heightHalf - planckDistance;
			object.yVelocity = -0.1;
		}
	};

	// check 3 by 4 block area around player
	const prevY = JSON.stringify(object.y);
	for (x = 0; x < 3; x++) {
		for (y = 0; y < 4; y++) {
			if (collisions[boundX + x + ',' + (boundY + y)] !== undefined) {
				checkBlock(boundX + x, boundY + y);
			}
		}
	}
	if (prevY < object.y) {
	  let checkX = Math.round(object.x);
	  let checkY = Math.round(object.y - object.heightHalf - 0.5);
	  if (collisions[checkX + "," + checkY] == undefined) {
	    object.y--;
	  }
	}

	return object;
};

exports.player = playerPhysics;
