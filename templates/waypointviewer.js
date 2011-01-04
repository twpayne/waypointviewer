$(document).ready(function(){
	$.getJSON("wpt2json.json?url={{ url }}", function(geojson) {
		var map = new google.maps.Map($('#map').get(0), {
			disableDoubleClickZoom: true,
			mapTypeId: google.maps.MapTypeId.TERRAIN
		});
		var bounds = new google.maps.LatLngBounds(
			new google.maps.LatLng(geojson.bbox[1], geojson.bbox[0]),
			new google.maps.LatLng(geojson.bbox[4], geojson.bbox[3])
		);
		map.fitBounds(bounds);
		google.maps.event.addListener(map, 'dblclick', function () {
			map.fitBounds(bounds);
		});
		$.each(geojson.features, function(i, feature) {
			var color = 'ffff00';
			if (feature.properties.hasOwnProperty('color')) {
				color = feature.properties.color;
			}
			var elevation = 0;
			if (feature.geometry.coordinates.length > 2) {
				elevation = feature.geometry.coordinates[2];
			}
			var radius = 400;
			if (feature.properties.hasOwnProperty('radius')) {
				radius = feature.properties.radius;
			}
			var position = new google.maps.LatLng(
				feature.geometry.coordinates[1],
				feature.geometry.coordinates[0]
			);
			var richMarkerContent = $('#richMarker').clone().attr({id: null}).show();
			richMarkerContent.css('background-color', '#' + color);
			var label = feature.properties.id;
			var match = /^([A-Z][0-9]{2})([0-9]{3})$/.exec(feature.properties.id);
			if (match && 10 * (match[2] - 1) <= elevation && elevation <= 10 * (match[2] + 1)) {
				label = match[1];
			}
			$('#label', richMarkerContent).html(label);
			var marker = new RichMarker({
				anchor: RichMarkerPosition.MIDDLE,
				content: richMarkerContent.get(0),
				flat: true,
				map: map,
				position: position
			});
			var infoWindowContent = $('#infoWindow').clone().attr({id: null}).show();
			$('#id', infoWindowContent).html(feature.properties.id);
			$('#lat', infoWindowContent).html(feature.geometry.coordinates[1]);
			$('#lng', infoWindowContent).html(feature.geometry.coordinates[0]);
			$('#elevation', infoWindowContent).html(elevation);
			if (feature.properties.hasOwnProperty('description')) {
				$('#description', infoWindowContent).html(feature.properties.description);
			}
			$('#radius', infoWindowContent).html(radius);
			$('#color', infoWindowContent).html(color);
			var circle = new google.maps.Circle({
				center: position,
				clickable: false,
				fillColor: color,
				fillOpacity: 0.25,
				map: map,
				radius: radius,
				strokeColor: color,
				strokeOpacity: 1,
				strokeWeight: 1
			});
			var infoWindow = new google.maps.InfoWindow({content: infoWindowContent.get(0)});
			google.maps.event.addListener(marker, 'click', function () {
				infoWindow.open(map, marker);
			});
			google.maps.event.addListener(marker, 'dblclick', function () {
				map.panTo(position);
				map.setZoom(15);
			});
		});
	});
});
