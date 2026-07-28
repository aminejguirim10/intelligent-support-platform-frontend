export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConfirmedAction {
  action: 'close_ticket' | 'delete_ticket';
  ticketId: number;
}

export interface AgentChatRequest {
  message?: string;
  history: ChatHistoryItem[];
  jwtToken: string;
  isAdmin: boolean;
  confirmedAction?: ConfirmedAction;
}

export interface PendingConfirmation {
  action: string;
  ticketId: number;
  ticketTitle?: string;
  message?: string;
}

export interface ToolTrace {
  tool: string;
  label: string;
}

export interface AgentTicketCard {
  id?: number;
  title?: string;
  status?: string;
  source?: string;
  priority?: string;
  category?: string;
  sentiment?: string;
  userEmail?: string;
  createdAt?: string;
}

export interface AgentChatResponse {
  reply: string;
  tickets: AgentTicketCard[];
  ticketsMessage?: string;
  pendingConfirmation?: PendingConfirmation | null;
  toolTraces: ToolTrace[];
}

export interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tickets?: AgentTicketCard[];
  ticketsMessage?: string;
  pendingConfirmation?: PendingConfirmation;
  toolTraces?: ToolTrace[];
  isLoading?: boolean;
}
