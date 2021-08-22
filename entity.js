// TNT
const TNT = function(entity) {
	if (entity.wait(entity.fuse, 'Ignite')) {
		entity.explode(4);
		entity.kill();
	}
	return entity;
};

// Meteor
const Meteor = function(entity, worldCollisions) {
	if (entity.wait(10, 'Despawn')) {
		entity.kill();
	}
	let x = Math.round(entity.x);
	let y = Math.round(entity.y);
	if (
		worldCollisions[x + ',' + y] ||
		worldCollisions[x + ',' + Math.round(y - 1)] ||
		worldCollisions[x + ',' + Math.round(y + 1)]
	) {
		entity.explode(3);
		entity.kill();
	}
	return entity;
};

exports.TNT = TNT;
exports.Meteor = Meteor;
