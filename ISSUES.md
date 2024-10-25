# Issues and Resolutions

This file serves as a log of open issues, debugging steps taken, and resolutions. It's intended to facilitate collaborative problem-solving and prevent redundant efforts.

---

## Issue 2: `photos.json` Not Found After Running Python Script

**Opened By:** [Your Name] on Oct 25, 2024

**Status:** **Pending Confirmation**

**Description:**

When attempting to fetch photos for an album, the application throws an error stating that `photos.json` is not found at the expected path. The Python script seems to execute and prints output to the console, but the JSON file is not created.

**Symptoms:**

- Error message: `Expected output not found at /path/to/photos.json`
- The Python script's output appears in the console instead of being written to a file.
- The application fails to render the photos page for the selected album.

**Assumptions:**

- The Python script is correctly generating the output but not writing it to a file.
- The `execCommand` function might not be capturing `stdout` properly.

**Steps Taken:**

1. Reviewed the `runPythonScript` function in `utils/run-python-script.js`.
2. Noted that the function does not capture the `stdout` from the Python script.
3. Checked the `execCommand` function in `utils/exec-command.js` and observed that `stdio: "inherit"` is used, which doesn't capture `stdout`.
4. Realized that in the previous implementation, `stdout` was captured and written to the output file.
5. Modified `execCommand` to capture `stdout` and `stderr` instead of inheriting the parent's stdio.
6. Updated `runPythonScript` to write the captured `stdout` to the specified `outputPath`.
7. Tested the changes to confirm that `photos.json` is now correctly created and the application functions as expected.

**Resolution:**

- Successfully captured `stdout` and wrote the Python script's output to `photos.json`.
- The application now finds `photos.json` and renders the photos page correctly.

**Inline Reply:**
Using `exec` instead of `spawn` when running subprocesses like `osxphotos` can ensure consistent handling of `stdout` and `stderr`. Modifying `execCommand` to capture and write `stdout` directly to the file path specified for `photos.json` should address missing output issues. (Sources: [GitHub Discussions on osxphotos](6), [osxphotos CLI Documentation](7))

**Questions to Consider:**

- Are there other scripts where output capturing needs to be adjusted?
- Could this issue recur if we refactor `execCommand` or similar utilities?

**Additional Comments:**

- **Best Practice Suggestion:** When executing external scripts, explicitly capturing and processing `stdout` and `stderr` helps maintain consistent output handling.
- **Monitoring:** Keep an eye on other utility functions to ensure they handle outputs correctly.
- **Resolutions as Provisional Truths:** This solution works under current understanding but should be revisited if similar issues arise.

---

## Issue 3: TypeError When Destructuring `stdout` in `runPythonScript`

**Opened By:** Jamie on Oct 25, 2024

**Status:** **Pending Confirmation**

**Description:**

After updating `run-python-script.js` to use `execAsync`, an error occurs:

```

TypeError: Cannot destructure property 'stdout' of '(intermediate value)' as it is undefined.

```

**Symptoms:**

- The application fails to fetch photos for an album.
- The error points to line 14 in `run-python-script.js`.
- `stdout` and `stderr` are undefined.

**Assumptions:**

- `execAsync` might not be returning an object with `stdout` and `stderr`.
- There might be compatibility issues with `promisify(exec)`.

**Steps Taken:**

1. Reviewed the implementation of `runPythonScript` and noted the destructuring of `stdout` and `stderr`.
2. Suspected that `execAsync` might not be returning the expected object.
3. Considered the possibility of compatibility issues with `promisify(exec)`.
4. Modified `runPythonScript` to first assign the result of `execAsync` to a variable before destructuring.
5. Provided an alternative implementation using the callback pattern with `exec`.
6. Ensured that the function handles errors and outputs correctly.
7. Tested the updated function and confirmed that the issue is resolved.

**Resolution:**

- Adjusted `runPythonScript` to correctly handle the result of `execAsync`.
- The application now successfully fetches photos without errors.

**Inline Reply:**
Assigning async results to variables before destructuring simplifies error handling and avoids issues with undefined properties when using `promisify(exec)`. This adjustment should prevent `stdout` from being `undefined` under similar conditions in the future. (Source: [GitHub Issues](6))

**Questions to Consider:**

- Should we standardize how we handle asynchronous `exec` calls in our utilities?
- Are there other places where destructuring might cause issues due to undefined properties?

**Additional Comments:**

- **Insight from Research:** Using destructuring with undefined properties can lead to errors if async results are not as expected.
- **Best Practice Reminder:** Assign async results to variables before destructuring to simplify error handling.
- **Resolutions as Provisional Truths:** This fix works currently, but further review may be necessary if similar issues arise.

---

## Issue 4: ENOENT Errors When Serving Images Due to Filename Mismatch

**Opened By:** Jamie on Oct 25, 2024

**Status:** **Resolved**

**Description:**

When attempting to view photos in an album, the application throws `ENOENT` errors indicating that image files are not found. The server expects images with filenames matching `this.filename` from `photos.json`, but the actual exported images have different filenames.

**Symptoms:**

- Error messages like: `Error: ENOENT: no such file or directory, stat '/path/to/image'`
- Images not displayed on the photos page.
- Exported images have filenames like `IMG_3986-h4xPSuYPku8ThzcomRA5tq.HEIC` instead of the expected `IMG_3986.HEIC`.

**Assumptions:**

- The filenames in `photos.json` and the exported images do not match due to differing templates.
- Adjusting the `--filename` parameter in the `osxphotos` command might resolve the mismatch.

**Steps Taken:**

1. Reviewed the `runOsxphotosExportImages` function in `get-photos-by-album.js`.
2. Noted that the `--filename` parameter in the `osxphotos` command was set to `{original_name}-{shortuuid}`, causing filenames to include a random short UUID.
3. Compared the filenames in `photos.json` with the actual exported filenames and identified the mismatch.
4. Attempted to use `--filename "{filename}"` but encountered an error indicating `{filename}` is not a valid template field.
5. Recognized the need to find a valid template field that matches the data in `photos.json`.
6. Replaced `{filename}` with `{original_name}` in the export command.
7. Updated the application code and templates accordingly to ensure filenames match.
8. Deleted existing images to prevent conflicts and re-exported them.
9. Tested the application and confirmed that images are now displayed correctly.

**Resolution:**

- Successfully exported images using `{original_name}`.
- The application now displays images correctly without errors.

**Inline Reply:**
Using `{original_name}` instead of `{shortuuid}` in the export command eliminates mismatch issues and simplifies filename handling. For consistency, avoid templates that add uniqueness unless necessary. (Sources: [osxphotos Documentation](8), [GitHub Discussions](6))

**Questions to Consider:**

- Are there other discrepancies between the data in `photos.json` and the exported files?
- How can we ensure that the templates used in the export command align with the data fields available in `photos.json`?

**Additional Comments:**

- **Insight:** Aligning exported filenames carefully is crucial to avoid mismatches.
- **Consideration:** Using `{original_name}` simplifies the process and reduces complexity.
- **Resolutions as Provisional Truths:** This solution is effective now, but we should monitor for any further inconsistencies.

---

## Issue 5: Image Serving Errors Due to Filename Mismatch with `{original_name}-{shortuuid}`

**Opened By:** Jamie on Oct 25, 2024

**Status:** **Resolved**

**Description:**

Images were not loading because the filenames in `photos.json` didn't match the exported image filenames, which use the `{original_name}-{shortuuid}` template.

**Assumptions:**

- Including `{shortuuid}` in the filenames introduces a mismatch with `photos.json`.
- Modifying either the export process or the data in `photos.json` to include `shortuuid` may resolve the issue.

**Steps Taken:**

1. Considered modifying `export_photos_in_album.py` to include `shortuuid` in the `photos.json` data.
2. Evaluated the necessity of including `{shortuuid}` in filenames.
3. Decided to simplify by using `{original_name}` only in the export command.
4. Updated `get-photos-by-album.js` to use `{original_name}`.
5. Adjusted `index.hbs` to reflect the change in image filenames.
6. Deleted existing images and re-exported them.
7. Tested the application to confirm images display correctly.

**Resolution:**

- Simplified filenames by removing `{shortuuid}` and using `{original_name}`.
- The application successfully serves the images with matching filenames.

**Inline Reply:**
Simplifying export filenames by removing `{shortuuid}` resolves

export with `{original_name}` ensures filenames align with `photos.json`, reducing complexity and potential mismatches. Checking for filename collisions can further prevent issues. (Sources: [GitHub Discussions on osxphotos](9), [osxphotos CLI Documentation](8))

**Questions to Consider:**

- Could there be cases where filenames might collide, necessitating unique identifiers?
- How do we handle images with identical original filenames?

**Additional Comments:**

- **Suggested Practice:** Simplifying filenames reduces complexity and potential mismatches.
- **Consideration:** Implement checks for filename collisions and handle them appropriately.
- **Resolutions as Provisional Truths:** This works currently, but we should be cautious of potential filename conflicts.

---

## Issue 6: Invalid Template Field `{filename}` in `osxphotos` Export Command

**Opened By:** Jamie on Oct 25, 2024

**Status:** **Pending Confirmation**

**Description:**

When attempting to export images using `osxphotos`, the command fails with an error:

```

Error: Invalid value for '--filename': Template '{filename}' contains unknown field(s): ['filename']

```

**Symptoms:**

- Images are not exported.
- Application cannot display images due to missing files.
- The error indicates that `{filename}` is not a valid template field.

**Assumptions:**

- The `{filename}` template field was valid in previous versions of `osxphotos`.
- Replacing `{filename}` with `{original_name}` will fix the issue.

**Steps Taken:**

1. Verified that `{filename}` is not listed in the current `osxphotos` documentation.
2. Identified `{name}` and `{original_name}` as the appropriate template fields to use.
3. Tested the `osxphotos` command manually with `{original_name}` and confirmed it works.
4. Updated `get-photos-by-album.js` to use `{original_name}` in the `--filename` parameter.
5. Adjusted `index.hbs` to reflect the change in the image filenames.
6. Deleted existing images to prevent conflicts and re-exported them.
7. Tested the application to confirm that images are now displayed correctly.

**Resolution:**

- Successfully exported images using `{original_name}`.
- Images are now properly displayed in the application.

**Inline Reply:**
Updating the export command to use `{original_name}` aligns with current `osxphotos` template field support, as `{filename}` is no longer valid. Reviewing `osxphotos` documentation regularly can prevent similar issues. (Sources: [osxphotos GitHub](8), [CLI Documentation](7))

**Questions to Consider:**

- Do we need to audit other `osxphotos` commands for deprecated or invalid template fields?
- Should we implement a version check or dependency management for `osxphotos` during setup?

**Additional Comments:**

- **Monitoring:** We'll monitor the application for any related issues.
- **Documentation:** Emphasize the importance of referring to updated external tool documentation.
- **Best Practice:** When integrating with third-party tools, ensure that template fields or parameters used are supported in the current version.
- **Resolutions as Provisional Truths:** This fix is effective now but should be revisited if similar issues occur.

---

## Issue 7: `osxphotos` Command Fails When Executed Programmatically

**Opened By:** Jamie on Oct 25, 2024

**Status:** **Open**

**Description:**

When running the `osxphotos` export command programmatically from the Node.js application, the images are not exported, and the images directory remains empty. However, running the same command manually in the terminal works correctly, and the images are exported as expected.

**Symptoms:**

- The images directory remains empty after running the application.
- No error messages are displayed in the console when the application is running.
- Manually executing the same `osxphotos` command in the terminal successfully exports the images.

**Assumptions:**

- There might be permission issues when running `osxphotos` from within the Node.js application.
- The `execCommand` function may not be capturing and displaying errors from the command execution.
- Environment variables or user contexts might differ between the terminal session and the Node.js process.

**Steps Taken:**

1. Observed that the images directory is empty when the export command is executed programmatically.
2. Confirmed that manually running the export command in the terminal exports the images correctly.
3. Noted that `execCommand` uses `spawn` with `stdio: "inherit"`, which doesn't capture `stdout` and `stderr`.
4. Decided to modify `execCommand` to use `exec` instead of `spawn` to capture the output and errors.
5. Prepared to update `execCommand.js` to capture `stdout` and `stderr`.

**Resolution:**

- **Pending:** Update `execCommand.js` to capture output and errors, allowing us to see any error messages produced by `osxphotos` when executed from the Node.js application.

**Inline Reply:**
Programmatically executing `osxphotos` requires correct permissions and consistent environment variables. Using `exec` instead of `spawn` can help capture output effectively, but environment discrepancies may still require further investigation. (Sources: [GitHub Issues](9), [CLI Documentation](8))

**Questions to Consider:**

- Are there permission issues preventing `osxphotos` from accessing the Photos library when run programmatically?
- Does the Node.js process have the necessary environment variables and user context?
- Will capturing the error output provide insights into the underlying issue?

**Additional Comments:**

- **Resolutions as Provisional Truths:** Updating `execCommand` is a step towards diagnosing the issue but may not fully resolve it.
- **Monitoring:** After making the changes, we'll need to observe any error messages to further understand the problem.

---
