export interface TicketRequest {
  title: string;
  description: string;
  source: string;
  status?: string;
  attachmentIds?: number[];
  aiAnalysis?: AIAnalysisRequest;
}

export interface AIAnalysisRequest {
  category: string;
  priority: string;
  sentiment: string;
  keywords: string;
  confidenceScore: number;
}
