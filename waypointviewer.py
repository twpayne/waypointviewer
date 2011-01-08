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
import os.path

import waypoint


class MainPage(webapp.RequestHandler):

    def get(self):
        template_values = dict((key, self.request.get(key)) for key in ('kml', 'title', 'wpt'))
        path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
        self.response.out.write(template.render(path, template_values))


class WaypointviewerJs(webapp.RequestHandler):

    def get(self):
        template_values = dict((key, self.request.get(key)) for key in ('kml', 'wpt'))
        path = os.path.join(os.path.dirname(__file__), 'templates', 'waypointviewer.js')
        self.response.headers['content-type'] = 'text/javascript'
        self.response.out.write(template.render(path, template_values))


class Wpt2json(webapp.RequestHandler):

    def get(self):
        debug = self.request.get('debug')
        wpt = self.request.get('wpt')
        response = fetch(wpt)
        feature_collection = waypoint.feature_collection(response.content.splitlines(), debug=debug)
        if debug:
            feature_collection_properties['content'] = response.content
            feature_collection_properties['content_was_truncated'] = response.content_was_truncated
            feature_collection_properties['final_url'] = response.final_url
            headers = dict((key, response.headers[key]) for key in response.headers)
            feature_collection_properties['headers'] = headers
            feature_collection_properties['status_code'] = response.status_code
            keywords = {'indent': 4, 'sort_keys': True}
        else:
            keywords = {}
        self.response.headers['content-type'] = 'application/json'
        self.response.out.write(simplejson.dumps(feature_collection, **keywords))


application = webapp.WSGIApplication([('/', MainPage), ('/waypointviewer.js', WaypointviewerJs), ('/wpt2json.json', Wpt2json)], debug=True)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
