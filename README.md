Waypoint Viewer  Google Maps/Google AppEngine waypoint viewer
=============================================================

Waypoint Viewer is designed to make it very easy to present waypoint files and
tasks, used for paragliding competitions, in Google Maps.  There is nothing to
install on your webserver, just link to <http://waypointviewer.appspot.com/>
specifying a link to the waypoints file hosted on your server.

Waypoint examples:

* [British Open Slovenia 2010](http://waypointviewer.appspot.com/?title=British+Open+Slovenia+2010&wpt=http://www.slovenia-pgopen.com/downloads/Kobarid_Lijak.cup)
* [Balises Vosges](http://waypointviewer.appspot.com/?title=Balises+Vosges&wpt=http://lavl.free.fr/documents/Balises-Vosges.wpt&kml=http://lavl.free.fr/documents/EspaceAerienVosges.kml)
* [French Championships 2010](http://waypointviewer.appspot.com/?title=French+Championships+2010&wpt=http://parapente.ffvl.fr/compet/1405/balises)

Task examples:

* [French Championships 2010 Task 1](http://waypointviewer.appspot.com/?title=French+Championships+2010&wpt=http://parapente.ffvl.fr/compet/1405/balises&tsk=T1.1+RACE+D01+B45.SS.R12K+B45+B88+B01+B75+B70+A02.ES+A02.R200)
* [Paragliding World Cup Colombia 2011 Task 1](http://waypointviewer.appspot.com/?title=Paragliding+World+Cup+Colombia+2011&wpt=http://www.pottyplace.com/colombia.wpt&tsk=T1.1+RACE+D01+B76.SS.R10K+B21.R1K+B74.R4K+A04.ES.R1K+A04.R200)
* [Paragliding World Cup Colombia 2011 Task 2](http://waypointviewer.appspot.com/?title=Paragliding+World+Cup+Colombia+2011&wpt=http://www.pottyplace.com/colombia.wpt&tsk=T1.2+RACE+D01+B58.SS.R30K+B58.R3K+B47.R3K+B17.R3K+A03.ES.R1K+A03.R200)

Waypoint Viewer accepts four parameters in the query string:

### `wpt=http://...`

specificies the URL of the waypoint file, this must always be present.
Waypoint Viewer understands OziExplorer, CompeGPS, FormatGEO and SeeYou
waypoint files.

### `title=title...`

specifies an optional title for the webpage.  It is recommended that you
include this.

### `logo=http://...`

specifies an optional logo that is displayed in the bottom left corner of the
map.

### `kml=http://...`

specifies the URL of a KML file that is overlaid on the map.  This is useful
for showing airspace and other points of interest.

### `tsk=task...`

specificies the competition task.  This is simply a list of turnpoints
separated by spaces (`+` or `%20` when URL encoded).  Each turnpoint can be
followed by `.SS` (to indicate the start of the speed section), `.ES` (to
indicate the end of the speed section), `.R400` (to set the radius in meters),
and/or `.R10K` (to set the radius in kilometers).  For example:

	TASK+RACE+D01+B10.SS.R5K+B10+B20+B30+A01.ES.R1K+A01


Embedding maps in your web pages
--------------------------------

Waypoint Viewer makes it easy to embed waypoint and task maps in your webpages,
using an `<IFRAME>` tag, for example:

	<iframe width="300px" height="300px" src="http://waypointviewer.appspot.com/?title=French+Championships+2010&wpt=http://parapente.ffvl.fr/compet/1405/balises&tsk=T1.1+RACE+D01+B45.SS.R12K+B45+B88+B01+B75+B70+A02.ES+A02.R200"></iframe>


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

