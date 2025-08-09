// backend/utils/sse.js
const clients = new Set();

export function addClient(res) {
  clients.add(res);
  const interval = setInterval(() => {
    try {
      res.write(":ka\n\n");
    } catch {
      /* ignore */
    }
  }, 30000);
  return () => {
    clearInterval(interval);
    clients.delete(res);
  };
}

export function emit(event, payload) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(data);
}
