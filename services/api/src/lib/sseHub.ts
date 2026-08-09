export {};

/**
 * SSE Hub — kullanıcı başına Server-Sent Events bağlantılarını yönetir.
 * Tek Railway instance için in-memory pub/sub.
 * Yeni mesaj gelince push() ile frontend'e anlık iletilir.
 */

interface SSEClient {
  res: any;
  connectedAt: number;
}

// userId → Set of connected SSE clients
const clients = new Map<string, Set<SSEClient>>();

export function sseSubscribe(userId: string, res: any): () => void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  const client: SSEClient = { res, connectedAt: Date.now() };
  clients.get(userId)!.add(client);

  // Keep-alive ping her 25 saniyede: proxy timeout'unu önler
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { cleanup(); }
  }, 25_000);

  function cleanup() {
    clearInterval(ping);
    clients.get(userId)?.delete(client);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  }

  return cleanup;
}

export function ssePush(userId: string, event: string, data: unknown): void {
  const userClients = clients.get(userId);
  if (!userClients?.size) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: SSEClient[] = [];

  for (const client of userClients) {
    try {
      client.res.write(payload);
    } catch {
      dead.push(client);
    }
  }
  for (const d of dead) userClients.delete(d);
}

export function sseConnectedCount(): number {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}
