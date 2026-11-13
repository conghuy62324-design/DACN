import { HttpError } from '../utils/httpError.js';

/** Per-process MVP controls. Bounded memory; no raw messages or credentials stored. */
export class AgentLimits {
  private readonly users = new Map<string, { count: number; until: number }>();
  private active = 0;
  constructor(private readonly perHour = 20, private readonly concurrency = 2,
    private readonly now: () => number = Date.now, private readonly maxUsers = 10000) {}

  consume(userId: string) {
    const now = this.now();
    for (const [id, entry] of this.users) if (entry.until <= now) this.users.delete(id);
    let entry = this.users.get(userId);
    if (!entry) {
      if (this.users.size >= this.maxUsers) throw new HttpError(503, 'Agent đang bận. Vui lòng thử lại sau.', 'AGENT_BUSY');
      entry = { count: 0, until: now + 3600000 }; this.users.set(userId, entry);
    }
    if (entry.count >= this.perHour) throw new HttpError(429, 'Bạn đã đạt giới hạn yêu cầu Agent trong giờ này.', 'AGENT_RATE_LIMITED');
    entry.count++;
  }

  async providerCall<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) throw new HttpError(503, 'Agent đang bận. Vui lòng thử lại sau.', 'AGENT_BUSY');
    this.active++;
    try { return await work(); } finally { this.active--; }
  }
}
