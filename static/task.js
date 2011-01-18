/*jslint white: true, onevar: true, undef: true, newcap: true, nomen: true, regexp: true, plusplus: true, bitwise: true, browser: true */
/*global $: false, google: false */

var Task, Turnpoint, Waypoint;

(function () {

	var computeDistanceBetween, computeHeading, computeLength, computeOffset;

	computeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
	computeHeading = google.maps.geometry.spherical.computeHeading;
	computeLength = google.maps.geometry.spherical.computeLength;
	computeOffset = google.maps.geometry.spherical.computeOffset;

	/* http://www.movable-type.co.uk/scripts/latlong.html */
	function computeCrossTrackDistance(from, to, point, radius) {
		var d13, theta12, theta13;
		radius = radius || 6378137;
		d13 = computeDistanceBetween(from, point, radius);
		theta12 = computeHeading(from, to);
		theta13 = computeHeading(from, point);
		return radius * Math.asin(Math.sin(d13 / radius) * Math.sin(Math.PI * (theta13 - theta12) / 180));
	}

	function computeAlongTrackDistance(from, to, point, radius) {
		var d13, dxt;
		radius = radius || 6378137;
		d13 = computeDistanceBetween(from, point, radius);
		dxt = computeCrossTrackDistance(from, to, point, radius);
		return radius * Math.acos(Math.cos(d13 / radius) / Math.cos(dxt / radius));
	}

	Waypoint = function (feature) {
		this.color = feature.properties.hasOwnProperty('color') ? '#' + feature.properties.color : null;
		this.description = feature.properties.hasOwnProperty('description') ? feature.properties.description : null;
		this.elevation = feature.geometry.coordinates.length > 2 ? feature.geometry.coordinates[2] : null;
		this.id = feature.properties.id;
		this.position = new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
		this.radius = feature.properties.hasOwnProperty('radius') ? feature.properties.radius : null;
	};

	Turnpoint = function () {
		this.attributes = {};
		this.description = null;
		this.errors = [];
		this.id = null;
		this.position = null;
		this.radius = 400;
	};

	$.extend(Turnpoint, {
		ATTRIBUTES: {ss: true, es: true, gl: true}
	});

	$.extend(Turnpoint.prototype, {

		parse: function (s, waypoints) {
			var that = this;
			$.each(s.toLowerCase().split('.'), function (i, token) {
				var j;
				if (i === 0) {
					for (j = 0; j < waypoints.length; j += 1) {
						if (waypoints[j].id.substr(0, token.length).toLowerCase() === token) {
							that.id = waypoints[j].id;
							that.description = waypoints[j].description;
							that.position = waypoints[j].position;
							break;
						}
					}
					if (that.id === null) {
						that.errors.push('Invalid waypoint "' + token + '"');
					}
				} else {
					if (Turnpoint.ATTRIBUTES.hasOwnProperty(token)) {
						that.attributes[token] = true;
					} else if (token.match(/^r(\d+)(k?)$/)) {
						that.radius = (RegExp.$2 ? 1000 : 1) * parseInt(RegExp.$1, 10);
					} else {
						that.errors.push('Invalid token "' + token + '"');
					}
				}
			});
			return this;
		}

	});

	Task = function () {
		this.name = null;
		this.type = null;
		this.windowOpen = null;
		this.windowClose = null;
		this.startOpen = null;
		this.startLast = null;
		this.startClose = null;
		this.goalClose = null;
		this.taskClose = null;
		this.clockStart = null;
		this.turnpoints = [];
		this.errors = [];
	};

	$.extend(Task, {
		REFERENCE_TIME: {wc: 'windowOpen', so: 'windowOpen', sl: 'windowOpen', sc: 'windowOpen', gc: 'windowOpen', tc: 'windowOpen'},
		TIME_NAME: {wo: 'windowOpen', wc: 'windowClose', so: 'startOpen', sl: 'startLast', sc: 'startClose', gc: 'goalClose', tc: 'taskClose'},
		TYPES: {race: 'Race To Goal', open: 'Open Distance', elap: 'Elapsed Time', head: 'Headed Open Distance'}
	});

	$.extend(Task.prototype, {

		parse: function (s, waypoints, radius) {
			var i, that = this;
			$.each(s.split(/\s+/), function (i, token) {
				var referenceTime, time, turnpoint;
				if (i === 0) {
					token = token.toLowerCase();
					if (token !== 'tsk') {
						that.errors.push('Invalid task header "' + token + '"');
					}
				} else if (i === 1) {
					that.name = token;
				} else if (i === 2) {
					token = token.toLowerCase();
					if (Task.TYPES.hasOwnProperty(token)) {
						that.type = token;
					} else {
						that.errors.push('Invalid task type "' + token + '"');
					}
				} else {
					token = token.toLowerCase();
					/* FIXME handle cs */
					if (token.match(/^(wo)(\d\d)(\d\d)$/)) {
						that.windowOpen = 60 * parseInt(RegExp.$2, 10) + parseInt(RegExp.$3, 10);
					} else if (token.match(/^(wc|so|sl|sc|gc|tc)(\+)?(\d?\d)?(\d\d)$/)) {
						time = Task.TIME_NAME[RegExp.$1];
						that[time] = (RegExp.$3 ? 60 * parseInt(RegExp.$3, 10) : 0) + parseInt(RegExp.$4, 10);
						if (RegExp.$2) {
							referenceTime = that[Task.REFERENCE_TIME[RegExp.$1]];
							if (referenceTime !== null) {
								that[time] += referenceTime;
							} else {
								that.errors.push('Cannot specify relative time "' + time + '" when "' + Task.REFERENCE_TIME[RegExp.$1] + '" is not set');
							}
						}
					} else {
						turnpoint = new Turnpoint().parse(token, waypoints);
						$.each(turnpoint.errors, function (j, error) {
							that.errors.push(error);
						});
						that.turnpoints.push(turnpoint);
					}
				}
			});
			for (i = 0; i < this.turnpoints.length - 1; i += 1) {
				if (this.turnpoints[i].attributes.hasOwnProperty('ss') && this.turnpoints[i].name !== this.turnpoints[i + 1].name) {
					this.turnpoints[i].attributes.exit = true;
					break;
				}
			}
			this.computePath(radius);
			this.computeShortestPath(radius);
			return this;
		},

		computePath: function (radius) {
			this.path = $.map(this.turnpoints, function (turnpoint, i) {
				return turnpoint.position;
			});
			this.pathLength = computeLength(this.path, radius);
		},

		computeShortestPath: function (radius) {
			var alongTrackDistance, crossTrackDistance, heading, heading1, heading2, i, length, path, points;
			points = $.map(this.turnpoints, function (turnpoint, i) {
				return {
					center: turnpoint.position,
					include: true,
					radius: i === 0 || turnpoint.attributes.hasOwnProperty('gl') ? 0 : turnpoint.radius
				};
			});
			$.each(points, function (i, point) {
				var j, previous;
				if (i > 0) {
					for (j = i - 1; j >= 0; j -= 1) {
						if (points[j].include) {
							previous = points[j];
							break;
						}
					}
					if (computeDistanceBetween(previous.center, point.center, radius) < previous.radius) {
						previous.include = false;
					}
				}
			});
			points = $.map(points, function (point, i) {
				return point.include ? point : null;
			});
			path = $.map(points, function (point, i) {
				return point.center;
			});
			this.shortestPath = null;
			this.shortestPathLength = null;
			while (true) {
				for (i = 1; i < points.length - 1; i += 1) {
					if (points[i].radius > 0) {
						crossTrackDistance = computeCrossTrackDistance(path[i - 1], path[i + 1], points[i].center, radius);
						if (Math.abs(crossTrackDistance) < points[i].radius) {
							alongTrackDistance = computeAlongTrackDistance(path[i - 1], path[i + 1], points[i].center, radius);
							heading = computeHeading(path[i - 1], path[i + 1]);
							path[i] = computeOffset(path[i - 1], alongTrackDistance, heading, radius);
							if (computeDistanceBetween(path[i], points[i].center, radius) > points[i].radius) {
								heading1 = computeHeading(points[i].center, path[i - 1]);
								heading2 = computeHeading(points[i].center, path[i + 1]);
								heading = (heading1 + heading2) / 2 + (Math.abs(heading1 - heading2) > 180 ? 180 : 0);
								path[i] = computeOffset(points[i].center, points[i].radius, heading, radius);
							}
						} else {
							heading1 = computeHeading(points[i].center, path[i - 1]);
							heading2 = computeHeading(points[i].center, path[i + 1]);
							heading = (heading1 + heading2) / 2 + (Math.abs(heading1 - heading2) > 180 ? 180 : 0);
							path[i] = computeOffset(points[i].center, points[i].radius, heading, radius);
						}
					}
				}
				if (points[points.length - 1].radius > 0) {
					heading = computeHeading(path[points.length - 1], path[points.length - 2]);
					path[points.length - 1] = computeOffset(points[points.length - 1].center, points[points.length - 1].radius, heading, radius);
				}
				length = computeLength(path, radius);
				if (this.shortestPathLength) {
					if (length < this.shortestPathLength) {
						this.shortestPath = path;
						this.shortestPathLength = length;
					} else {
						break;
					}
				} else {
					this.shortestPath = path;
					this.shortestPathLength = length;
				}
			}
		},

		getBounds: function () {
			var bounds;
			bounds = new google.maps.LatLngBounds();
			$.each(this.turnpoints, function (i, turnpoint) {
				bounds.extend(turnpoint.position);
			});
			return bounds;
		}

	});

})();
