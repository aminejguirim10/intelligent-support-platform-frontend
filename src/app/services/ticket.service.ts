import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { TicketRequest } from '../models/ticket/ticket-request.model';
import { TicketResponse } from '../models/ticket/ticket-response.model';
import { TicketStatus } from '../models/enums/ticket-status.enum';
import { TicketSource } from '../models/enums/ticket-source.enum';

const TICKET_API = `${API_BASE_URL}/tickets`;

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  constructor(private http: HttpClient) {}

  createTicket(request: TicketRequest): Observable<TicketResponse> {
    return this.http
      .post<ApiResponse<TicketResponse>>(TICKET_API, request)
      .pipe(map((response) => response.data));
  }

  getCurrentUserTickets(
    title?: string,
    status?: TicketStatus,
    source?: TicketSource,
    page = 0,
    size = 10,
    sortBy = 'createdAt',
    sortDirection = 'desc'
  ): Observable<PageResponse<TicketResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    if (title) params = params.set('title', title);
    if (status) params = params.set('status', status);
    if (source) params = params.set('source', source);

    return this.http
      .get<ApiResponse<PageResponse<TicketResponse>>>(`${TICKET_API}/my-tickets`, { params })
      .pipe(map((response) => response.data));
  }

  getAllTickets(
    title?: string,
    status?: TicketStatus,
    source?: TicketSource,
    page = 0,
    size = 10,
    sortBy = 'createdAt',
    sortDirection = 'desc'
  ): Observable<PageResponse<TicketResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    if (title) params = params.set('title', title);
    if (status) params = params.set('status', status);
    if (source) params = params.set('source', source);

    return this.http
      .get<ApiResponse<PageResponse<TicketResponse>>>(`${TICKET_API}/all`, { params })
      .pipe(map((response) => response.data));
  }

  getTicketById(ticketId: number): Observable<TicketResponse> {
    return this.http
      .get<ApiResponse<TicketResponse>>(`${TICKET_API}/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  updateTicket(ticketId: number, request: TicketRequest): Observable<TicketResponse> {
    return this.http
      .put<ApiResponse<TicketResponse>>(`${TICKET_API}/${ticketId}`, request)
      .pipe(map((response) => response.data));
  }

  deleteTicket(ticketId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${TICKET_API}/${ticketId}`)
      .pipe(map(() => {}));
  }
}
