// backend/utils/job-queue.js
// Minimal in-process queue with concurrency and job de-duplication.

export class JobQueue {
  constructor({ concurrency = 1 } = {}) {
    this.concurrency = concurrency;
    this.running = 0;
    this.q = [];
    this.inflight = new Set(); // keys currently queued or running
  }

  enqueue(key, fn) {
    if (this.inflight.has(key)) return; // de-dupe
    this.inflight.add(key);
    this.q.push({ key, fn });
    this.#pump();
  }

  #pump() {
    while (this.running < this.concurrency && this.q.length) {
      const job = this.q.shift();
      this.running++;
      Promise.resolve()
        .then(job.fn)
        .catch((err) => {
          console.error("[queue] job error:", err?.stack || err);
        })
        .finally(() => {
          this.inflight.delete(job.key);
          this.running--;
          this.#pump();
        });
    }
  }
}

export const queue = new JobQueue({
  concurrency: parseInt(process.env.EXPORT_CONCURRENCY || "1", 10),
});
