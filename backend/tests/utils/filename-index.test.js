import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

test('filename collisions values are arrays', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'));
  const stubRoot = path.join(tmp, 'stub');
  const osxphotosDir = path.join(stubRoot, 'osxphotos');
  fs.ensureDirSync(osxphotosDir);
  fs.writeFileSync(
    path.join(osxphotosDir, '__init__.py'),
    `class Photo:\n    def __init__(self, uuid, tpl, w=1, h=1, size=1, raw=False):\n        self.uuid=uuid\n        self.width=w\n        self.height=h\n        self.original_filesize=size\n        self.has_raw=raw\n        self._tpl=tpl\n    def render_template(self, template, none_str=''):\n        return [self._tpl]\n\nclass PhotosDB:\n    def photos(self):\n        return [Photo('1','20000101T000000000000Z-IMG_0001.JPG',2,2), Photo('2','20000101T000000000000Z-IMG_0001.JPG',1,1)]\n`
  );
  const out = path.join(tmp, 'index.json');
  const col = path.join(tmp, 'collisions.json');
  const script = path.resolve('scripts/build_filename_index.py');
  const res = spawnSync('python3', [script, '--output', out, '--collisions', col], {
    env: { ...process.env, PYTHONPATH: stubRoot },
  });
  expect(res.status).toBe(0);
  const collisions = fs.readJsonSync(col);
  const key = '20000101T000000000000Z-IMG_0001.JPG';
  expect(Array.isArray(collisions[key])).toBe(true);
  const index = fs.readJsonSync(out);
  expect(typeof index[key]).toBe('string');
});
