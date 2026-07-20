import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../../services/ticket.service';
import { TicketSource } from '../../../models/enums/ticket-source.enum';
import { SupabaseService, UploadedAttachment } from '../../../services/supabase.service';
import { AttachmentService } from '../../../services/attachment.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { AttachmentResponse } from '../../../models/attachment/attachment-response.model';
import { AuthenticationResponse } from '../../../models/auth/authentication-response.model';

interface PendingAttachment {
  file: File;
  uploadedData: UploadedAttachment | null;
  backendId: number | null;
  isUploading: boolean;
  uploadError: string | null;
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
  sources = Object.values(TicketSource);
  pendingAttachments: PendingAttachment[] = [];
  selectedFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private supabaseService: SupabaseService,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    private userService: UserService,
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      source: [TicketSource.WEB, [Validators.required]],
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
        // Only upload attachments if there are any
        attachmentIds = await this.uploadPendingAttachments();
      }

      this.ticketService
        .createTicket({
          ...this.createForm.value,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/dashboard/tickets']);
          },
          error: (err: any) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Failed to create ticket. Please try again.';
            this.cdr.markForCheck();
          },
        });
    } catch (error) {
      this.isLoading = false;
      this.errorMessage =
        error instanceof Error ? error.message : 'Failed to upload attachments. Please try again.';
      this.cdr.markForCheck();
    }
  }
}
