import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TicketService } from '../../../../services/ticket.service';
import { AuthService } from '../../../../services/auth.service';
import { TicketResponse } from '../../../../models/ticket/ticket-response.model';
import { PageResponse } from '../../../../models/page-response.model';
import { TicketStatus } from '../../../../models/enums/ticket-status.enum';
import { TicketSource } from '../../../../models/enums/ticket-source.enum';
import { TicketCategory } from '../../../../models/enums/ticket-category.enum';
import { TicketPriority } from '../../../../models/enums/ticket-priority.enum';
import { Role } from '../../../../models/enums/role.enum';
import { TicketRequest } from '../../../../models/ticket/ticket-request.model';
import { SupabaseService, UploadedAttachment } from '../../../../services/supabase.service';
import { AttachmentService } from '../../../../services/attachment.service';
import { UserService } from '../../../../services/user.service';
import { AttachmentResponse } from '../../../../models/attachment/attachment-response.model';
import { AuthenticationResponse } from '../../../../models/auth/authentication-response.model';

interface PendingAttachment {
  file: File;
  uploadedData: UploadedAttachment | null;
  backendId: number | null;
  isUploading: boolean;
  uploadError: string | null;
}

interface ExistingAttachment {
  id: number;
  filename: string;
  publicUrl: string;
  storagePath: string;
  isRemoved: boolean;
}

@Component({
  selector: 'app-dashboard-tickets',
  imports: [CommonModule, RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './dashboard-tickets.html',
  styleUrl: './dashboard-tickets.css',
})
export class DashboardTickets implements OnInit, OnDestroy {
  TicketStatus = TicketStatus;
  TicketSource = TicketSource;
  TicketCategory = TicketCategory;
  TicketPriority = TicketPriority;
  tickets: TicketResponse[] = [];
  allTickets: TicketResponse[] = [];
  isLoading = true;
  isAdmin = false;
  deletingTicketId: number | null = null;
  updatingTicketId: number | null = null;
  openMenuId: number | null = null;
  showDeleteDialog = false;
  ticketToDelete: TicketResponse | null = null;
  showCloseDialog = false;
  ticketToClose: TicketResponse | null = null;
  showEditDialog = false;
  ticketToEdit: TicketResponse | null = null;
  editForm: FormGroup;
  editSources = Object.values(TicketSource);
  editStatuses = Object.values(TicketStatus);
  editPendingAttachments: PendingAttachment[] = [];
  editExistingAttachments: ExistingAttachment[] = [];
  editError: string | null = null;
  isSavingEdit = false;
  originalStatus: TicketStatus | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  hasNext = false;
  hasPrevious = false;

  // Search and filter state
  searchText = '';
  filterStatus: TicketStatus | '' = '';
  filterSource: TicketSource | '' = '';
  filterCategory: TicketCategory | '' = '';
  filterPriority: TicketPriority | '' = '';
  filterStatuses = ['', ...Object.values(TicketStatus)];
  filterSources = ['', ...Object.values(TicketSource)];
  filterCategories = ['', ...Object.values(TicketCategory)];
  filterPriorities = ['', ...Object.values(TicketPriority)];
  
  // Debounced search
  private searchSubject = new Subject<string>();

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private attachmentService: AttachmentService,
    private userService: UserService,
  ) {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      source: [TicketSource.CSV, [Validators.required]],
      status: [TicketStatus.OPEN, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.getUser()?.role === Role.ADMIN;
    this.setupSearchDebounce();
    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.currentPage = 0;
      this.loadTickets();
    });
  }

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.ticket-actions')) {
      this.openMenuId = null;
      this.cdr.markForCheck();
    }
  }

  loadTickets(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    const titleParam = this.searchText || undefined;
    const statusParam = this.filterStatus || undefined;
    const sourceParam = this.filterSource || undefined;
    
    const observable = this.isAdmin
      ? this.ticketService.getAllTickets(
          titleParam,
          statusParam,
          sourceParam,
          this.currentPage,
          this.pageSize,
          'createdAt',
          'desc'
        )
      : this.ticketService.getCurrentUserTickets(
          titleParam,
          statusParam,
          sourceParam,
          this.currentPage,
          this.pageSize,
          'createdAt',
          'desc'
        );

    observable.subscribe({
      next: (page: PageResponse<TicketResponse>) => {
        this.allTickets = page.content;
        this.tickets = this.applyClientSideFilters(page.content);
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

  applyClientSideFilters(tickets: TicketResponse[]): TicketResponse[] {
    let filtered = tickets;
    
    if (this.filterCategory) {
      filtered = filtered.filter(ticket => 
        ticket.analyses && ticket.analyses.length > 0 && 
        ticket.analyses[0].category === this.filterCategory
      );
    }
    
    if (this.filterPriority) {
      filtered = filtered.filter(ticket => 
        ticket.analyses && ticket.analyses.length > 0 && 
        ticket.analyses[0].priority === this.filterPriority
      );
    }
    
    return filtered;
  }

  getStatusClass(status: TicketStatus): string {
    return status === TicketStatus.OPEN ? 'status-open' : 'status-closed';
  }

  getSourceBadge(source: TicketSource): string {
    switch (source) {
      case TicketSource.WEB:
        return 'source-web';
      case TicketSource.CHAT:
        return 'source-chat';
      case TicketSource.CSV:
        return 'source-csv';
      case TicketSource.TXT:
        return 'source-txt';
      case TicketSource.DOCX:
        return 'source-docx';
      case TicketSource.PDF:
        return 'source-pdf';
      default:
        return '';
    }
  }

  get hasAttachmentsToShow(): boolean {
    const hasExisting = this.editExistingAttachments.some((a) => !a.isRemoved);
    const hasPending = this.editPendingAttachments.length > 0;
    return hasExisting || hasPending;
  }

  get existingAttachments(): ExistingAttachment[] {
    return this.editExistingAttachments.filter((a) => !a.isRemoved);
  }

  get isOriginalStatusClosed(): boolean {
    return this.originalStatus === TicketStatus.CLOSED;
  }

  toggleMenu(ticketId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === ticketId ? null : ticketId;
    this.cdr.markForCheck();
  }

  openCloseDialog(ticket: TicketResponse): void {
    this.ticketToClose = ticket;
    this.showCloseDialog = true;
    this.openMenuId = null;
    this.cdr.markForCheck();
  }

  closeCloseDialog(): void {
    this.showCloseDialog = false;
    this.ticketToClose = null;
    this.cdr.markForCheck();
  }

  confirmClose(): void {
    if (!this.ticketToClose) return;

    this.updatingTicketId = this.ticketToClose.id;

    const updateRequest: TicketRequest = {
      title: this.ticketToClose.title,
      description: this.ticketToClose.description,
      source: this.ticketToClose.source.toString(),
      status: TicketStatus.CLOSED.toString(),
      attachmentIds: this.ticketToClose.attachments?.map((a) => a.id) || [],
    };

    this.ticketService.updateTicket(this.ticketToClose.id, updateRequest).subscribe({
      next: (updatedTicket) => {
        const index = this.tickets.findIndex((t) => t.id === this.ticketToClose!.id);
        if (index !== -1) {
          this.tickets[index] = updatedTicket;
        }
        this.updatingTicketId = null;
        this.closeCloseDialog();
      },
      error: () => {
        this.updatingTicketId = null;
        this.cdr.markForCheck();
      },
    });
  }

  openEditDialog(ticket: TicketResponse): void {
    this.ticketToEdit = ticket;
    this.originalStatus = ticket.status;
    this.editForm.patchValue({
      title: ticket.title,
      description: ticket.description,
      source: ticket.source,
      status: ticket.status,
    });

    // Disable status control if ticket is closed
    const statusControl = this.editForm.get('status');
    if (this.isOriginalStatusClosed) {
      statusControl?.disable();
    } else {
      statusControl?.enable();
    }

    // Disable source control to prevent modification
    const sourceControl = this.editForm.get('source');
    sourceControl?.disable();

    this.editExistingAttachments =
      ticket.attachments?.map((a) => ({
        id: a.id,
        filename: a.filename,
        publicUrl: a.publicUrl,
        storagePath: a.storagePath,
        isRemoved: false,
      })) || [];
    this.editPendingAttachments = [];
    this.editError = null;
    this.showEditDialog = true;
    this.openMenuId = null;
    this.cdr.markForCheck();
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.ticketToEdit = null;
    this.editForm.reset();
    this.editPendingAttachments = [];
    this.editExistingAttachments = [];
    this.editError = null;
    this.cdr.markForCheck();
  }

  onEditFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.editPendingAttachments.push({
          file,
          uploadedData: null,
          backendId: null,
          isUploading: false,
          uploadError: null,
        });
      }
    }
    event.target.value = '';
    this.cdr.markForCheck();
  }

  removeEditPendingAttachment(index: number): void {
    const attachment = this.editPendingAttachments[index];
    if (attachment.uploadedData) {
      this.supabaseService.deleteTicketAttachment(attachment.uploadedData.storagePath);
    }
    if (attachment.backendId) {
      this.attachmentService.deleteAttachment(attachment.backendId).subscribe();
    }
    this.editPendingAttachments.splice(index, 1);
    this.cdr.markForCheck();
  }

  removeEditExistingAttachment(index: number): void {
    this.editExistingAttachments[index].isRemoved = true;
    this.cdr.markForCheck();
  }

  async uploadEditPendingAttachments(): Promise<number[]> {
    let user = this.authService.getUser();

    // If we don't have the user id, fetch it from the backend
    if (!user || !user.id) {
      const backendUser = await this.userService.getCurrentUser().toPromise();
      if (!backendUser) {
        throw new Error('Failed to fetch user data');
      }

      // Update the auth service's stored user with the id
      this.authService.saveAuthData({
        id: backendUser.id,
        email: backendUser.email,
        role: backendUser.role as string,
        access_token: this.authService.getToken() || '',
        refresh_token: this.authService.getRefreshToken() || '',
        token_type: 'Bearer',
        expires_in: 3600,
      } as AuthenticationResponse);

      user = this.authService.getUser();
      if (!user || !user.id) {
        throw new Error('Please log out and log back in to upload attachments');
      }
    }
    const userId = user.id;

    const attachmentIds: number[] = [];

    for (const attachment of this.editPendingAttachments) {
      attachment.isUploading = true;
      attachment.uploadError = null;
      this.cdr.markForCheck();

      try {
        // Upload to Supabase
        const uploadedData = await this.supabaseService.uploadTicketAttachment(
          userId,
          attachment.file,
        );
        if (!uploadedData) {
          throw new Error('Failed to upload to Supabase');
        }
        attachment.uploadedData = uploadedData;

        // Create attachment in backend
        const backendAttachment = await this.attachmentService
          .createAttachment({
            filename: uploadedData.filename,
            mediaType: uploadedData.mediaType,
            bucketName: uploadedData.bucketName,
            storagePath: uploadedData.storagePath,
            publicUrl: uploadedData.publicUrl,
          })
          .toPromise();

        if (!backendAttachment) {
          throw new Error('Failed to create attachment in backend');
        }
        attachment.backendId = backendAttachment.id;
        attachmentIds.push(backendAttachment.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload attachment';
        attachment.uploadError = errorMessage;
      } finally {
        attachment.isUploading = false;
        this.cdr.markForCheck();
      }
    }

    const hasErrors = this.editPendingAttachments.some((a) => a.uploadError);
    if (hasErrors) {
      throw new Error('Some attachments failed to upload');
    }

    return attachmentIds;
  }

  async onSubmitEdit(): Promise<void> {
    if (this.editForm.invalid || !this.ticketToEdit) return;

    this.isSavingEdit = true;
    this.editError = null;
    this.cdr.markForCheck();

    try {
      let newAttachmentIds: number[] = [];

      if (this.editPendingAttachments.length > 0) {
        newAttachmentIds = await this.uploadEditPendingAttachments();
      }

      // Get existing attachment ids that are not removed
      const existingAttachmentIds = this.editExistingAttachments
        .filter((a) => !a.isRemoved)
        .map((a) => a.id);

      // Get attachment ids that should be deleted
      const attachmentsToDelete = this.editExistingAttachments.filter((a) => a.isRemoved);
      for (const a of attachmentsToDelete) {
        try {
          await this.supabaseService.deleteTicketAttachment(a.storagePath);
          await this.attachmentService.deleteAttachment(a.id).toPromise();
        } catch (error) {
          // Ignore errors when deleting attachments
        }
      }

      const allAttachmentIds = [...existingAttachmentIds, ...newAttachmentIds];

      // Use getRawValue to include disabled controls
      const formRawValue = this.editForm.getRawValue();
      this.ticketService
        .updateTicket(this.ticketToEdit.id, {
          ...formRawValue,
          status: formRawValue.status?.toString() || this.ticketToEdit.status,
          source: formRawValue.source?.toString() || this.ticketToEdit.source,
          attachmentIds: allAttachmentIds.length > 0 ? allAttachmentIds : undefined,
        })
        .subscribe({
          next: (updatedTicket) => {
            const index = this.tickets.findIndex((t) => t.id === this.ticketToEdit!.id);
            if (index !== -1) {
              this.tickets[index] = updatedTicket;
            }
            this.isSavingEdit = false;
            this.closeEditDialog();
          },
          error: (err: any) => {
            this.isSavingEdit = false;
            this.editError = err.error?.message || 'Failed to update ticket. Please try again.';
            this.cdr.markForCheck();
          },
        });
    } catch (error) {
      this.isSavingEdit = false;
      this.editError =
        error instanceof Error ? error.message : 'Failed to upload attachments. Please try again.';
      this.cdr.markForCheck();
    }
  }

  openDeleteDialog(ticket: TicketResponse): void {
    this.ticketToDelete = ticket;
    this.showDeleteDialog = true;
    this.openMenuId = null;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.ticketToDelete) return;

    this.deletingTicketId = this.ticketToDelete.id;
    this.ticketService.deleteTicket(this.ticketToDelete.id).subscribe({
      next: () => {
        this.tickets = this.tickets.filter((t) => t.id !== this.ticketToDelete!.id);
        this.closeDeleteDialog();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingTicketId = null;
        this.closeDeleteDialog();
        this.cdr.markForCheck();
      },
    });
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.ticketToDelete = null;
    this.cdr.markForCheck();
  }

  // Pagination methods
  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadTickets();
    }
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadTickets();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadTickets();
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value, 10);
    this.currentPage = 0;
    this.loadTickets();
  }

  // Filter and search methods
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.searchSubject.next(this.searchText);
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterStatus = select.value as TicketStatus | '';
    this.currentPage = 0;
    this.loadTickets();
  }

  onSourceFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterSource = select.value as TicketSource | '';
    this.currentPage = 0;
    this.loadTickets();
  }

  onCategoryFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterCategory = select.value as TicketCategory | '';
    this.currentPage = 0;
    this.loadTickets();
  }

  onPriorityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterPriority = select.value as TicketPriority | '';
    this.currentPage = 0;
    this.loadTickets();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterStatus = '';
    this.filterSource = '';
    this.filterCategory = '';
    this.filterPriority = '';
    this.currentPage = 0;
    this.loadTickets();
  }

  get filteredCount(): number {
    return this.tickets.length;
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 3;
    
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

  // Analysis styling methods
  getPriorityBorderClass(ticket: TicketResponse): string {
    if (!ticket.analyses || ticket.analyses.length === 0) return '';
    const priority = ticket.analyses[0].priority;
    switch (priority) {
      case 'HIGH':
        return 'priority-high-border';
      case 'MEDIUM':
        return 'priority-medium-border';
      case 'LOW':
        return 'priority-low-border';
      default:
        return '';
    }
  }

  getConfidenceClass(score: number): string {
    if (score >= 0.8) return 'confidence-high';
    if (score >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'TECHNICAL':
        return 'category-technical';
      case 'BILLING':
        return 'category-billing';
      case 'ACCOUNT':
        return 'category-account';
      case 'COMPLAINT':
        return 'category-complaint';
      case 'REQUEST':
        return 'category-request';
      default:
        return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return 'priority-high';
      case 'MEDIUM':
        return 'priority-medium';
      case 'LOW':
        return 'priority-low';
      default:
        return '';
    }
  }

  getSentimentClass(sentiment: string): string {
    const lowerSentiment = sentiment.toLowerCase();
    if (lowerSentiment.includes('positive') || lowerSentiment.includes('happy') || lowerSentiment.includes('calm')) {
      return 'sentiment-positive';
    }
    if (lowerSentiment.includes('negative') || lowerSentiment.includes('angry') || lowerSentiment.includes('frustrated') || lowerSentiment.includes('upset')) {
      return 'sentiment-negative';
    }
    return 'sentiment-neutral';
  }

  getKeywordsArray(keywords: string): string[] {
    if (!keywords) return [];
    return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }
}

