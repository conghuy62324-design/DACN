import type { AgentChatRequest, AgentError, AgentMessage, AgentPrivacy, AgentResponse } from '../types/agent';

export interface AgentClient {
  chat(input: AgentChatRequest, signal: AbortSignal): Promise<AgentResponse>;
  privacy(signal: AbortSignal): Promise<AgentPrivacy>;
}
export interface AgentTurn { id: number; question: string; response?: AgentResponse; error?: AgentError }
export interface ConversationState { draft: string; turns: AgentTurn[]; busy: boolean; notice?: AgentPrivacy; declined: boolean }

/** Memory-only controller; server history and rendered turns are deliberately separate. */
export class AgentConversation {
  private client: AgentClient;
  private isCurrent: () => boolean;
  private listeners = new Set<() => void>();
  private history: AgentMessage[] = [];
  private sequence = 0;
  private controller?: AbortController;
  private consentTurn?: number;
  private state: ConversationState = { draft: '', turns: [], busy: false, declined: false };
  constructor(client: AgentClient, isCurrent: () => boolean) { this.client = client; this.isCurrent = isCurrent; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<ConversationState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  setDraft(draft: string) { if (!this.state.busy) this.set({ draft: draft.slice(0, 2000), notice: undefined, declined: false }); }
  reset = () => { this.sequence++; this.controller?.abort(); this.history = []; this.consentTurn = undefined;
    this.set({ draft: '', turns: [], busy: false, notice: undefined, declined: false }); };
  cancel = () => { this.sequence++; this.controller?.abort(); this.history = []; this.state = { draft: '', turns: [], busy: false, declined: false }; };
  decline = () => { this.consentTurn = undefined; this.set({ notice: undefined, declined: true }); };
  agree = () => {
    if (!this.state.notice || this.consentTurn === undefined || this.state.busy) return;
    const turn = this.state.turns.find(t => t.id === this.consentTurn);
    if (turn) void this.submit(turn.question, turn.id, this.state.notice.version);
  };
  send = () => {
    const last = this.state.turns[this.state.turns.length - 1];
    void this.submit(this.state.draft, last?.error && last.question === this.state.draft.trim() ? last.id : undefined);
  };
  retry = (id: number) => { const turn = this.state.turns.find(t => t.id === id); if (turn?.error) void this.submit(turn.question, id); };

  private async submit(raw: string, retryId?: number, consent?: string) {
    if (this.state.busy || !this.isCurrent() || !raw.trim() || raw.length > 2000) return;
    const question = raw.trim(), version = ++this.sequence, id = retryId ?? version;
    this.controller?.abort(); const controller = this.controller = new AbortController();
    const current = () => this.sequence === version && !controller.signal.aborted && this.isCurrent();
    const turns = retryId === undefined ? [...this.state.turns, { id, question }] : this.state.turns.map(t => t.id === id ? { id, question } : t);
    this.set({ turns, draft: question, busy: true, notice: undefined, declined: false });
    try {
      const response = await this.client.chat({ message: question, history: this.history.map(m => ({ ...m })),
        ...(consent ? { externalProcessingConsent: consent } : {}) }, controller.signal);
      if (!current()) return;
      this.history = response.history.map(m => ({ role: m.role, content: m.content }));
      this.set({ draft: '', turns: this.state.turns.map(t => t.id === id ? { ...t, response } : t) });
    } catch (e: any) {
      if (!current()) return;
      const error: AgentError = { status: Number(e?.status) || 0, code: e?.code };
      this.set({ turns: this.state.turns.map(t => t.id === id ? { ...t, error } : t) });
      if (error.status === 428) {
        try {
          const notice = await this.client.privacy(controller.signal);
          if (current()) { this.consentTurn = id; this.set({ notice }); }
        } catch { /* Keep 428 and draft; user can retry notice retrieval explicitly. */ }
      }
    } finally { if (current()) this.set({ busy: false }); }
  }
}
