import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AI_BASE_URL } from '../config/api.config';
import {
  AgentChatRequest,
  AgentChatResponse,
} from '../models/agent/agent-chat.model';

@Injectable({
  providedIn: 'root',
})
export class AgentChatService {
  private readonly agentUrl = `${AI_BASE_URL}/agent/chat`;

  constructor(private http: HttpClient) {}

  sendMessage(request: AgentChatRequest): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(this.agentUrl, request);
  }
}
