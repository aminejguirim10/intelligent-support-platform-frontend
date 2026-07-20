import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { UserService } from '../../../../services/user.service';
import { UserResponse } from '../../../../models/user/user-response.model';
import { PageResponse } from '../../../../models/page-response.model';
import { Role } from '../../../../models/enums/role.enum';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, Chart as ChartJS } from 'chart.js';
import {
  PieController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Legend,
  Tooltip,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  PieController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Legend,
  Tooltip,
);

@Component({
  selector: 'app-dashboard-users',
  imports: [CommonModule, DatePipe, BaseChartDirective],
  templateUrl: './dashboard-users.html',
  styleUrl: './dashboard-users.css',
})
export class DashboardUsers implements OnInit, OnDestroy {
  users: UserResponse[] = [];
  allUsers: UserResponse[] = [];
  allUsersForStats: UserResponse[] = [];
  isLoading = true;
  isLoadingStats = true;
  showDeleteDialog = false;
  userToDelete: UserResponse | null = null;
  deletingUserId: number | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  hasNext = false;
  hasPrevious = false;

  // Search and filter state
  searchText = '';
  filterRole: Role | '' = '';
  filterRoles = ['', Role.ADMIN, Role.USER];
  
  // Debounced search
  private searchSubject = new Subject<string>();

  // Statistics
  totalUsers = 0;
  adminUsers = 0;
  regularUsers = 0;

  // Role Distribution Pie Chart
  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['Admins', 'Users'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#667eea', '#764ba2'],
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            family: 'Outfit, sans-serif',
            size: 14,
            weight: 600,
          },
          color: '#1f2937',
        },
      },
    },
  };

  // Signups Over Time Bar Chart
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'New Users',
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(102, 126, 234, 1)',
      },
    ],
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Outfit, sans-serif',
            size: 12,
          },
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Outfit, sans-serif',
            size: 12,
          },
          color: '#6b7280',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadAllUsersForStats();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.currentPage = 0;
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    const nameParam = this.searchText || undefined;
    const emailParam = this.searchText || undefined;
    const roleParam = this.filterRole || undefined;
    
    this.userService.getAllUsers(
      nameParam,
      emailParam,
      roleParam,
      this.currentPage,
      this.pageSize,
      'createdAt',
      'desc'
    ).subscribe({
      next: (page: PageResponse<UserResponse>) => {
        this.allUsers = page.content;
        this.users = page.content;
        this.currentPage = page.currentPage;
        this.totalPages = page.totalPages;
        this.totalElements = page.totalElements;
        this.hasNext = page.hasNext;
        this.hasPrevious = page.hasPrevious;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadAllUsersForStats(): void {
    this.isLoadingStats = true;
    this.cdr.markForCheck();
    
    // Load all users without pagination for statistics
    this.userService.getAllUsers(
      undefined,
      undefined,
      undefined,
      0,
      1000, // Large number to get all users
      'createdAt',
      'desc'
    ).subscribe({
      next: (page: PageResponse<UserResponse>) => {
        this.allUsersForStats = page.content;
        this.calculateStatistics();
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  calculateStatistics(): void {
    // Calculate counts from all users for statistics
    this.totalUsers = this.allUsersForStats.length;
    this.adminUsers = this.allUsersForStats.filter((u) => u.role === Role.ADMIN).length;
    this.regularUsers = this.allUsersForStats.filter((u) => u.role === Role.USER).length;

    // Update pie chart (immutable update)
    this.pieChartData = {
      ...this.pieChartData,
      datasets: [
        {
          ...this.pieChartData.datasets[0],
          data: [this.adminUsers, this.regularUsers],
        },
      ],
    };

    // Calculate signups per month for bar chart
    const signupsByMonth: { [key: string]: number } = {};
    this.allUsersForStats.forEach((user) => {
      const date = new Date(user.createdAt);
      const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      signupsByMonth[monthKey] = (signupsByMonth[monthKey] || 0) + 1;
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(signupsByMonth).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Update bar chart (immutable update)
    this.barChartData = {
      ...this.barChartData,
      labels: sortedMonths,
      datasets: [
        {
          ...this.barChartData.datasets[0],
          data: sortedMonths.map((month) => signupsByMonth[month]),
        },
      ],
    };

    // Trigger change detection
    this.cdr.markForCheck();
  }

  getRoleClass(role: Role): string {
    return role === Role.ADMIN ? 'role-admin' : 'role-user';
  }

  openDeleteDialog(user: UserResponse): void {
    this.userToDelete = user;
    this.showDeleteDialog = true;
    this.cdr.markForCheck();
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.userToDelete = null;
    this.cdr.markForCheck();
  }

  // Pagination methods
  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value, 10);
    this.currentPage = 0;
    this.loadUsers();
  }

  // Filter and search methods
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.searchSubject.next(this.searchText);
  }

  onRoleFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterRole = select.value as Role | '';
    this.currentPage = 0;
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterRole = '';
    this.currentPage = 0;
    this.loadUsers();
  }

  get filteredCount(): number {
    return this.users.length;
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(0, this.currentPage - 2);
      const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;

    this.deletingUserId = this.userToDelete.id;
    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== this.userToDelete!.id);
        this.loadAllUsersForStats(); // Reload statistics
        this.closeDeleteDialog();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingUserId = null;
        this.closeDeleteDialog();
        this.cdr.markForCheck();
      },
    });
  }
}
