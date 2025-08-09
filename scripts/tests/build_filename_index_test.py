import unittest
import sys
from pathlib import Path
import types

# Ensure scripts directory on path and stub osxphotos
scripts_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(scripts_dir))

osxphotos_stub = types.SimpleNamespace(PhotoInfo=object, PhotosDB=object)
sys.modules['osxphotos'] = osxphotos_stub

from build_filename_index import render_key, build_index

class RenderKeyFallbackTest(unittest.TestCase):
    def test_none_str_fallback(self):
        class OldPhoto:
            uuid = "1"
            width = 0
            height = 0
            original_filesize = 0
            has_raw = False

            def render_template(self, template):
                return [template]

        key = render_key(OldPhoto(), "{original_name}", None)
        self.assertEqual(key, "{original_name}")

class QualityTiebreakerTest(unittest.TestCase):
    def test_prefers_higher_quality(self):
        class Photo:
            def __init__(self, uuid, width, height, size, has_raw):
                self.uuid = uuid
                self.width = width
                self.height = height
                self.original_filesize = size
                self.has_raw = has_raw

            def render_template(self, template, none_str=""):
                return ["dup.jpg"]

        p1 = Photo("rawSmall", 100, 100, 1000, True)
        p2 = Photo("jpegLarge", 200, 200, 2000, False)
        db = type("DB", (), {"photos": lambda self: [p1, p2]})()

        index, collisions = build_index(db, "{original_name}", None)
        self.assertEqual(index["dup.jpg"], "jpegLarge")
        self.assertIn("dup.jpg", collisions)
        self.assertEqual(collisions["dup.jpg"], ["rawSmall", "jpegLarge"])

if __name__ == "__main__":
    unittest.main()
