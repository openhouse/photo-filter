# Issues and Resolutions

This file serves as a log of open issues, debugging steps taken, and resolutions. It's intended to facilitate collaborative problem-solving and prevent redundant efforts.

---

## Issue 2: `photos.json` Not Found After Running Python Script

**Opened By:** [Your Name] on Oct 25, 2024

**Description:**

When attempting to fetch photos for an album, the application throws an error stating that `photos.json` is not found at the expected path. The Python script seems to execute and prints output to the console, but the JSON file is not created.

**Symptoms:**

- Error message: `Expected output not found at /path/to/photos.json`
- The Python script's output appears in the console instead of being written to a file.
- The application fails to render the photos page for the selected album.

**Steps Taken:**

1. Reviewed the `runPythonScript` function in `utils/run-python-script.js`.
2. Noted that the function does not capture the `stdout` from the Python script.
3. Checked the `execCommand` function in `utils/exec-command.js` and observed that `stdio: "inherit"` is used, which doesn't capture `stdout`.
4. Realized that in the previous implementation, `stdout` was captured and written to the output file.

**Resolution:**

- Modified `execCommand` to capture `stdout` and `stderr` instead of inheriting the parent's stdio.
- Updated `runPythonScript` to write the captured `stdout` to the specified `outputPath`.
- Tested the changes to confirm that `photos.json` is now correctly created and the application functions as expected.

**Status:** Resolved on Oct 25, 2024

**Comments:**

- Ensure that when executing external scripts that output data, the application captures and handles that output appropriately.
- Remember to adjust utility functions accordingly when refactoring code to prevent breaking existing functionality.

---

## Issue 3: TypeError When Destructuring `stdout` in `runPythonScript`

**Opened By:** Jamie on Oct 25, 2024

**Description:**

After updating `run-python-script.js` to use `execAsync`, an error occurs:

```
TypeError: Cannot destructure property 'stdout' of '(intermediate value)' as it is undefined.
```

**Symptoms:**

- The application fails to fetch photos for an album.
- The error points to line 14 in `run-python-script.js`.
- `stdout` and `stderr` are undefined.

**Steps Taken:**

1. Reviewed the implementation of `runPythonScript` and noted the destructuring of `stdout` and `stderr`.
2. Suspected that `execAsync` might not be returning the expected object.
3. Considered the possibility of compatibility issues with `promisify(exec)`.

**Resolution:**

- Modified `runPythonScript` to first assign the result of `execAsync` to a variable before destructuring.
- Provided an alternative implementation using the callback pattern with `exec`.
- Ensured that the function handles errors and outputs correctly.
- Tested the updated function and confirmed that the issue is resolved.

**Status:** Resolved on Oct 25, 2024

**Comments:**

- Be cautious when destructuring objects that might be undefined.
- Always handle potential errors when working with asynchronous functions.

---

## Issue 4: ENOENT Errors When Serving Images Due to Filename Mismatch

**Opened By:** Jamie on Oct 25, 2024

**Description:**

When attempting to view photos in an album, the application throws `ENOENT` errors indicating that image files are not found. The server expects images with filenames matching `this.filename` from `photos.json`, but the actual exported images have different filenames.

**Symptoms:**

- Error messages like: `Error: ENOENT: no such file or directory, stat '/path/to/image'`
- Images not displayed on the photos page.
- Exported images have filenames like `IMG_3986-h4xPSuYPku8ThzcomRA5tq.HEIC` instead of the expected `IMG_3986.HEIC`.

**Steps Taken:**

1. Reviewed the `runOsxphotosExportImages` function in `get-photos-by-album.js`.
2. Noted that the `--filename` parameter in the `osxphotos` command was set to `{original_name}-{shortuuid}`, causing filenames to include a random short UUID.
3. Compared the filenames in `photos.json` with the actual exported filenames and identified the mismatch.
4. Considered adjusting either the export command or the template to align the filenames.

**Resolution:**

- Modified the `osxphotos` export command to use `--filename "{filename}"`, ensuring that exported images have filenames matching `this.filename` in `photos.json`.
- Updated `get-photos-by-album.js` accordingly.
- Tested the application and confirmed that the images are now displayed correctly.

**Status:** Resolved on Oct 25, 2024

**Comments:**

- When exporting images, ensure that the filenames align with how the application expects to reference them.
- Consider potential filename conflicts if multiple images share the same name; in such cases, additional uniqueness may be necessary.

---

## Issue 5: Image Serving Errors Due to Filename Mismatch with `{original_name}-{shortuuid}`

**Opened By:** Jamie on Oct 25, 2024

**Description:**

Images were not loading because the filenames in `photos.json` didn't match the exported image filenames, which use the `{original_name}-{shortuuid}` template.

**Resolution:**

- Modified `export_photos_in_album.py` to include `shortuuid`.
- Updated `index.hbs` to construct image filenames using `original_filename` and `shortuuid`.
- Adjusted `server.js` to dynamically find the image file regardless of extension.

**Status:** Resolved on Oct 25, 2024
