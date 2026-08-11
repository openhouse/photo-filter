import { createPeopleIndexService } from "../../services/people-index.js";

const MAX_FILENAMES = 500;
const service = createPeopleIndexService();

function sendError(res, error) {
  const status = error?.statusCode ?? 500;
  return res.status(status).json({
    errors: [
      {
        code: error?.code ?? "PEOPLE_INDEX_ERROR",
        detail: status === 500 ? "Internal Server Error" : error.message,
      },
    ],
  });
}

export async function getPeopleByFilenames(req, res) {
  const filenames = req.body?.filenames;
  if (!Array.isArray(filenames)) {
    return res.status(400).json({
      errors: [
        {
          code: "INVALID_FILENAMES",
          detail: "filenames must be an array",
        },
      ],
    });
  }
  if (filenames.length > MAX_FILENAMES) {
    return res.status(400).json({
      errors: [
        {
          code: "TOO_MANY_FILENAMES",
          detail: `filenames accepts at most ${MAX_FILENAMES} items`,
        },
      ],
    });
  }
  try {
    return res.json(
      await service.resolve(filenames, {
        refresh: req.body?.refresh ?? "verify",
        expectedCorpusSha256: req.body?.expectedCorpusSha256,
      }),
    );
  } catch (error) {
    if ((error?.statusCode ?? 500) >= 500) {
      console.error("Error resolving people index:", error);
    }
    return sendError(res, error);
  }
}

export function getPeopleIndexStatus(_req, res) {
  return res.json({ data: service.status() });
}

export async function refreshPeopleIndex(req, res) {
  const mode = req.body?.refresh ?? "verify";
  try {
    await service.refresh({ mode });
    return res.json({ data: service.status() });
  } catch (error) {
    console.error("Error refreshing people index:", error);
    return sendError(res, error);
  }
}
