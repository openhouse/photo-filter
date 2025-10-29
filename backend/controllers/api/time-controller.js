// backend/controllers/api/time-controller.js

/**
 * The time index feature has been retired. We keep this stub so that any
 * lingering callers receive an explicit response without triggering the heavy
 * filesystem work that previously occurred during startup.
 */
export async function getTimeIndex(_req, res) {
  return res.status(410).json({
    errors: [{ detail: "The time-index feature has been retired." }],
  });
}
