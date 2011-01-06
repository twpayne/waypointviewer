Waypoint Viewer  Google Maps/Google AppEngine waypoint viewer
=============================================================

Copyright (C) Tom Payne, 2011


Introduction
------------

Waypoint Viewer is designed to make it very easy to present waypoint files,
e.g. as used for paragliding competitions, in Google Maps.  There is nothing to
install on your webserver, just link to http://waypointviewer.appspot.com/
specifying a link to the waypoints file hosted on your server.

Examples:
- [British Open Slovenia 2010](http://waypointviewer.appspot.com/?title=British%20Open%20Slovenia%202010&wpt=http://www.slovenia-pgopen.com/downloads/Kobarid_Lijak.cup)
- [Balises Vosges](http://waypointviewer.appspot.com/?title=Balises%20Vosges&wpt=http://lavl.free.fr/documents/Balises-Vosges.wpt&kml=http://lavl.free.fr/documents/EspaceAerienVosges.kml)
- [French Championships 2010](http://waypointviewer.appspot.com/?title=French%20Championships%202010&wpt=http://parapente.ffvl.fr/compet/1405/balises)

Waypoint Viewer accepts three parameters in the query string:

### `wpt=http://...`

specificies the URL of the waypoint file, this must always be present.
Waypoint Viewer understands OziExplorer, CompeGPS, FormatGEO and SeeYou
waypoint files.

### `title=title...`

specifies an optional title for the webpage.  It is recommended that you
include this.

### `kml=http://...`

specifies the URL of a KML file that is overlaid on the map.  This is useful
for showing airspace and other points of interest.

Copyright
---------

Copyright (C) 2011  Tom Payne

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.

