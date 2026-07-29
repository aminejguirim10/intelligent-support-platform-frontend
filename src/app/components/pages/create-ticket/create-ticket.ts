import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../../services/ticket.service';
import { TicketSource } from '../../../models/enums/ticket-source.enum';
import { SupabaseService, UploadedAttachment } from '../../../services/supabase.service';
import { AttachmentService } from '../../../services/attachment.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { AiAnalysisService, TicketProgressEvent } from '../../../services/ai-analysis.service';
import { AuthenticationResponse } from '../../../models/auth/authentication-response.model';
import { Subscription } from 'rxjs';

interface PendingAttachment {
  file: File;
  uploadedData: UploadedAttachment | null;
  backendId: number | null;
  isUploading: boolean;
  uploadError: string | null;
}

interface ProcessedTicketInfo {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: 'success' | 'failed';
  error?: string;
}

@Component({
  selector: 'app-create-ticket',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-ticket.html',
  styleUrl: './create-ticket.css',
})
export class CreateTicket {
  createForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  pendingAttachments: PendingAttachment[] = [];
  selectedFiles: File[] = [];
  selectedSource: string | null = null;
  currentFileTypeAccept: string = '';
  pendingAnalyzedTickets: any[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // --- Streaming progress state ---
  isBatchProcessing = false;
  batchTotal = 0;
  batchProcessed = 0;
  batchSuccessCount = 0;
  batchFailCount = 0;
  batchProgressPercent = 0;
  processedTickets: ProcessedTicketInfo[] = [];
  batchErrors: string[] = [];
  batchComplete = false;
  private streamSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private supabaseService: SupabaseService,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    private userService: UserService,
    private aiAnalysisService: AiAnalysisService,
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.pendingAttachments.push({
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

  selectSource(source: string): void {
    this.selectedSource = source;
    this.createForm.patchValue({ source });
    this.cdr.markForCheck();
  }

  changeSource(): void {
    this.selectedSource = null;
    this.cdr.markForCheck();
  }

  triggerFileUpload(fileType: string): void {
    this.selectedSource = fileType;

    // Set accept attribute based on file type
    switch (fileType) {
      case 'TXT':
        this.currentFileTypeAccept = '.txt';
        break;
      case 'CSV':
        this.currentFileTypeAccept = '.csv';
        break;
      case 'DOCX':
        this.currentFileTypeAccept = '.docx';
        break;
      case 'PDF':
        this.currentFileTypeAccept = '.pdf';
        break;
      default:
        this.currentFileTypeAccept = '';
    }

    this.cdr.markForCheck();

    // Trigger file input click
    setTimeout(() => {
      this.fileInput.nativeElement.click();
    }, 0);
  }

  async onTypeSpecificFileSelected(event: any): Promise<void> {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.startBatchProcessing(file);
    }

    // Reset file input
    event.target.value = '';
  }

  /**
   * Starts the streaming batch processing flow.
   * Connects to the SSE endpoint and updates progress in real-time.
   */
  private startBatchProcessing(file: File): void {
    const jwtToken = this.authService.getToken();
    if (!jwtToken) {
      this.errorMessage = 'Authentication required. Please log in again.';
      this.cdr.markForCheck();
      return;
    }

    // Reset state
    this.isBatchProcessing = true;
    this.batchTotal = 0;
    this.batchProcessed = 0;
    this.batchSuccessCount = 0;
    this.batchFailCount = 0;
    this.batchProgressPercent = 0;
    this.processedTickets = [];
    this.batchErrors = [];
    this.batchComplete = false;
    this.errorMessage = null;
    this.isLoading = true;
    this.cdr.markForCheck();

    // Subscribe to the SSE stream
    this.streamSubscription = this.aiAnalysisService
      .analyzeAndCreateTicketsStream(file, jwtToken, this.selectedSource || 'WEB')
      .subscribe({
        next: (event: TicketProgressEvent) => {
          this.handleProgressEvent(event);
        },
        error: (err: any) => {
          console.error('Stream error:', err);
          this.errorMessage = err?.message || 'Connection to AI service failed. Please try again.';
          this.isBatchProcessing = false;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          // Stream ended — if not already marked complete by a 'complete' event,
          // mark it now (shouldn't normally happen)
          if (!this.batchComplete) {
            this.onBatchComplete();
          }
        },
      });
  }

  /**
   * Handles individual SSE progress events.
   */
  private handleProgressEvent(event: TicketProgressEvent): void {
    switch (event.status) {
      case 'started':
        this.batchTotal = event.total || 0;
        break;

      case 'ticket_created':
        this.batchProcessed = event.current || this.batchProcessed + 1;
        this.batchSuccessCount++;
        this.batchProgressPercent = this.batchTotal > 0
          ? Math.round((this.batchProcessed / this.batchTotal) * 100)
          : 0;

        if (event.ticket) {
          this.processedTickets.push({
            id: event.ticket.id,
            title: event.ticket.title,
            category: event.ticket.category,
            priority: event.ticket.priority,
            status: 'success',
          });
        }
        break;

      case 'ticket_failed':
        this.batchProcessed = event.current || this.batchProcessed + 1;
        this.batchFailCount++;
        this.batchProgressPercent = this.batchTotal > 0
          ? Math.round((this.batchProcessed / this.batchTotal) * 100)
          : 0;

        if (event.error) {
          this.batchErrors.push(event.error);
        }
        this.processedTickets.push({
          id: 0,
          title: 'Failed',
          category: '-',
          priority: '-',
          status: 'failed',
          error: event.error,
        });
        break;

      case 'complete':
        this.batchSuccessCount = event.successCount || this.batchSuccessCount;
        this.batchFailCount = event.failCount || this.batchFailCount;
        this.batchErrors = event.errors || this.batchErrors;
        this.batchProgressPercent = 100;
        this.onBatchComplete();
        break;

      case 'error':
        this.errorMessage = event.message || 'An error occurred during processing.';
        this.isBatchProcessing = false;
        this.isLoading = false;
        break;
    }

    this.cdr.markForCheck();
  }

  /**
   * Called when the batch processing stream completes.
   */
  private onBatchComplete(): void {
    this.batchComplete = true;
    this.isLoading = false;

    // Auto-navigate to dashboard after a delay if all succeeded
    if (this.batchFailCount === 0 && this.batchSuccessCount > 0) {
      setTimeout(() => {
        this.router.navigate(['/dashboard/tickets']);
      }, 2000);
    }
  }

  /**
   * Dismiss the progress overlay and navigate to dashboard.
   */
  dismissProgress(): void {
    this.isBatchProcessing = false;
    this.batchComplete = false;
    if (this.streamSubscription) {
      this.streamSubscription.unsubscribe();
      this.streamSubscription = null;
    }
    this.router.navigate(['/dashboard/tickets']);
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  async uploadPendingAttachments(): Promise<number[]> {
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

    for (const attachment of this.pendingAttachments) {
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

    const hasErrors = this.pendingAttachments.some((a) => a.uploadError);
    if (hasErrors) {
      throw new Error('Some attachments failed to upload');
    }

    return attachmentIds;
  }

  removePendingAttachment(index: number): void {
    const attachment = this.pendingAttachments[index];
    if (attachment.uploadedData) {
      this.supabaseService.deleteTicketAttachment(attachment.uploadedData.storagePath);
    }
    if (attachment.backendId) {
      this.attachmentService.deleteAttachment(attachment.backendId).subscribe();
    }
    this.pendingAttachments.splice(index, 1);
    this.cdr.markForCheck();
  }

  async onSubmit(): Promise<void> {
    if (this.createForm.invalid) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      let attachmentIds: number[] = [];

      if (this.pendingAttachments.length > 0) {
        attachmentIds = await this.uploadPendingAttachments();
      }

      // Single ticket creation (manual form entry with analyze-text)
      const description = this.createForm.value.description;
      let aiAnalysis: any = null;

      try {
        const analysisResults = await this.aiAnalysisService.analyzeText(description).toPromise();
        if (analysisResults && analysisResults.length > 0) {
          aiAnalysis = analysisResults[0];
        }
      } catch (aiError) {
        console.error('AI analysis failed, proceeding without analysis:', aiError);
      }

      await this.createSingleTicket(description, 'WEB', attachmentIds, aiAnalysis);

      this.isLoading = false;
      this.router.navigate(['/dashboard/tickets']);
    } catch (error) {
      this.isLoading = false;
      this.errorMessage =
        error instanceof Error ? error.message : 'Failed to create ticket. Please try again.';
      this.cdr.markForCheck();
    }
  }

  private async createTicketFromAnalysis(
    analyzedTicket: any,
    source: string,
    attachmentIds: number[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ticketService
        .createTicket({
          title: analyzedTicket.analysis.category || `Ticket from ${source}`,
          description: analyzedTicket.text,
          source: source as any,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
          aiAnalysis: analyzedTicket.analysis,
        })
        .subscribe({
          next: () => {
            resolve();
          },
          error: (err: any) => {
            reject(err);
          },
        });
    });
  }

  private async createSingleTicket(
    description: string,
    source: string,
    attachmentIds: number[],
    aiAnalysis: any = null
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ticketService
        .createTicket({
          title: this.createForm.value.title,
          description: description,
          source: source as any,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
          aiAnalysis: aiAnalysis,
        })
        .subscribe({
          next: () => {
            resolve();
          },
          error: (err: any) => {
            reject(err);
          },
        });
    });
  }
}
