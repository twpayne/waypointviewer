var kml = '{{ kml|addslashes }}';
var tsk = '{{ tsk|addslashes }}';
var wpt = '{{ wpt|addslashes }}';

function Waypoint(options) {

	var self = this;

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
		self.get('infoWindow').open(self.get('map'), self.get('marker'));
	});

	google.maps.event.addListener(marker, 'dblclick', function () {
		self.get('map').panTo(self.get('position'));
		self.get('map').setZoom(15);
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
		var self = this;
		$.each(s.toLowerCase().split('.'), function (i, token) {
			if (i == 0) {
				self.name = token;
			} else {
				if (Turnpoint.ATTRIBUTES.hasOwnProperty(token)) {
					self.attributes[token] = true;
				} else if (token.match(/^r(\d+)(k?)$/)) {
					self.radius = (RegExp.$2 ? 1000 : 1) * parseInt(RegExp.$1);
				} else {
					self.errors.push('Invalid token "' + token + '"');
				}
			}
		});
		return this;
	},

	computePosition: function (waypoints) {
		for (var j = 0; j < waypoints.length; ++j) {
			if (waypoints[j].id.substr(0, this.name.length).toLowerCase() == this.name) {
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
	TYPES: {race: true, open: true, elap: true, head: true}
});

$.extend(Task.prototype, {

	parse: function (s) {
		var self = this;
		$.each(s.split(/\s+/), function (i, token) {
			if (i == 0) {
				token = token.toLowerCase();
				if (token != 'tsk') {
					self.errors.push('Invalid task header "' + token + '"');
				}
			} else if (i == 1) {
				self.name = token;
			} else if (i == 2) {
				token = token.toLowerCase();
				if (Task.TYPES.hasOwnProperty(token)) {
					this.type = token;
				} else {
					self.errors.push('Invalid task type "' + token + '"');
				}
			} else {
				token = token.toLowerCase();
				/* FIXME handle cs */
				if (token.match(/^(wo)(\d\d)(\d\d)$/)) {
					self.wo = 60 * parseInt(RegExp.$2) + parseInt(RegExp.$3);
				} else if (token.match(/^(wc|so|sl|sc|gc|tc)(\+)?(\d?\d)?(\d\d)$/)) {
					self[RegExp.$1] = (RegExp.$2 ? self[Task.BASE_TIME[RegExp.$1]] : 0) + (RegExp.$3 ? 60 * parseInt(RegExp.$3) : 0) + parseInt(RegExp.$4);
					if (RegExp.$2) {
						var base_time = self[Task.BASE_TIME[RegExp.$1]];
						if (base_time != null) {
							self[RegExp.$1] += base_time;
						} else {
							self.errors.push('Cannot specify relative time "' + token + '" when "' + Task.BASE_TIME[RegExp.$1] + '" is not set');
						}
					}
				} else {
					var turnpoint = new Turnpoint().parse(token);
					$.each(turnpoint.errors, function (j, error) {
						self.errors.push(error);
					});
					self.turnpoints.push(turnpoint);
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
	}

});

$(document).ready(function () {

	var map = new google.maps.Map($('#map').get(0), {
		disableDoubleClickZoom: true,
		mapTypeId: google.maps.MapTypeId.TERRAIN
	});

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
			var path = [];
			$.each(task.turnpoints, function (i, turnpoint) {
				if (turnpoint.position) {
					if (i != 0) {
						var color = null;
						if (turnpoint.attributes.hasOwnProperty('ss')) {
							color = '#00ff00';
						} else if (turnpoint.attributes.hasOwnProperty('es')) {
							color = '#ff0000';
						} else {
							color = '#ffff00';
						}
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
					path.push(turnpoint.position);
					bounds.extend(turnpoint.position);
				}
			});
			if (path.length > 0) {
				var polyline = new google.maps.Polyline({
					map: map,
					path: path,
					strokeColor: '#ffff00',
					strokeOpacity: 1,
					strokeWeight: 2
				});
			}
			map.fitBounds(bounds);
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
