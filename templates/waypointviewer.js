var R = 6371000;
var kml = '{{ kml|addslashes }}';
var tsk = '{{ tsk|addslashes }}';
var wpt = '{{ wpt|addslashes }}';

var computeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
var computeHeading = google.maps.geometry.spherical.computeHeading;
var computeLength = google.maps.geometry.spherical.computeLength;
var computeOffset = google.maps.geometry.spherical.computeOffset;

/* http://www.movable-type.co.uk/scripts/latlong.html */
function computeCrossTrackDistance(from, to, point, radius) {
	radius = radius || 6378137;
	var d13 = computeDistanceBetween(from, point, radius);
	var theta12 = computeHeading(from, to);
	var theta13 = computeHeading(from, point);
	return radius * Math.asin(Math.sin(d13 / radius) * Math.sin(Math.PI * (theta13 - theta12) / 180));
}

function computeAlongTrackDistance(from, to, point, radius) {
	radius = radius || 6378137;
	var d13 = computeDistanceBetween(from, point, radius);
	var dxt = computeCrossTrackDistance(from, to, point, radius);
	return radius * Math.acos(Math.cos(d13 / radius) / Math.cos(dxt / radius));
}

function formatTime(i) {
	return i ? sprintf('%02d:%02d', i / 60, i % 60) : null;
}

function Waypoint(feature) {
	this.color = feature.properties.hasOwnProperty('color') ? '#' + feature.properties.color : '#ffff00';
	this.description = feature.properties.hasOwnProperty('description') ? feature.properties.description : null;
	this.elevation = feature.geometry.coordinates.length > 2 ? feature.geometry.coordinates[2] : null;
	this.id = feature.properties.id;
	this.radius = feature.properties.hasOwnProperty('radius') ? feature.properties.radius : null;
	this.position = new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
}

$.extend(Waypoint.prototype, {

	show: function (map) {
		var richMarkerContent = $('#waypointRichMarkerContent').clone().attr({id: null}).css('background-color', this.color).show();
		$('#waypointLabel', richMarkerContent).html(this.id.match(/^([A-Z][0-9]{2})([0-9]{3})$/) && 10 * (RegExp.$2 - 1) <= this.elevation && this.elevation <= 10 * (RegExp.$2 + 1) ? RegExp.$1 : this.id);
		var marker = new RichMarker({
			anchor: RichMarkerPosition.MIDDLE,
			content: richMarkerContent.get(0),
			flat: true,
			map: map,
			position: this.position
		});
		if (this.radius) {
			var circle = new google.maps.Circle({
				clickable: false,
				fillColor: this.color,
				fillOpacity: 0.25,
				radius: this.radius,
				strokeOpacity: 1,
				strokeWeight: 1
			});
			circle.bindTo('center', marker, 'position');
			circle.bindTo('strokeColor', circle, 'fillColor');
			circle.bindTo('map', marker);
		}
		var infoWindowContent = $('#waypointInfoWindowContent').clone().attr({id: null}).show();
		$('#waypointIdValue', infoWindowContent).html(this.id);
		$('#waypointLatitudeValue', infoWindowContent).html(this.position.lat().toFixed(5) + '&deg;');
		$('#waypointLongitudeValue', infoWindowContent).html(this.position.lng().toFixed(5) + '&deg;');
		if (this.elevation) {
			$('#waypointElevationValue', infoWindowContent).html(this.elevation.toFixed() + 'm');
		} else {
			$('#waypointElevation', infoWindowContent).hide();
		}
		if (this.description) {
			$('#waypointDescriptionValue', infoWindowContent).html(this.description);
		} else {
			$('#waypointDescription', infoWindowContent).hide();
		}
		if (this.radius) {
			$('#waypointRadiusValue', infoWindowContent).html(this.radius + 'm');
		} else {
			$('#waypointRadius', infoWindowContent).hide();
		}
		var infoWindow = new google.maps.InfoWindow({content: infoWindowContent.get(0)});
		google.maps.event.addListener(marker, 'click', function () {
			infoWindow.open(map, marker);
		});
	}

});

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

	parse: function (s, waypoints) {
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
		for (var j = 0; j < waypoints.length; ++j) {
			if (waypoints[j].id.substr(0, this.name.length).toLowerCase() == this.name) {
				this.id = waypoints[j].id;
				this.description = waypoints[j].description;
				this.position = waypoints[j].position;
				break;
			}
		}
		return this;
	}

});

function Task() {
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
}

$.extend(Task, {
	BASE_TIME: {wc: 'windowOpen', so: 'windowOpen', sl: 'windowOpen', sc: 'windowOpen', gc: 'windowOpen', tc: 'windowOpen'},
	TIME_NAME: {wo: 'windowOpen', wc: 'windowClose', so: 'startOpen', sl: 'startLast', sc: 'startClose', gc: 'goalClose', tc: 'taskClose'},
	TYPES: {race: 'Race To Goal', open: 'Open Distance', elap: 'Elapsed Time', head: 'Headed Open Distance'}
});

$.extend(Task.prototype, {

	parse: function (s, waypoints) {
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
					that.windowOpen = 60 * parseInt(RegExp.$2) + parseInt(RegExp.$3);
				} else if (token.match(/^(wc|so|sl|sc|gc|tc)(\+)?(\d?\d)?(\d\d)$/)) {
					var time = Task.TIME_NAME[RegExp.$1];
					that[time] = (RegExp.$3 ? 60 * parseInt(RegExp.$3) : 0) + parseInt(RegExp.$4);
					if (RegExp.$2) {
						var base_time = that[Task.BASE_TIME[RegExp.$1]];
						if (base_time != null) {
							that[time] += base_time;
						} else {
							that.errors.push('Cannot specify relative time "' + time + '" when "' + Task.BASE_TIME[RegExp.$1] + '" is not set');
						}
					}
				} else {
					var turnpoint = new Turnpoint().parse(token, waypoints);
					$.each(turnpoint.errors, function (j, error) {
						that.errors.push(error);
					});
					that.turnpoints.push(turnpoint);
				}
			}
		});
		for (var i = 0; i < this.turnpoints.length - 1; ++i) {
			if (this.turnpoints[i].attributes.hasOwnProperty('ss') && this.turnpoints[i].name != this.turnpoints[i + 1].name) {
				this.turnpoints[i].attributes.exit = true;
				break;
			}
		}
		this.computePath();
		this.computeShortestPath();
		return this;
	},

	computePath: function () {
		this.path = $.map(this.turnpoints, function (turnpoint, i) {
			return turnpoint.position;
		});
		this.pathLength = computeLength(this.path);
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
				if (computeDistanceBetween(previous.center, point.center, R) < previous.radius) {
					previous.include = false;
				}
			}
		});
		points = $.map(points, function (point, i) {
			return point.include ? point : null;
		});
		this.shortestPath = null;
		this.shortestPathLength = null;
		while (true) {
			for (var i = 1; i < points.length - 1; ++i) {
				var point = points[i];
				if (point.radius > 0) {
					var crossTrackDistance = computeCrossTrackDistance(points[i - 1].position, points[i + 1].position, point.center, R);
					if (Math.abs(crossTrackDistance) < point.radius) {
						var alongTrackDistance = computeAlongTrackDistance(points[i - 1].position, points[i + 1].position, point.center, R);
						var heading = computeHeading(points[i - 1].position, points[i + 1].position);
						point.position = computeOffset(points[i - 1].position, alongTrackDistance, heading, R);
					} else {
						var heading1 = computeHeading(point.position, points[i - 1].position);
						var heading2 = computeHeading(point.position, points[i + 1].position);
						var heading = (heading1 + heading2) / 2 + (Math.abs(heading1 - heading2) > 180 ? 180 : 0);
						point.position = computeOffset(point.center, point.radius, heading, R);
					}
				}
			}
			if (points[points.length - 1].radius > 0) {
				var point = points[points.length - 1];
				var heading = computeHeading(point.position, points[points.length - 2].position);
				point.position = computeOffset(point.center, point.radius, heading, R);
			}
			var path = $.map(points, function (point, i) {
				return point.include ? point.position : null;
			});
			var length = computeLength(path);
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
		var bounds = new google.maps.LatLngBounds();
		$.each(this.turnpoints, function (i, turnpoint) {
			bounds.extend(turnpoint.position);
		});
		return bounds;
	},

	getTaskBoardContent: function () {
		var that = this;
		var taskBoardContent = $('#taskBoardContent').clone().attr({id: null}).show();
		$('#taskName', taskBoardContent).html(this.name);
		$('#taskDistance', taskBoardContent).html((this.pathLength / 1000).toFixed(1) + 'km');
		$('#taskShortestDistance', taskBoardContent).html((this.shortestPathLength / 1000).toFixed(1) + 'km');
		$('#taskType', taskBoardContent).html(Task.TYPES[this.type]);
		$('#taskWindowOpen', taskBoardContent).html(formatTime(this.windowOpen));
		$('#taskStartOpen', taskBoardContent).html(formatTime(this.startOpen));
		$('#taskWindowClose', taskBoardContent).html(formatTime(this.windowClose));
		$('#taskTaskClose', taskBoardContent).html(formatTime(this.taskClose));
		var count = 1;
		$.each(this.turnpoints, function (i, turnpoint) {
			var turnpointRow = $('#turnpointRow', taskBoardContent).clone().attr({id: null, class: i % 2 == 0 ? 'tbl-points-even' : 'tbl-points-odd'}).show();
			var index;
			if (i == 0) {
				index = 'TO';
			} else if (i == that.turnpoints.length - 1) {
				index = 'GOAL';
				++count;
			} else if (turnpoint.attributes.hasOwnProperty('ss')) {
				index = 'SS' + (turnpoint.attributes.hasOwnProperty('exit') ? ' (EXIT)' : '');
			} else if (turnpoint.attributes.hasOwnProperty('es')) {
				index = 'ES';
				++count;
			} else {
				index = count;
				++count;
			}
			$('#turnpointIndex', turnpointRow).html(index);
			$('#turnpointId', turnpointRow).html(turnpoint.id);
			$('#turnpointDescription', turnpointRow).html(turnpoint.description);
			if (turnpoint.radius > 0) {
				$('#turnpointRadius', turnpointRow).html(turnpoint.radius);
			}
			$('#turnpointRow', taskBoardContent).before(turnpointRow);
		});
		return taskBoardContent;
	},

	show: function (map) {
		var that = this;
		var positions = [];
		$.each(this.turnpoints, function (i, turnpoint) {
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
					var heading = computeHeading(turnpoint.position, positions[positions.length - 2]);
					var polyline = new google.maps.Polyline({
						map: map,
						path: [
							computeOffset(turnpoint.position, turnpoint.radius, heading - 90, R),
							computeOffset(turnpoint.position, turnpoint.radius, heading + 90, R)
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
		});
		var polyline = new google.maps.Polyline({
			map: map,
			path: this.shortestPath,
			strokeColor: '#ffff00',
			strokeOpacity: 1,
			strokeWeight: 2
		});
	}

});

$(function () {

	var options = {
		disableDoubleClickZoom: true,
		mapTypeId: google.maps.MapTypeId.TERRAIN,
		streetViewControl: false
	};

	if (top.location != self.location) {
		$.extend(options, {
			mapTypeControlOptions: {
				style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
			},
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL
			}
		});
	}

	var map = new google.maps.Map($('#map').get(0), options);

	if (top.location != self.location) {
		var fullScreenButton = $('#fullScreenButton').clone().attr({id: null}).show().click(function () {
			top.location = self.location.href;
		});
		map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(fullScreenButton.get(0));
	}

	$.getJSON('wpt2json.json?wpt=' + wpt, function (geojson) {
		var bounds = null;
		var waypoints = $.map(geojson.features, function (feature, i) {
			return new Waypoint(feature);
		});
		if (tsk) {
			var task = new Task().parse('tsk ' + tsk, waypoints);
			task.show(map);
			var infoWindow = new google.maps.InfoWindow({content: task.getTaskBoardContent().get(0)});
			var taskBoardButton = $('#taskBoardButton').clone().attr({id: null}).show().click(function () {
				infoWindow.setPosition(new google.maps.LatLng(map.getBounds().getSouthWest().lat(), map.getCenter().lng()));
				infoWindow.open(map);
			});
			map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(taskBoardButton.get(0));
			bounds = task.getBounds();
		} else {
			bounds = new google.maps.LatLngBounds();
			$.each(waypoints, function (i, waypoint) {
				waypoint.show(map);
				bounds.extend(waypoint.position);
			});
		}
		map.fitBounds(bounds);
		google.maps.event.addListener(map, 'dblclick', function () {
			map.fitBounds(bounds);
		});
	});

	if (kml) {
		var kmlLayer = new google.maps.KmlLayer(kml, {
			map: map,
			preserveViewport: true
		});
	}

});
