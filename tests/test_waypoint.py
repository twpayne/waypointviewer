import os.path
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import waypoint


class TestFeatureCollection(unittest.TestCase):

    def test_compegps(self):
        lines = [
            'G  WGS 84',
            'U  1',
            'W  Punto_7 A 36.7545386335\xc2N 5.3576058812\xc2W 27-MAR-62 00:00:00 762.000000',
            'w Crossed Square,0,-1.0,16777215,255,1,7,,0.0,']
        fc = waypoint.feature_collection(lines, debug=True)
        self.assertEqual(fc['type'], 'FeatureCollection')
        self.assertEqual(fc['features'][0]['type'], 'Feature')
        self.assertEqual(fc['features'][0]['geometry']['type'], 'Point')
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][0], -5.3576058812)
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][1], 36.7545386335)
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][2], 762.0)
        self.assertEqual(fc['features'][0]['properties']['id'], 'Punto_7')
        self.assertEqual(fc['features'][0]['properties']['color'], 'ff0000')
        self.assertEqual(fc['features'][0]['properties']['description'], None)
        self.assertEqual(fc['properties']['format'], 'compegps')
        self.assertEqual(fc['properties']['errors'], [])
                

    def test_oziexplorer(self):
        lines = [
            'OziExplorer Waypoint File Version 1.0',
            'WGS 84',
            'Reserved 2',
            'Reserved 3',
            '   1,A01062        ,  46.131761,   6.522414,36674.82502, 0, 1, 3, 0, 65535,ATTERO MIEUSSY                          , 0, 0, 0 , 2027']
        fc = waypoint.feature_collection(lines)
        self.assertEqual(fc['type'], 'FeatureCollection')
        self.assertEqual(fc['features'][0]['type'], 'Feature')
        self.assertEqual(fc['features'][0]['geometry']['type'], 'Point')
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][0], 6.522414)
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][1], 46.131761)
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][2], 0.3048 * 2027)
        self.assertEqual(fc['features'][0]['properties']['id'], 'A01062')
        self.assertEqual(fc['features'][0]['properties']['color'], 'ffff00')
        self.assertEqual(fc['features'][0]['properties']['description'], 'ATTERO MIEUSSY')
        self.assertEqual(fc['properties']['format'], 'oziexplorer')



if __name__ == '__main__':
    unittest.main()
