export interface TicketRequest {
  title: string;
  description: string;
  source: string;
  status?: string;
  attachmentIds?: number[];
}
