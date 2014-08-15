define(function () {
	var lastTime = 0;
	var vendors = ['webkit', 'moz', 'ms', 'o'];
	var requestAnimationFrame = global.requestAnimationFrame,
			cancelAnimationFrame = global.cancelAnimationFrame;
	for (var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
		requestAnimationFrame = global[vendors[x] + 'RequestAnimationFrame'];
		cancelAnimationFrame = global[vendors[x] + 'CancelAnimationFrame'] || global[vendors[x] + 'CancelRequestAnimationFrame'];
	}

	if (!requestAnimationFrame) requestAnimationFrame = function (callback) {
		var currTime = Date.now ? Date.now() : (new Date()).getTime();
		var timeToCall = Math.max(0, 16 - (currTime - lastTime));
		var id = global.setTimeout(function () {
			callback(currTime + timeToCall);
		}, timeToCall);
		lastTime = currTime + timeToCall;
		return id;
	};

	if (!cancelAnimationFrame) cancelAnimationFrame = function (id) {
		clearTimeout(id);
	};

	return {
		requestAnimationFrame: requestAnimationFrame,
		cancelAnimationFrame: cancelAnimationFrame
	};
});