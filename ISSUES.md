# Issues and Resolutions

This file serves as a log of open issues, debugging steps taken, and resolutions. It's intended to facilitate collaborative problem-solving and prevent redundant efforts.

---

## Issue 1: Images Not Exporting When Running via Node.js

**Opened By:** [Your Name] on Oct 25, 2024

**Description:**

When executing the `osxphotos` export command via the Node.js application, images are not being exported to the expected directory. Running the same command manually in the terminal works correctly.

**Symptoms:**

- No images in the expected directory after running via Node.js.
- `ENOENT` errors when the application tries to access image files.
- No error messages indicating why the export failed when running via Node.js.

**Steps Taken:**

1. Verified that the command executed by the Node.js app matches the one run manually.
2. Suspected permissions issue with macOS requiring explicit permissions for apps accessing user data.
3. Modified the `execCommand` function to use `child_process.spawn` to capture real-time output.
4. Ensured environment variables are passed to the spawned process.
5. Checked for any error messages or prompts from `osxphotos`.

**Resolution:**

- Updated the `execCommand` function to use `spawn` with `stdio: "inherit"` and `shell: true`.
- Granted necessary permissions in macOS for the Node.js process to access the Photos library.
- Confirmed that images are now being exported correctly when running via Node.js.

**Status:** Resolved on Oct 25, 2024

**Comments:**

- Remember to grant necessary permissions when running on a new machine.
- Consider packaging the application for easier permission management in the future.
