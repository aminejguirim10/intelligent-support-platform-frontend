import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketPriority } from '../enums/ticket-priority.enum';

export interface AnalysisResponse {
  id: number;
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: string;
  keywords: string;
  confidenceScore: number;
  advice: string;
  createdAt: string;
  ticketId: number;
}
