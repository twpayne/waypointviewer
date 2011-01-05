#    waypointviewer.py  Waypoint Viewer Google Maps/Google AppEngine application
#    Copyright (C) 2011  Tom Payne
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.


from django.utils import simplejson
from google.appengine.api.urlfetch import fetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
import httplib
import os.path
import re


class MainPage(webapp.RequestHandler):

    def get(self):
        template_values = dict((key, self.request.get(key)) for key in ('kml', 'title', 'wpt'))
        path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
        self.response.out.write(template.render(path, template_values))


class WaypointviewerJs(webapp.RequestHandler):

    def get(self):
        template_values = dict((key, self.request.get(key)) for key in ('kml', 'wpt'))
        path = os.path.join(os.path.dirname(__file__), 'templates', 'waypointviewer.js')
        self.response.headers['content-type'] = 'application/javascript'
        self.response.out.write(template.render(path, template_values))


class Wpt2json(webapp.RequestHandler):

    def get(self):
        debug = self.request.get('debug')
        wpt = self.request.get('wpt')
        feature_collection_properties = {}
        feature_collection_properties['wpt'] = wpt
        response = fetch(wpt)
        if debug:
            feature_collection_properties['content'] = response.content
            feature_collection_properties['content_was_truncated'] = response.content_was_truncated
            feature_collection_properties['final_url'] = response.final_url
            headers = dict((key, response.headers[key]) for key in response.headers)
            feature_collection_properties['headers'] = headers
            feature_collection_properties['status_code'] = response.status_code
        lines = response.content.splitlines()
        features = []
        if len(lines) >= 2 and re.match(r'\AG\s+WGS\s+84\s*\Z', lines[0]) and re.match(r'\AU\s+1\s*\Z', lines[1]):
            for line in lines[2:]:
                match = re.match(r'\AW\s+(\S+)\s+A\s+(\d+\.\d+).*([NS])\s+(\d+\.\d+).*([EW])\s+\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(-?\d+(?:\.\d+))(?:\s+(.*))?\Z', line)
                if match:
                    coordinates = [float(match.group(4)), float(match.group(2)), float(match.group(6))]
                    if match.group(5) == 'S':
                        coordinates[0] = -coordinates[0]
                    if match.group(3) == 'W':
                        coordinates[1] = -coordinates[1]
                    feature_properties = {}
                    feature_properties['id'] = match.group(1)
                    feature_properties['description'] = match.group(7)
                    feature = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': coordinates}, 'properties': feature_properties}
                    features.append(feature)
                    continue
                match = re.match('\Aw\s+Waypoint,\d+,-?\d+(?:\.\d+)?,\d+,(\d+),\d+,\d+,[^,]*,(-?\d+(?:\.\d+)?)', line)
                if match and len(features) > 0:
                    feature_properties = features[-1]['properties']
                    color = int(match.group(1))
                    feature_properties['color'] = '%02x%02x%02x' % (color & 0xff, (color >> 8) & 0xff, (color >> 16) & 0xff)
                    radius = float(match.group(2))
                    if radius > 0.0:
                        feature_properties['radius'] = radius
                    continue
        elif len(lines) >= 4 and re.match(r'\AOziExplorer\s+Waypoint\s+File\s+Version\s+\d+\.\d+\s*\Z', lines[0]) and re.match(r'\AWGS\s+84\s*\Z', lines[1]):
            for line in lines[4:]:
                fields = re.split(r'\s*,\s*', line)
                coordinates = [float(fields[3]), float(fields[2]), 0.3048 * float(fields[14])]
                feature_properties = {'id': fields[1], 'description': re.sub(r'\xd1', ',', fields[10])}
                if fields[9]:
                    color = int(fields[9])
                    feature_properties['color'] = '%02x%02x%02x' % (color & 0xff, (color >> 8) & 0xff, (color >> 16) & 0xff)
                if len(fields) > 13 and fields[13]:
                    feature_properties['radius'] = float(fields[13])
                feature = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': coordinates}, 'properties': feature_properties}
                features.append(feature)
        if debug:
            keywords = {'indent': 4, 'sort_keys': True}
        else:
            keywords = {}
        feature_collection = {'type': 'FeatureCollection', 'features': features, 'properties': feature_collection_properties}
        self.response.headers['content-type'] = 'application/json'
        self.response.out.write(simplejson.dumps(feature_collection, **keywords))


application = webapp.WSGIApplication([('/', MainPage), ('/waypointviewer.js', WaypointviewerJs), ('/wpt2json.json', Wpt2json)], debug=True)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
