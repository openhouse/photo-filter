// frontend/photo-filter-frontend/app/services/album-prep.js

import Service from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import fetch from 'fetch';
import config from 'photo-filter-frontend/config/environment';

const TERMINAL_STATUSES = new Set(['ready', 'skipped-empty', 'error']);
const RETRIGGER_DELAY_MS = 5000;
const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;

function parseRetryAfter(value) {
  if (!value) {
    return null;
  }
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.max(1, Math.round(numeric));
  }
  const asDate = Date.parse(value);
  if (Number.isFinite(asDate)) {
    const seconds = Math.ceil((asDate - Date.now()) / 1000);
    return seconds > 0 ? seconds : null;
  }
  return null;
}

export default class AlbumPrepService extends Service {
  #prepareInFlight = new Map();

  get apiHost() {
    return config.APP.apiHost;
  }

  async fetchStatus(albumUUID) {
    if (!albumUUID) {
      return { status: 'error', errorMessage: 'Missing album identifier' };
    }

    const url = `${this.apiHost}/api/albums/${albumUUID}/status`;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        return {
          status: 'error',
          errorMessage: `Status request failed (${response.status})`,
        };
      }
      const json = await response.json();
      if (!json || typeof json !== 'object') {
        return { status: 'pending' };
      }
      const headerRetry = parseRetryAfter(response.headers.get('Retry-After'));
      if (headerRetry) {
        json.retryAfterSeconds = headerRetry;
      } else if (Number.isFinite(json.retryAfterSeconds)) {
        json.retryAfterSeconds = Math.max(
          1,
          Math.round(json.retryAfterSeconds),
        );
      }
      return json;
    } catch (error) {
      return { status: 'error', errorMessage: error.message };
    }
  }

  async startPreparation(albumUUID) {
    if (!albumUUID) {
      return;
    }
    let inflight = this.#prepareInFlight.get(albumUUID);
    if (inflight) {
      return inflight;
    }

    const url = `${this.apiHost}/api/albums/${albumUUID}/prepare`;
    inflight = fetch(url, {
      method: 'POST',
    })
      .catch((error) => {
        console.error(`[album-prep] failed to start album ${albumUUID}`, error);
      })
      .finally(() => {
        this.#prepareInFlight.delete(albumUUID);
      });

    this.#prepareInFlight.set(albumUUID, inflight);
    return inflight;
  }

  @task({ restartable: true })
  *ensurePrepared(albumUUID) {
    if (!albumUUID) {
      return { status: 'error', errorMessage: 'Missing album identifier' };
    }

    let status = yield this.fetchStatus(albumUUID);
    if (TERMINAL_STATUSES.has(status?.status)) {
      return status;
    }

    let lastPrepareAt = 0;
    if (this.#shouldTriggerPrepare(status?.status)) {
      yield this.startPreparation(albumUUID);
      lastPrepareAt = Date.now();
    }

    let delay = MIN_DELAY_MS;
    while (true) {
      const waitMs = this.#nextDelay(delay, status);
      yield timeout(waitMs);
      delay = waitMs;
      status = yield this.fetchStatus(albumUUID);
      if (TERMINAL_STATUSES.has(status?.status)) {
        return status;
      }
      if (
        this.#shouldTriggerPrepare(status?.status) &&
        Date.now() - lastPrepareAt > RETRIGGER_DELAY_MS
      ) {
        yield this.startPreparation(albumUUID);
        lastPrepareAt = Date.now();
      }
    }
  }

  #shouldTriggerPrepare(status) {
    return (
      !status ||
      status === 'pending' ||
      status === 'needs-prep' ||
      status === 'stuck'
    );
  }

  #nextDelay(currentDelay, status) {
    const retryAfterSeconds = Number(status?.retryAfterSeconds);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return this.#clampDelay(retryAfterSeconds * 1000);
    }
    const scaled = currentDelay ? currentDelay * 1.5 : MIN_DELAY_MS;
    return this.#clampDelay(scaled);
  }

  #clampDelay(value) {
    const ms = Math.round(value);
    return Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, ms || MIN_DELAY_MS));
  }
}
