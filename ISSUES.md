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
