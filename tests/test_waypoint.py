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

    def test_formatgeo(self):
        lines = [
            '$FormatGEO',
            'A01095    N 42 42 46.98    W 006 26 10.68   954  A01095']
        fc = waypoint.feature_collection(lines, debug=True)
        self.assertEqual(fc['type'], 'FeatureCollection')
        self.assertEqual(fc['features'][0]['type'], 'Feature')
        self.assertEqual(fc['features'][0]['geometry']['type'], 'Point')
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][0], -6.4363000)
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][1], 42.7130500)
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][2], 954.0)
        self.assertEqual(fc['features'][0]['properties']['id'], 'A01095')
        self.assertEqual(fc['features'][0]['properties']['description'], 'A01095')
        self.assertEqual(fc['properties']['format'], 'formatgeo')
        self.assertEqual(fc['properties']['errors'], [])

    def test_seeyou(self):
        lines = [
            'Title,Code,Country,Latitude,Longitude,Elevation,Style,Direction,Length,Frequency,Description',
            '"T01",T01068,,4606.633N,01343.667E,680.0m,1,,,,']
        fc = waypoint.feature_collection(lines, debug=True)
        self.assertEqual(fc['properties']['errors'], [])
        self.assertEqual(fc['type'], 'FeatureCollection')
        self.assertEqual(fc['features'][0]['type'], 'Feature')
        self.assertEqual(fc['features'][0]['geometry']['type'], 'Point')
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][0], 13.7277833)
        self.assertAlmostEqual(fc['features'][0]['geometry']['coordinates'][1], 46.1105500)
        self.assertEqual(fc['features'][0]['geometry']['coordinates'][2], 680.0)
        self.assertEqual(fc['features'][0]['properties']['id'], 'T01068')
        self.assertEqual(fc['features'][0]['properties']['description'], '')
        self.assertEqual(fc['properties']['format'], 'seeyou')
        self.assertEqual(fc['properties']['errors'], [])

    def test_oziexplorer(self):
        lines = [
            'OziExplorer Waypoint File Version 1.0',
            'WGS 84',
            'Reserved 2',
            'Reserved 3',
            '   1,A01062        ,  46.131761,   6.522414,36674.82502, 0, 1, 3, 0, 65535,ATTERO MIEUSSY                          , 0, 0, 0 , 2027',
            ' 185,TMA607 ,  47.900000,   6.416667,37404.69450,  0, 1, 3, 0, 16711680,BALE TMA6  NO    , 0, 0, 0, -777, 6, 0,17']
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
        self.assertEqual(fc['features'][1]['type'], 'Feature')
        self.assertEqual(fc['features'][1]['geometry']['type'], 'Point')
        self.assertEqual(fc['features'][1]['geometry']['coordinates'][0], 6.416667)
        self.assertEqual(fc['features'][1]['geometry']['coordinates'][1], 47.900000)
        self.assertEqual(len(fc['features'][1]['geometry']['coordinates']), 2)
        self.assertEqual(fc['features'][1]['properties']['id'], 'TMA607')
        self.assertEqual(fc['features'][1]['properties']['color'], '0000ff')
        self.assertEqual(fc['features'][1]['properties']['description'], 'BALE TMA6  NO')
        self.assertEqual(fc['properties']['format'], 'oziexplorer')



if __name__ == '__main__':
    unittest.main()
