const pathfind = function(start, end, weights) {
  
	// initialize
	let growthBlocks = {};
	let distanceValues = {};
	let occupiedBlocks = {};
	let maxIterations = 100;
	let iterating = true;
	let currentDistance = 1;
	let increment = 0.1;
	let success = false;

	// input
	start.x = parseInt(start.x);
	start.y = parseInt(start.y);
	end.x = parseInt(end.x);
	end.y = parseInt(end.y);

	// functions
	function checkCell(x, y) {
		return {
			weight: weights[x + ',' + y],
			occupied: occupiedBlocks[x + ',' + y] == true
		};
	}

	function placeGrowth(x, y) {
		x = parseInt(x);
		y = parseInt(y);
		occupiedBlocks[x + ',' + y] = true;
		const iterate = function(a, b, weight) {
			if (!checkCell(a, b).occupied) {
				growthBlocks[a + ',' + b] = checkCell(a, b).weight || weight;
				occupiedBlocks[a + ',' + b] = true;
				distanceValues[a + ',' + b] = currentDistance;
				if (start.x == a && start.y == b) {
					iterating = false;
					success = true;
				}
			}
		};
		iterate(x - 1, y, 0.2);
		iterate(x + 1, y, 0.2);
		iterate(x, y - 1, 0.3);
		iterate(x, y + 1, 0);
	}

	function iterateGrowth() {
		maxIterations--;
		currentDistance++;
		if (maxIterations < 0 || growthBlocks == {}) {
			iterating = false;
			return false;
		}
		let loop = growthBlocks;
		growthBlocks = {};
		Object.keys(loop).forEach(function(key) {
			loop[key] -= increment;
			if (loop[key] <= 0) {
				let position = key.split(',');
				placeGrowth(position[0], position[1]);
			} else {
				growthBlocks[key] = loop[key];
			}
		});
		return true;
	}

	placeGrowth(end.x, end.y);
	while (iterating) {
		iterateGrowth();
	}
	return {
	  distanceMap: distanceValues,
	  success
	};
};

exports.start = pathfind;
