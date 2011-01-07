var kml = '{{ kml|addslashes }}';
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

$(document).ready(function () {

	var map = new google.maps.Map($('#map').get(0), {
		disableDoubleClickZoom: true,
		mapTypeId: google.maps.MapTypeId.TERRAIN
	});

	var bounds = new google.maps.LatLngBounds();

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
