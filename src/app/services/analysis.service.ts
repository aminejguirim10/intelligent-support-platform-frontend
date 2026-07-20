import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { AnalysisRequest } from '../models/analysis/analysis-request.model';
import { AnalysisResponse } from '../models/analysis/analysis-response.model';

const ANALYSIS_API = `${API_BASE_URL}/tickets`;

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  constructor(private http: HttpClient) {}

  createAnalysis(ticketId: number, request: AnalysisRequest): Observable<AnalysisResponse> {
    return this.http
      .post<ApiResponse<AnalysisResponse>>(`${ANALYSIS_API}/${ticketId}/analyses`, request)
      .pipe(map((response) => response.data));
  }

  updateAnalysis(
    ticketId: number,
    analysisId: number,
    request: AnalysisRequest
  ): Observable<AnalysisResponse> {
    return this.http
      .put<ApiResponse<AnalysisResponse>>(
        `${ANALYSIS_API}/${ticketId}/analyses/${analysisId}`,
        request
      )
      .pipe(map((response) => response.data));
  }

  deleteAnalysis(ticketId: number, analysisId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${ANALYSIS_API}/${ticketId}/analyses/${analysisId}`)
      .pipe(map(() => {}));
  }
}
