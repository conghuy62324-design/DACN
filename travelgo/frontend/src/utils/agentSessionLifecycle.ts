/** Tab-local cleanup hint only. Never stores JWT/chat/slots/conversation IDs and
 * never travels to the backend as ownership/proof. */
interface HintStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const key = 'travelgo_agent_g2_participation';
const browserStorage = () => { try { return typeof sessionStorage === 'undefined' ? undefined : sessionStorage; } catch { return undefined; } };
export class AgentSessionLifecycle {
  private participants = new Map<string, Set<() => void>>();
  private pending = new Map<string, Promise<{ attempted: boolean; confirmed: boolean }>>();
  private memory?: { owner: string; until: number; stamp: string };
  constructor(private readonly storage: () => HintStorage | undefined = browserStorage) {}
  private hint() {
    try { const value = this.storage()?.getItem(key); if (value) { const h = JSON.parse(value); if (typeof h.owner === 'string' && typeof h.stamp === 'string' && Number.isFinite(h.until)) return h as NonNullable<typeof this.memory>; } } catch { /* Memory-only fallback. */ }
    return this.memory;
  }
  mark(owner: string) {
    this.memory = { owner, until: Date.now() + 900000, stamp: globalThis.crypto.randomUUID() };
    try { this.storage()?.setItem(key, JSON.stringify(this.memory)); } catch { /* Hint persistence is optional. */ }
  }
  mayHaveContext(owner: string) { const h = this.hint(); return !!h && h.owner === owner && h.until > Date.now(); }
  private clear(owner: string, stamp?: string) {
    const h = this.hint(); if (!h || h.owner !== owner || stamp && h.stamp !== stamp) return;
    this.memory = undefined; try { this.storage()?.removeItem(key); } catch { /* No private content retained. */ }
  }
  confirmedAll(owner: string) { this.clear(owner); }
  register(token: string, fence: () => void) {
    const set = this.participants.get(token) || new Set<() => void>(); set.add(fence); this.participants.set(token, set);
    return () => { set.delete(fence); if (!set.size) this.participants.delete(token); };
  }
  fence(token: string | null) { if (token) for (const work of this.participants.get(token) || []) work(); }
  /** Initiate cleanup using captured credentials, then callers can clear local
   * auth immediately. JWT remains valid server-side; this is not revocation. */
  authExit(token: string | null, owner: string | undefined, revoke: (signal: AbortSignal) => Promise<unknown>) {
    this.fence(token);
    if (!token || !owner || !this.mayHaveContext(owner)) return Promise.resolve({ attempted: false, confirmed: false });
    const existing = this.pending.get(token); if (existing) return existing;
    const stamp = this.hint()?.stamp, controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>, expired = false;
    const deadline = new Promise<{ attempted: boolean; confirmed: boolean }>(resolve => {
      timer = setTimeout(() => { expired = true; controller.abort(); resolve({ attempted: true, confirmed: false }); }, 3000);
    });
    const work = Promise.resolve().then(() => revoke(controller.signal)).then(() => {
      if (!expired) this.clear(owner, stamp);
      return { attempted: true, confirmed: !expired };
    }, () => ({ attempted: true, confirmed: false }));
    const result = Promise.race([work, deadline]).finally(() => { clearTimeout(timer); this.pending.delete(token); });
    this.pending.set(token, result); return result;
  }
}
export const agentSessions = new AgentSessionLifecycle();
