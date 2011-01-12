var R = 6371000;
var kml = '{{ kml|addslashes }}';
var tsk = '{{ tsk|addslashes }}';
var wpt = '{{ wpt|addslashes }}';

/* http://www.movable-type.co.uk/scripts/latlong.html */
function computeCrossTrackDistance(from, to, point, radius) {
	radius = radius || 6378137;
	var d13 = google.maps.geometry.spherical.computeDistanceBetween(from, point, radius);
	var theta12 = google.maps.geometry.spherical.computeHeading(from, to);
	var theta13 = google.maps.geometry.spherical.computeHeading(from, point);
	return radius * Math.asin(Math.sin(d13 / radius) * Math.sin(Math.PI * (theta13 - theta12) / 180));
}

function computeAlongTrackDistance(from, to, point, radius) {
	radius = radius || 6378137;
	var d13 = google.maps.geometry.spherical.computeDistanceBetween(from, point, radius);
	var dxt = computeCrossTrackDistance(from, to, point, radius);
	return radius * Math.acos(Math.cos(d13 / radius) / Math.cos(dxt / radius));
}

function Waypoint(options) {

	var that = this;

	this.set('id', options.id);
	this.set('position', options.position);
	this.set('elevation', options.elevation);
	this.set('description', options.description);
	this.set('radius', options.radius);
	this.set('color', options.color);
	this.set('map', options.map);

	var richMarkerContent = $('#richMarker').clone().attr({id: null}).show();
	richMarkerContent.css('background-color', '#' + this.get('color'));
	var label = this.get('id');
	var match = /^([A-Z][0-9]{2})([0-9]{3})$/.exec(this.get('id'));
	if (match && 10 * (match[2] - 1) <= this.get('elevation') && this.get('elevation') <= 10 * (match[2] + 1)) {
		label = match[1];
	}
	$('#label', richMarkerContent).html(label);
	var marker = new RichMarker({
		anchor: RichMarkerPosition.MIDDLE,
		content: richMarkerContent.get(0),
		flat: true,
		map: this.get('map')
	});
	marker.bindTo('position', this);
	marker.bindTo('map', this);
	this.set('marker', marker);

	var circle = new google.maps.Circle({
		clickable: false,
		fillOpacity: 0.25,
		strokeOpacity: 1,
		strokeWeight: 1
	});
	circle.bindTo('center', this, 'position');
	circle.bindTo('fillColor', this, 'color');
	circle.bindTo('radius', this);
	circle.bindTo('strokeColor', this, 'color');
	circle.bindTo('map', this);

	var infoWindowContent = $('#infoWindow').clone().attr({id: null}).show();
	$('#id', infoWindowContent).html(this.get('id'));
	$('#lat', infoWindowContent).html(this.get('position').lat());
	$('#lng', infoWindowContent).html(this.get('position').lng());
	$('#elevation', infoWindowContent).html(this.get('elevation'));
	$('#description', infoWindowContent).html(this.get('description'));
	$('#radius', infoWindowContent).html(this.get('radius'));
	var infoWindow = new google.maps.InfoWindow({content: infoWindowContent.get(0)});
	this.set('infoWindow', infoWindow);

	google.maps.event.addListener(marker, 'click', function () {
		that.get('infoWindow').open(that.get('map'), that.get('marker'));
	});

	google.maps.event.addListener(marker, 'dblclick', function () {
		that.get('map').panTo(that.get('position'));
		that.get('map').setZoom(15);
	});

}

Waypoint.prototype = new google.maps.MVCObject();

function Turnpoint() {
	this.name = null;
	this.attributes = {};
	this.radius = 400;
	this.errors = [];
}

$.extend(Turnpoint, {
	ATTRIBUTES: {ss: true, es: true, gl: true}
});

$.extend(Turnpoint.prototype, {

	parse: function (s) {
		var that = this;
		$.each(s.toLowerCase().split('.'), function (i, token) {
			if (i == 0) {
				that.name = token;
			} else {
				if (Turnpoint.ATTRIBUTES.hasOwnProperty(token)) {
					that.attributes[token] = true;
				} else if (token.match(/^r(\d+)(k?)$/)) {
					that.radius = (RegExp.$2 ? 1000 : 1) * parseInt(RegExp.$1);
				} else {
					that.errors.push('Invalid token "' + token + '"');
				}
			}
		});
		return this;
	},

	computePosition: function (waypoints) {
		for (var j = 0; j < waypoints.length; ++j) {
			if (waypoints[j].id.substr(0, this.name.length).toLowerCase() == this.name) {
				this.id = waypoints[j].id;
				this.description = waypoints[j].description;
				this.position = waypoints[j].position;
				break;
			}
		}
	}

});

function Task() {
	this.name = null;
	this.type = null;
	this.wo = null;
	this.wc = null;
	this.so = null;
	this.sl = null;
	this.sc = null;
	this.gc = null;
	this.tc = null;
	this.cs = null;
	this.turnpoints = [];
	this.errors = [];
}

$.extend(Task, {
	BASE_TIME: {wc: 'wo', so: 'wo', sl: 'so', sc: 'so', gc: 'wo', tc: 'wo'},
	TYPES: {race: 'race to goal', open: 'open distance', elap: 'elapsed time', head: 'headed open distance'}
});

$.extend(Task.prototype, {

	parse: function (s) {
		var that = this;
		$.each(s.split(/\s+/), function (i, token) {
			if (i == 0) {
				token = token.toLowerCase();
				if (token != 'tsk') {
					that.errors.push('Invalid task header "' + token + '"');
				}
			} else if (i == 1) {
				that.name = token;
			} else if (i == 2) {
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
					that.wo = 60 * parseInt(RegExp.$2) + parseInt(RegExp.$3);
				} else if (token.match(/^(wc|so|sl|sc|gc|tc)(\+)?(\d?\d)?(\d\d)$/)) {
					that[RegExp.$1] = (RegExp.$2 ? that[Task.BASE_TIME[RegExp.$1]] : 0) + (RegExp.$3 ? 60 * parseInt(RegExp.$3) : 0) + parseInt(RegExp.$4);
					if (RegExp.$2) {
						var base_time = that[Task.BASE_TIME[RegExp.$1]];
						if (base_time != null) {
							that[RegExp.$1] += base_time;
						} else {
							that.errors.push('Cannot specify relative time "' + token + '" when "' + Task.BASE_TIME[RegExp.$1] + '" is not set');
						}
					}
				} else {
					var turnpoint = new Turnpoint().parse(token);
					$.each(turnpoint.errors, function (j, error) {
						that.errors.push(error);
					});
					that.turnpoints.push(turnpoint);
				}
			}
		});
		return this;
	},

	computePositions: function (waypoints) {
		$.each(this.turnpoints, function (i, turnpoint) {
			turnpoint.computePosition(waypoints);
		});
		for (var i = 0; i < this.turnpoints.length - 1; ++i) {
			if (this.turnpoints[i].attributes.hasOwnProperty('ss') && this.turnpoints[i].name != this.turnpoints[i + 1].name) {
				this.turnpoints[i].attributes.exit = true;
				break;
			}
		}
	},

	computeShortestPath: function () {
		var points = $.map(this.turnpoints, function (turnpoint, i) {
			return {
				center: turnpoint.position,
				heading: 0,
				include: true,
				position: turnpoint.position,
				radius: i == 0 || turnpoint.attributes.hasOwnProperty('gl') ? 0 : turnpoint.radius
			};
		});
		$.each(points, function (i, point) {
			if (i > 0) {
				var previous = null;
				for (var j = i - 1; j >= 0; --j) {
					if (points[j].include) {
						previous = points[j];
						break;
					}
				}
				if (google.maps.geometry.spherical.computeDistanceBetween(previous.center, point.center, R) < previous.radius) {
					previous.include = false;
				}
			}
		});
		points = $.map(points, function (point, i) {
			return point.include ? point : null;
		});
		var bestPath = null;
		var bestLength = null;
		while (true) {
			for (var i = 1; i < points.length - 1; ++i) {
				var point = points[i];
				if (point.radius > 0) {
					var crossTrackDistance = computeCrossTrackDistance(points[i - 1].position, points[i + 1].position, point.center, R);
					if (Math.abs(crossTrackDistance) < point.radius) {
						var alongTrackDistance = computeAlongTrackDistance(points[i - 1].position, points[i + 1].position, point.center, R);
						var heading = google.maps.geometry.spherical.computeHeading(points[i - 1].position, points[i + 1].position);
						point.position = google.maps.geometry.spherical.computeOffset(points[i - 1].position, alongTrackDistance, heading, R);
					} else {
						var heading1 = google.maps.geometry.spherical.computeHeading(point.position, points[i - 1].position);
						var heading2 = google.maps.geometry.spherical.computeHeading(point.position, points[i + 1].position);
						var heading = (heading1 + heading2) / 2 + (Math.abs(heading1 - heading2) > 180 ? 180 : 0);
						point.position = google.maps.geometry.spherical.computeOffset(point.center, point.radius, heading, R);
					}
				}
			}
			if (points[points.length - 1].radius > 0) {
				var point = points[points.length - 1];
				var heading = google.maps.geometry.spherical.computeHeading(point.position, points[points.length - 2].position);
				point.position = google.maps.geometry.spherical.computeOffset(point.center, point.radius, heading, R);
			}
			var path = $.map(points, function (point, i) {
				return point.include ? point.position : null;
			});
			var length = google.maps.geometry.spherical.computeLength(path);
			if (bestLength) {
				if (length < bestLength) {
					bestLength = length;
					bestPath = path;
				} else {
					break;
				}
			} else {
				bestLength = length;
				bestPath = path;
			}
		}
		return bestPath;
	},

	getPath: function () {
		return $.map(this.turnpoints, function (turnpoint, i) {
			return turnpoint.position;
		});
	}

});

$(document).ready(function () {

	var map = new google.maps.Map($('#map').get(0), {
		disableDoubleClickZoom: true,
		mapTypeId: google.maps.MapTypeId.TERRAIN
	});

	if (top.location != self.location) {
		var fullScreen = $('#fullScreen').click(function () { top.location = self.location.href; }).show();
		map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(fullScreen.get(0));
	}

	var bounds = new google.maps.LatLngBounds();

	if (tsk) {
		var task = new Task().parse('tsk TASK race ' + tsk);
		$.getJSON('wpt2json.json?wpt=' + wpt, function (geojson) {
			var waypoints = [];
			$.each(geojson.features, function (i, feature) {
				var waypoint = {
					description: '',
					elevation: 0,
					id: feature.properties.id,
					position: new google.maps.LatLng(
						feature.geometry.coordinates[1],
						feature.geometry.coordinates[0]
					),
				};
				if (feature.properties.hasOwnProperty('description')) {
					waypoint.description = feature.properties.description;
				}
				if (feature.geometry.coordinates.length > 2) {
					waypoint.elevation = feature.geometry.coordinates[2];
				}
				waypoints.push(waypoint);
			});
			task.computePositions(waypoints);
			var positions = [];
			$.each(task.turnpoints, function (i, turnpoint) {
				if (i == 0) {
					positions.push(turnpoint.position);
				} else {
					if (turnpoint.position != positions[positions.length - 1]) {
						positions.push(turnpoint.position);
					}
					var color = null;
					if (turnpoint.attributes.hasOwnProperty('ss')) {
						color = '#00ff00';
					} else if (turnpoint.attributes.hasOwnProperty('es')) {
						color = '#ff0000';
					} else {
						color = '#ffff00';
					}
					if (turnpoint.attributes.hasOwnProperty('gl')) {
						var heading = google.maps.geometry.spherical.computeHeading(turnpoint.position, positions[positions.length - 2]);
						var polyline = new google.maps.Polyline({
							map: map,
							path: [
								google.maps.geometry.spherical.computeOffset(turnpoint.position, turnpoint.radius, heading - 90, R),
								google.maps.geometry.spherical.computeOffset(turnpoint.position, turnpoint.radius, heading + 90, R)
							],
							strokeColor: color,
							strokeOpacity: 1,
							strokeWeight: 2
						});
					} else {
						var circle = new google.maps.Circle({
							center: turnpoint.position,
							fillColor: color,
							fillOpacity: 0.1,
							map: map,
							radius: turnpoint.radius,
							strokeColor: color,
							strokeOpacity: 1,
							strokeWeight: 1
						});
					}
				}
				bounds.extend(turnpoint.position);
			});
			var polyline = new google.maps.Polyline({
				map: map,
				path: task.computeShortestPath(),
				strokeColor: '#ffff00',
				strokeOpacity: 1,
				strokeWeight: 2
			});
			map.fitBounds(bounds);
			var taskBoard = $('#taskBoard');
			$('#distance', taskBoard).html((google.maps.geometry.spherical.computeLength(task.getPath()) / 1000).toFixed(1));
			$('#type', taskBoard).html(Task.TYPES[task.type]);
			var infoWindow = new google.maps.InfoWindow({content: taskBoard.show().get(0), position: task.turnpoints[0].position});
			var taskBoardButton = $('#taskBoardButton').click(function () { infoWindow.open(map); }).show();
			map.controls[google.maps.ControlPosition.TOP_CENTER].push(taskBoardButton.get(0));
		});
	} else {
		$.getJSON('wpt2json.json?wpt=' + wpt, function (geojson) {
			$.each(geojson.features, function (i, feature) {
				var options = {
					color: 'ffff00',
					description: '',
					elevation: 0,
					id: feature.properties.id,
					map: map,
					position: new google.maps.LatLng(
						feature.geometry.coordinates[1],
						feature.geometry.coordinates[0]
					),
					radius: 400
				};
				$.each(['color', 'description', 'radius'], function (j, property) {
					if (feature.properties.hasOwnProperty(property)) {
						options[property] = feature.properties[property];
					}
				});
				if (feature.geometry.coordinates.length > 2) {
					options.elevation = feature.geometry.coordinates[2];
				}
				var waypoint = new Waypoint(options);
				bounds.extend(options.position);
			});
			map.fitBounds(bounds);
		});
	}

	if (kml) {
		var kmlLayer = new google.maps.KmlLayer(kml, {
			map: map,
			preserveViewport: true
		});
	}

	google.maps.event.addListener(map, 'dblclick', function () {
		map.fitBounds(bounds);
	});

});
