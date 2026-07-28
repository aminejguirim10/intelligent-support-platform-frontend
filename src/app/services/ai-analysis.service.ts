import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface FastAPIAnalysisResponse {
  category: string;
  priority: string;
  sentiment: string;
  keywords: string;
  confidenceScore: number;
}

interface FastAPIRequest {
  text: string;
}

interface SplitTicketsResponse {
  tickets: AnalyzedTicket[];
}

interface AnalyzedTicket {
  text: string;
  analysis: FastAPIAnalysisResponse;
}

interface CreateTicketsResponse {
  tickets: any[];
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class AiAnalysisService {
  private readonly aiApiUrl = environment.aiUrl;

  constructor(private http: HttpClient) {}

  analyzeText(text: string): Observable<FastAPIAnalysisResponse[]> {
    const request: FastAPIRequest = { text };
    return this.http.post<FastAPIAnalysisResponse[]>(
      `${this.aiApiUrl}/analyze-text`,
      request
    );
  }

  splitTickets(file: File): Observable<SplitTicketsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SplitTicketsResponse>(
      `${this.aiApiUrl}/analyze-ticket`,
      formData
    );
  }

  analyzeAndCreateTickets(file: File, jwtToken: string, source: string): Observable<CreateTicketsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jwt_token', jwtToken);
    formData.append('source', source);
    return this.http.post<CreateTicketsResponse>(
      `${this.aiApiUrl}/analyze-and-create-tickets`,
      formData
    );
  }
}
