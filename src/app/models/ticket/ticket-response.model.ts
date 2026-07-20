import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketSource } from '../enums/ticket-source.enum';
import { AttachmentResponse } from '../attachment/attachment-response.model';
import { AnalysisResponse } from '../analysis/analysis-response.model';

export interface TicketResponse {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  source: TicketSource;
  createdAt: string;
  userId: number;
  userEmail: string;
  userName: string;
  attachments: AttachmentResponse[];
  analyses: AnalysisResponse[];
}
