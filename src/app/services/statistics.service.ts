import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TicketStatistics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  ticketsThisWeek: number;
  ticketsThisMonth: number;
  closedThisWeek: number;
  closedThisMonth: number;
  ticketsByStatus: Record<string, number>;
  ticketsBySource: Record<string, number>;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  ticketsCreatedPerDay: Record<string, number>;
  ticketsClosedPerDay: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private apiUrl = `${environment.apiUrl}/statistics`;

  constructor(private http: HttpClient) {}

  getTicketStatistics(): Observable<{ message: string; data: TicketStatistics }> {
    return this.http.get<{ message: string; data: TicketStatistics }>(
      `${this.apiUrl}/tickets`
    );
  }
}
