import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';
import fs from 'fs-extra';
import path from 'path';

const exportSpy = jest.fn();
jest.unstable_mockModule('../../../utils/export-images.js', () => ({ exportByUuids: exportSpy }));

const { getPhotosByPersonLibrary } = await import('../../../controllers/api/people-controller.js');

describe('getPhotosByPersonLibrary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    exportSpy.mockClear();
  });

  it('exports missing images grouped by album', async () => {
    jest.spyOn(fs, 'readdir').mockResolvedValue([
      { name: 'album1', isDirectory: () => true },
      { name: 'album2', isDirectory: () => true },
    ]);

    jest.spyOn(fs, 'readJson').mockImplementation(async (p) => {
      if (p.includes('album1')) {
        return [{
          uuid: 'p1',
          original_filename: 'a.jpg',
          date: '2025-05-30T23:35:13.160Z',
          score: { overall: 0.9 },
          persons: ['Alice'],
        }];
      }
      return [{
        uuid: 'p2',
        original_filename: 'b.jpg',
        date: '2025-05-30T23:36:13.160Z',
        score: { overall: 0.8 },
        persons: ['Alice'],
      }];
    });

    jest.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
      if (p.includes(path.join('album1', 'images'))) return true;
      if (p.includes(path.join('album2', 'images'))) return false;
      return true;
    });

    const req = httpMocks.createRequest({ params: { personName: 'Alice' }, query: {} });
    const res = httpMocks.createResponse();

    await getPhotosByPersonLibrary(req, res);

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const call = exportSpy.mock.calls[0];
    expect(call[1]).toContain('album2');
    expect(call[2]).toEqual(['p2']);
  });
});
