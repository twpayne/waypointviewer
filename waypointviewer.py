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
from google.appengine.ext.webapp.util import run_wsgi_app
import httplib
import re


class Wpt2json(webapp.RequestHandler):

    def get(self):
        debug = self.request.get('debug')
        url = self.request.get('url')
        feature_collection_properties = {}
        if url:
            feature_collection_properties['url'] = url
            response = fetch(url)
            if debug:
                feature_collection_properties['content'] = response.content
                feature_collection_properties['content_was_truncated'] = response.content_was_truncated
                feature_collection_properties['final_url'] = response.final_url
                headers = dict((key, response.headers[key]) for key in response.headers)
                feature_collection_properties['headers'] = headers
                feature_collection_properties['status_code'] = response.status_code
            lines = response.content.splitlines()
        else:
            lines = []
        features = []
        if len(lines) >= 4 and re.match(r'\AOziExplorer\s+Waypoint\s+File\s+Version\s+\d+\.\d+\s*\Z', lines[0]) and re.match(r'\AWGS\s+84\s*\Z', lines[1]):
            for line in lines[4:]:
                fields = re.split(r'\s*,\s*', line)
                coordinates = [float(fields[3]), float(fields[2]), 0.3048 * float(fields[14])]
                feature_properties = {'id': fields[1], 'description': re.sub(r'\xd1', ',', fields[10])}
                if fields[9]:
                    color = int(fields[9])
                    feature_properties['color'] = '%02x%02x%02x' % (color & 0xff, (color >> 8) & 0xff, (color >> 16) & 0xff)
                if len(fields) > 15 and fields[15]:
                    feature_properties['radius'] = floatval(fields[15])
                feature = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': coordinates}, 'properties': feature_properties}
                features.append(feature)
        if self.request.get('debug'):
            keywords = {'indent': 4, 'sort_keys': True}
        else:
            keywords = {}
        feature_collection = {'type': 'FeatureCollection', 'features': features, 'properties': feature_collection_properties}
        self.response.headers['content-type'] = 'application/json'
        self.response.out.write(simplejson.dumps(feature_collection, **keywords))


application = webapp.WSGIApplication([('/wpt2json.json', Wpt2json)], debug=True)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
