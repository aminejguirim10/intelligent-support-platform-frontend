import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

interface FastAPIAnalysisResponse {
  category: string;
  priority: string;
  sentiment: string;
  keywords: string;
  confidenceScore: number;
  advice: string;
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

// SSE progress events emitted by the streaming endpoint
export interface TicketProgressEvent {
  status: 'started' | 'ticket_created' | 'ticket_failed' | 'complete' | 'error';
  current?: number;
  total?: number;
  ticket?: {
    id: number;
    title: string;
    category: string;
    priority: string;
  };
  error?: string;
  message?: string;
  successCount?: number;
  failCount?: number;
  errors?: string[];
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

  /**
   * Streams real-time progress events from the analyze-and-create-tickets endpoint.
   *
   * Uses the Fetch API with a streaming body reader instead of EventSource,
   * because EventSource only supports GET requests and can't send POST bodies
   * or custom headers. The fetch approach allows us to POST the FormData and
   * still consume the SSE stream.
   */
  analyzeAndCreateTicketsStream(
    file: File,
    jwtToken: string,
    source: string
  ): Observable<TicketProgressEvent> {
    const subject = new Subject<TicketProgressEvent>();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jwt_token', jwtToken);
    formData.append('source', source);

    // Use fetch with streaming — this allows POST + SSE consumption
    fetch(`${this.aiApiUrl}/analyze-and-create-tickets`, {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorBody = await response.text();
          subject.error(new Error(`Server error ${response.status}: ${errorBody}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete last line in buffer

          let currentEventType = 'message';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                try {
                  const event: TicketProgressEvent = JSON.parse(jsonStr);
                  subject.next(event);
                } catch (e) {
                  console.warn('Failed to parse SSE data:', jsonStr);
                }
              }
              currentEventType = 'message'; // Reset after data line
            }
          }
        }

        subject.complete();
      })
      .catch((err) => {
        subject.error(err);
      });

    return subject.asObservable();
  }

  /**
   * @deprecated Use analyzeAndCreateTicketsStream() for large files.
   * Kept for backward compatibility with non-streaming callers.
   */
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
