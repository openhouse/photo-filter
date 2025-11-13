export function getCloneConcurrency() {
  const raw = process.env.PF_CLONE_CONCURRENCY ?? "8";
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}
