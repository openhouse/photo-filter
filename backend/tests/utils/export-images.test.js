import { jest } from '@jest/globals';
import fs from 'fs-extra';

const execSpy = jest.fn();
jest.unstable_mockModule('../../utils/exec-command.js', () => ({ execCommand: execSpy }));

const { exportByUuids } = await import('../../utils/export-images.js');

describe('exportByUuids', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    execSpy.mockClear();
  });

  it('writes uuid file and calls execCommand', async () => {
    jest.spyOn(fs, 'ensureDir').mockResolvedValue();
    jest.spyOn(fs, 'writeFile').mockResolvedValue();

    await exportByUuids('/bin/osxphotos', '/tmp/images', ['1', '2']);

    expect(fs.ensureDir).toHaveBeenCalledWith('/tmp/images');
    expect(fs.writeFile).toHaveBeenCalled();
    expect(execSpy).toHaveBeenCalled();
    const cmd = execSpy.mock.calls[0][0];
    expect(cmd).toContain('/bin/osxphotos');
    expect(cmd).toContain('/tmp/images');
    expect(cmd).toContain('uuid-from-file');
  });
});
