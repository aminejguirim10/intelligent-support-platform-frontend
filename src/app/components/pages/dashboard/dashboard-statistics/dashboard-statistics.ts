import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticsService, TicketStatistics } from '../../../../services/statistics.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, Chart as ChartJS } from 'chart.js';
import {
  PieController,
  DoughnutController,
  BarController,
  LineController,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';

// Register Chart.js components only once
if (!ChartJS.getChart('registered')) {
  ChartJS.register(
    PieController,
    DoughnutController,
    BarController,
    LineController,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Title,
    Legend,
    Tooltip,
    Filler,
  );
  ChartJS.defaults.font.family = 'Outfit';
}

@Component({
  selector: 'app-dashboard-statistics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard-statistics.html',
  styleUrls: ['./dashboard-statistics.css'],
})
export class DashboardStatisticsComponent implements OnInit {
  statistics: TicketStatistics | null = null;
  isLoading = true;
  error: string | null = null;

  // Chart data
  statusChartData: any;
  sourceChartData: any;
  categoryChartData: any;
  priorityChartData: any;
  timelineChartData: any;

  constructor(private statisticsService: StatisticsService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.statisticsService.getTicketStatistics().subscribe({
      next: (response) => {
        this.statistics = response.data;
        this.prepareCharts();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load statistics';
        this.isLoading = false;
        this.cdr.detectChanges();
        console.error('Error loading statistics:', err);
      },
    });
  }

  prepareCharts(): void {
    if (!this.statistics) return;

    // Status distribution (doughnut chart)
    const statusData = this.statistics.ticketsByStatus || {};
    this.statusChartData = {
      labels: Object.keys(statusData),
      datasets: [
        {
          data: Object.values(statusData),
          backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };

    // Source distribution (pie chart)
    const sourceData = this.statistics.ticketsBySource || {};
    this.sourceChartData = {
      labels: Object.keys(sourceData),
      datasets: [
        {
          data: Object.values(sourceData),
          backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
          borderWidth: 0,
        },
      ],
    };

    // Category distribution (bar chart)
    const categoryData = this.statistics.ticketsByCategory || {};
    this.categoryChartData = {
      labels: Object.keys(categoryData),
      datasets: [
        {
          label: 'Tickets by Category',
          data: Object.values(categoryData),
          backgroundColor: '#3b82f6',
          borderRadius: 8,
        },
      ],
    };

    // Priority distribution (bar chart)
    const priorityData = this.statistics.ticketsByPriority || {};
    this.priorityChartData = {
      labels: Object.keys(priorityData),
      datasets: [
        {
          label: 'Tickets by Priority',
          data: Object.values(priorityData),
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
          borderRadius: 8,
        },
      ],
    };

    // Timeline (line chart)
    const createdPerDay = this.statistics.ticketsCreatedPerDay || {};
    const closedPerDay = this.statistics.ticketsClosedPerDay || {};
    const dates = Object.keys(createdPerDay).sort();
    this.timelineChartData = {
      labels: dates,
      datasets: [
        {
          label: 'Created',
          data: dates.map((date) => createdPerDay[date] || 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Closed',
          data: dates.map((date) => closedPerDay[date] || 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  get chartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            font: {
              family: 'Outfit',
              size: 12,
            },
            padding: 20,
          },
        },
      },
    };
  }

  get barChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            font: {
              family: 'Outfit',
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              family: 'Outfit',
            },
          },
        },
        x: {
          ticks: {
            font: {
              family: 'Outfit',
            },
          },
        },
      },
    };
  }
}
