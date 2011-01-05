#    waypoint.py  Waypoint functions
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


import re


def feature_collection(lines, debug=False):
    features = []
    feature_collection_properties = {}
    if debug:
        feature_collection_properties['errors'] = []
    if len(lines) >= 2 and re.match(r'\AG\s+WGS\s+84\s*\Z', lines[0]) and re.match(r'\AU\s+1\s*\Z', lines[1]):
        feature_collection_properties['format'] = 'compegps'
        for line in lines[2:]:
            match = re.match(r'\AW\s+(\S+)\s+A\s+(\d+\.\d+).*([NS])\s+(\d+\.\d+).*([EW])\s+\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(-?\d+(?:\.\d+))(?:\s+(.*))?\Z', line)
            if match:
                coordinates = [float(match.group(4)), float(match.group(2)), float(match.group(6))]
                if match.group(5) == 'W':
                    coordinates[0] = -coordinates[0]
                if match.group(3) == 'S':
                    coordinates[1] = -coordinates[1]
                feature_properties = {'id': match.group(1), 'description': match.group(7)}
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
            if debug:
                feature_collection_properties['errors'].append(line)
    elif len(lines) >= 4 and re.match(r'\AOziExplorer\s+Waypoint\s+File\s+Version\s+\d+\.\d+\s*\Z', lines[0]) and re.match(r'\AWGS\s+84\s*\Z', lines[1]):
        feature_collection_properties['format'] = 'oziexplorer'
        for line in lines[4:]:
            fields = re.split(r'\s*,\s*', line)
            # FIXME should ignore elevation if it is equal to -777
            coordinates = [float(fields[3]), float(fields[2]), 0.3048 * float(fields[14])]
            feature_properties = {'id': fields[1], 'description': re.sub(r'\xd1', ',', fields[10])}
            if fields[9]:
                color = int(fields[9])
                feature_properties['color'] = '%02x%02x%02x' % (color & 0xff, (color >> 8) & 0xff, (color >> 16) & 0xff)
            if len(fields) > 13 and fields[13] and float(fields[13]) > 0.0:
                feature_properties['radius'] = float(fields[13])
            feature = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': coordinates}, 'properties': feature_properties}
            features.append(feature)
    return {'type': 'FeatureCollection', 'features': features, 'properties': feature_collection_properties}


if __name__ == '__main__':
    import json
    import sys
    fc = feature_collection(sys.stdin.readlines(), debug=True)
    print simplejson.dumps(fc, indent=4, sort_keys=True)
