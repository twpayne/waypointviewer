/*jslint white: true, onevar: true, undef: true, newcap: true, nomen: true, regexp: true, plusplus: true, bitwise: true, browser: true */
/*global $: false, google: false, self: false, sprintf: false, RichMarker: false, RichMarkerPosition: false, Task: false, Turnpoint: false, Waypoint: false */

var kml = '{{ kml|addslashes }}';
var logo = '{{ logo|addslashes }}';
var tsk = '{{ tsk|addslashes }}';
var wpt = '{{ wpt|addslashes }}';

var computeHeading = google.maps.geometry.spherical.computeHeading;
var computeOffset = google.maps.geometry.spherical.computeOffset;

function formatTime(i) {
	return i ? sprintf('%02d:%02d', i / 60, i % 60) : null;
}

$.extend(Waypoint.prototype, {

	show: function (map) {
		var circle, color, infoWindow, infoWindowContent, label, marker, richMarkerContent;
		richMarkerContent = $('#waypointRichMarkerContent').clone().attr({id: null}).show();
		color = this.color && this.color !== '#000000' ? this.color : '#ffff00';
		label = this.id.match(/^([A-Z][0-9]{2})([0-9]{3})$/) && 10 * (RegExp.$2 - 1) <= this.elevation && this.elevation <= 10 * (RegExp.$2 + 1) ? RegExp.$1 : this.id;
		$('#waypointLabel', richMarkerContent).css('background-color', color).html(label);
		if (this.description) {
			richMarkerContent.attr({title: this.description});
		}
		marker = new RichMarker({
			anchor: RichMarkerPosition.BOTTOM,
			content: richMarkerContent.get(0),
			flat: true,
			map: map,
			position: this.position
		});
		if (this.radius) {
			circle = new google.maps.Circle({
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
		infoWindowContent = $('#waypointInfoWindowContent').clone().attr({id: null}).show();
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
		infoWindow = new google.maps.InfoWindow({content: infoWindowContent.get(0)});
		google.maps.event.addListener(marker, 'click', function () {
			infoWindow.open(map, marker);
		});
	}

});

$.extend(Task.prototype, {

	getTaskBoardContent: function () {
		var count, taskBoardContent, that = this;
		taskBoardContent = $('#taskBoardContent').clone().attr({id: null}).show();
		$('#taskName', taskBoardContent).html(this.name);
		$('#taskDistance', taskBoardContent).html((this.pathLength / 1000).toFixed(1) + 'km');
		$('#taskShortestDistance', taskBoardContent).html((this.shortestPathLength / 1000).toFixed(1) + 'km');
		$('#taskType', taskBoardContent).html(Task.TYPES[this.type]);
		$('#taskWindowOpen', taskBoardContent).html(formatTime(this.windowOpen));
		$('#taskWindowClose', taskBoardContent).html(formatTime(this.windowClose));
		$('#taskStartOpen', taskBoardContent).html(formatTime(this.startOpen));
		$('#taskStartLast', taskBoardContent).html(formatTime(this.startLast));
		$('#taskStartClose', taskBoardContent).html(formatTime(this.startClose));
		$('#taskGoalClose', taskBoardContent).html(formatTime(this.goalClose));
		$('#taskTaskClose', taskBoardContent).html(formatTime(this.taskClose));
		count = 1;
		$.each(this.turnpoints, function (i, turnpoint) {
			var index, turnpointRow;
			turnpointRow = $('#turnpointRow', taskBoardContent).clone().attr({id: null, 'class': i % 2 === 0 ? 'tbl-points-even' : 'tbl-points-odd'}).show();
			if (i === 0) {
				index = 'TO';
			} else if (i === that.turnpoints.length - 1) {
				index = 'GOAL';
				count += 1;
			} else if (turnpoint.attributes.hasOwnProperty('ss')) {
				index = 'SS' + (turnpoint.attributes.hasOwnProperty('exit') ? ' (EXIT)' : '');
			} else if (turnpoint.attributes.hasOwnProperty('es')) {
				index = 'ES';
				count += 1;
			} else {
				index = count;
				count += 1;
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

	show: function (map, radius) {
		var positions, shortestPathOverlay;
		positions = [];
		$.each(this.turnpoints, function (i, turnpoint) {
			var color, heading, infoWindow, overlay, turnpointInfoWindowContent;
			if (i === 0) {
				positions.push(turnpoint.position);
			} else {
				if (turnpoint.position !== positions[positions.length - 1]) {
					positions.push(turnpoint.position);
				}
				if (turnpoint.attributes.hasOwnProperty('ss')) {
					color = '#7fff00';
				} else if (turnpoint.attributes.hasOwnProperty('es')) {
					color = '#ff0000';
				} else {
					color = '#ffff00';
				}
				if (turnpoint.attributes.hasOwnProperty('gl')) {
					heading = computeHeading(turnpoint.position, positions[positions.length - 2]);
					overlay = new google.maps.Polyline({
						map: map,
						path: [
							computeOffset(turnpoint.position, turnpoint.radius, heading - 90, radius),
							computeOffset(turnpoint.position, turnpoint.radius, heading + 90, radius)
						],
						strokeColor: color,
						strokeOpacity: 1,
						strokeWeight: 2
					});
				} else {
					overlay = new google.maps.Circle({
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
				turnpointInfoWindowContent = $('#turnpointInfoWindowContent').clone().attr({id: null}).show();
				$('#turnpointId', turnpointInfoWindowContent).html(turnpoint.id);
				$('#turnpointRadius', turnpointInfoWindowContent).html(turnpoint.radius);
				$('#turnpointLatitude', turnpointInfoWindowContent).html(turnpoint.position.lat());
				$('#turnpointLongitude', turnpointInfoWindowContent).html(turnpoint.position.lng());
				infoWindow = new google.maps.InfoWindow({content: turnpointInfoWindowContent.get(0), position: turnpoint.position});
				google.maps.event.addListener(overlay, 'click', function () {
					infoWindow.open(map);
				});
			}
		});
		shortestPathOverlay = new google.maps.Polyline({
			map: map,
			path: this.shortestPath,
			strokeColor: '#ff7f00',
			strokeOpacity: 1,
			strokeWeight: 2
		});
	}

});

$(function () {
	var fullScreenButton, logoImg, kmlLayer, map, options;
	options = {
		disableDoubleClickZoom: true,
		mapTypeId: google.maps.MapTypeId.TERRAIN,
		streetViewControl: false
	};
	if (top.location !== self.location) {
		$.extend(options, {
			mapTypeControlOptions: {
				style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
			},
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL
			}
		});
	}
	map = new google.maps.Map($('#map').get(0), options);
	if (top.location !== self.location) {
		fullScreenButton = $('#fullScreenButton').clone().attr({id: null}).show().click(function () {
			top.location = self.location.href;
		});
		map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(fullScreenButton.get(0));
	}
	if (logo) {
		logoImg = document.createElement('image');
		logoImg.src = logo;
		map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(logoImg);
	}
	$.getJSON('wpt2json.json?wpt=' + wpt, function (geojson) {
		var bounds, infoWindow, task, taskBoardButton, waypoints;
		waypoints = $.map(geojson.features, function (feature, i) {
			return new Waypoint(feature);
		});
		if (tsk) {
			task = new Task().parse('tsk ' + tsk, waypoints, 6371000);
			task.show(map);
			infoWindow = new google.maps.InfoWindow({content: task.getTaskBoardContent().get(0)});
			taskBoardButton = $('#taskBoardButton').clone().attr({id: null}).show().click(function () {
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
		kmlLayer = new google.maps.KmlLayer(kml, {
			map: map,
			preserveViewport: true
		});
	}
});
