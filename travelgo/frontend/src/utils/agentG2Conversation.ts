import type { AgentChatRequest, AgentConversationMetadata, AgentError, AgentG2Privacy, AgentG2Request, AgentResponse } from '../types/agent';
import { acceptTurnMetadata, G2_CONSENT_VERSION, normalizeAgentError, parseAgentResponse, parseConversationMetadata, parseG2Privacy } from './agentContract.js';

export interface G2Client {
  verifiedPrivacy(signal: AbortSignal): Promise<AgentG2Privacy>;
  chat(input: AgentChatRequest, signal: AbortSignal): Promise<AgentResponse>;
  reset(id: string, signal: AbortSignal): Promise<AgentConversationMetadata>;
  revoke(id: string, signal: AbortSignal): Promise<void>;
  revokeAll(signal: AbortSignal): Promise<void>;
}
export interface G2Turn { id: number; question: string; response?: AgentResponse; error?: AgentError }
type Phase = 'off' | 'ready' | 'conflict' | 'uncertain' | 'expired' | 'unavailable' | 'ended';
export interface G2State {
  draft: string; turns: G2Turn[]; busy: boolean; checking: boolean; phase: Phase;
  notice?: AgentG2Privacy; metadata?: AgentConversationMetadata; message?: string; noticeError?: AgentError;
}
interface Options {
  markContext: () => void;
  confirmedAll: () => void;
  now?: () => number;
  requestId?: () => string;
}

/** Separate opt-in G2 controller. Displayed chat is never sent as server proof. */
export class AgentG2Conversation {
  private state: G2State = { draft: '', turns: [], busy: false, checking: false, phase: 'off' };
  private listeners = new Set<() => void>();
  private sequence = 0;
  private controller?: AbortController;
  private acknowledged = false;
  private command = false;
  private now: () => number;
  private newId: () => string;
  constructor(private client: G2Client, private isCurrent: () => boolean, private options: Options) {
    this.now = options.now || Date.now;
    this.newId = options.requestId || (() => {
      if (!globalThis.crypto?.randomUUID) throw { status: 503, code: 'AGENT_CLIENT_UUID_UNAVAILABLE' };
      return globalThis.crypto.randomUUID();
    });
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<G2State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private fenceWork() { this.sequence++; this.controller?.abort(); this.controller = undefined; }
  /** Auth/unmount boundary. No promise may rehydrate UI after this point. */
  fence = () => { this.fenceWork(); this.acknowledged = false; this.command = false; this.set({ draft: '', turns: [], busy: false, checking: false, phase: 'off', metadata: undefined, notice: undefined, noticeError: undefined, message: undefined }); };
  setDraft = (draft: string) => { if (!this.state.busy) this.set({ draft: draft.slice(0, 2000) }); };

  requestOptIn = async () => {
    if (!this.isCurrent() || this.state.busy || this.command || this.state.checking) return;
    this.fenceWork(); const version = this.sequence, controller = this.controller = new AbortController();
    this.set({ checking: true, notice: undefined, noticeError: undefined, message: undefined });
    try {
      const notice = parseG2Privacy({ success: true, data: await this.client.verifiedPrivacy(controller.signal) });
      if (version !== this.sequence || !this.isCurrent() || controller.signal.aborted) return;
      if (!notice.enabled) this.set({ notice: undefined, message: 'G2 demo chưa được bật trên máy chủ. Bạn vẫn có thể dùng chế độ G1.' });
      else this.set({ notice });
    } catch (error: any) {
      if (version === this.sequence && this.isCurrent() && !controller.signal.aborted) this.set({ noticeError: normalizeAgentError(error, Number(error?.status) || 0) });
    } finally { if (version === this.sequence && this.isCurrent()) this.set({ checking: false }); }
  };
  decline = () => { this.fenceWork(); this.set({ notice: undefined, checking: false }); };
  agree = () => {
    if (!this.isCurrent() || !this.state.notice?.enabled || this.state.notice.version !== G2_CONSENT_VERSION || this.command) return false;
    this.fenceWork(); this.acknowledged = true;
    this.set({ draft: '', turns: [], busy: false, checking: false, phase: 'ready', metadata: undefined, notice: undefined, message: 'G2 local/demo đã sẵn sàng. Phiên chỉ bắt đầu khi bạn gửi yêu cầu.', noticeError: undefined });
    return true;
  };
  checkExpiry = () => {
    if (this.state.metadata && Date.parse(this.state.metadata.expiresAt) <= this.now()) {
      this.fenceWork(); this.command = false;
      this.set({ phase: 'expired', metadata: undefined, busy: false, message: 'Phiên G2 đã đến thời hạn. Hãy bắt đầu phiên mới; lịch sử trên trang không khôi phục dữ liệu máy chủ.' });
    }
  };
  canSend = () => this.acknowledged && this.state.phase === 'ready' && !this.state.busy && !this.command && this.isCurrent();
  canRetry = () => this.canSend();
  send = () => { void this.submit(this.state.draft); };
  retry = (id: number) => { const turn = this.state.turns.find(t => t.id === id); if (turn?.error) void this.submit(turn.question, id); };
  confirmTransportation = (mode: 'motorbike' | 'car') => {
    const last = this.state.turns[this.state.turns.length - 1];
    if (last?.response?.status === 'needs_input' && last.response.missingFields.includes('transportation')) void this.submit(`Phương tiện: ${mode}`);
  };
  private async submit(raw: string, retryId?: number) {
    this.checkExpiry(); if (!this.canSend() || !raw.trim() || raw.length > 2000) return;
    const previous = this.state.metadata, question = raw.trim();
    let request: AgentG2Request;
    try {
      const requestId = this.newId();
      request = previous ? { action: 'continue', id: previous.id, revision: previous.revision, requestId, consentVersion: G2_CONSENT_VERSION }
        : { action: 'start', requestId, consentVersion: G2_CONSENT_VERSION };
    } catch { this.set({ message: 'Trình duyệt chưa hỗ trợ mã yêu cầu an toàn. Hãy dùng G1.', phase: 'uncertain' }); return; }
    this.fenceWork(); const version = this.sequence, id = retryId ?? version, controller = this.controller = new AbortController();
    const current = () => version === this.sequence && this.isCurrent() && !controller.signal.aborted;
    this.options.markContext();
    this.set({ busy: true, draft: question, message: undefined, turns: retryId === undefined
      ? [...this.state.turns, { id, question }] : this.state.turns.map(t => t.id === id ? { id, question } : t) });
    try {
      const response = parseAgentResponse({ success: true, data: await this.client.chat({ message: question, conversation: request }, controller.signal) });
      if (!current()) return;
      if (response.context.mode !== 'LOCAL_DEMO_VERIFIED_HISTORY') throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
      const metadata = acceptTurnMetadata(response.conversation, request, previous);
      this.set({ metadata, draft: '', phase: 'ready', turns: this.state.turns.map(t => t.id === id ? { ...t, response } : t) });
      this.checkExpiry();
    } catch (error: any) {
      if (!current()) return;
      const safe = normalizeAgentError(error, Number(error?.status) || 0, { message: question, conversation: request }, !!error?.canceled);
      let metadata: AgentConversationMetadata | undefined;
      if (safe.conversation) { try { metadata = acceptTurnMetadata(safe.conversation, request, previous); } catch { /* Foreign/extended TTL rejected. */ } }
      const preStateErrors = ['AGENT_PROVIDER_NOT_CONFIGURED', 'AGENT_CONSENT_UNAVAILABLE', 'AGENT_G2_CONSENT_REQUIRED', 'AGENT_G2_DISABLED', 'AGENT_RATE_LIMITED'];
      let phase: Phase = 'ready';
      if (safe.status === 409) phase = 'conflict';
      else if (safe.code === 'AGENT_G2_SESSION_UNAVAILABLE') phase = 'unavailable';
      else if (!metadata && !preStateErrors.includes(safe.code || '')) phase = 'uncertain';
      this.set({ phase, metadata: phase === 'unavailable' ? undefined : metadata || previous,
        turns: this.state.turns.map(t => t.id === id ? { ...t, error: { ...safe, conversation: metadata } } : t),
        message: phase === 'uncertain' ? 'Không xác nhận được revision mới. Hãy đặt lại hoặc kết thúc phiên trước khi gửi tiếp.' : undefined });
      this.checkExpiry();
    } finally { if (current()) this.set({ busy: false }); }
  }
  /** Reset clears transcript immediately and fences outstanding chat, then uses
   * the server response. It never rebuilds old facts from display history. */
  reset = async () => {
    if (!this.isCurrent() || !this.acknowledged || this.command) return;
    const previous = this.state.metadata;
    this.fenceWork(); const version = this.sequence, controller = this.controller = new AbortController(); this.command = true;
    this.set({ busy: true, turns: [], draft: '', message: undefined, metadata: previous });
    try {
      let metadata: AgentConversationMetadata | undefined;
      if (previous) {
        metadata = parseConversationMetadata(await this.client.reset(previous.id, controller.signal));
        if (metadata.id !== previous.id || metadata.revision <= previous.revision || metadata.expiresAt !== previous.expiresAt) throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
      } else { await this.client.revokeAll(controller.signal); }
      if (version !== this.sequence || !this.isCurrent() || controller.signal.aborted) return;
      if (!previous) this.options.confirmedAll();
      this.set({ phase: 'ready', metadata, message: 'Đã đặt lại. Hãy nhập yêu cầu mới; thông tin cũ không còn là ngữ cảnh của phiên.' });
    } catch (error: any) {
      if (version === this.sequence && this.isCurrent()) this.set({ phase: error?.code === 'AGENT_G2_SESSION_UNAVAILABLE' ? 'unavailable' : 'uncertain', metadata: undefined,
        message: 'Chưa xác nhận được việc đặt lại. Bạn có thể kết thúc phiên hoặc bắt đầu phiên mới; dữ liệu tạm có thể còn tối đa 15 phút.' });
    } finally { if (version === this.sequence && this.isCurrent()) { this.command = false; this.set({ busy: false }); this.checkExpiry(); } }
  };
  end = async (all = false) => {
    if (!this.isCurrent() || this.command) return;
    const previous = this.state.metadata;
    this.fenceWork(); const version = this.sequence, controller = this.controller = new AbortController(); this.command = true; this.acknowledged = false;
    this.set({ turns: [], draft: '', metadata: undefined, busy: true, notice: undefined, phase: 'ended', message: undefined });
    try {
      if (!all && previous) await this.client.revoke(previous.id, controller.signal);
      else { await this.client.revokeAll(controller.signal); }
      if (version === this.sequence && this.isCurrent() && !controller.signal.aborted) {
        if (all || !previous) this.options.confirmedAll();
        this.set({ message: 'Đã kết thúc phiên G2 được yêu cầu.' });
      }
    } catch {
      if (version === this.sequence && this.isCurrent()) this.set({ message: 'Đã xóa hội thoại khỏi trang; chưa xác nhận xóa trên máy chủ. Slots tạm có thể còn tối đa 15 phút.' });
    } finally { if (version === this.sequence && this.isCurrent()) { this.command = false; this.set({ busy: false }); } }
  };
}
