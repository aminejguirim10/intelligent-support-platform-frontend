import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { AttachmentResponse } from '../models/attachment/attachment-response.model';
import { UploadedAttachment } from './supabase.service';

export interface AttachmentRequest {
  filename: string;
  mediaType: string;
  bucketName: string;
  storagePath: string;
  publicUrl: string;
}

const ATTACHMENT_API = `${API_BASE_URL}/attachments`;

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  constructor(private http: HttpClient) {}

  createAttachment(request: AttachmentRequest): Observable<AttachmentResponse> {
    return this.http
      .post<ApiResponse<AttachmentResponse>>(ATTACHMENT_API, request)
      .pipe(map((response) => response.data));
  }

  getAttachmentById(attachmentId: number): Observable<AttachmentResponse> {
    return this.http
      .get<ApiResponse<AttachmentResponse>>(`${ATTACHMENT_API}/${attachmentId}`)
      .pipe(map((response) => response.data));
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${ATTACHMENT_API}/${attachmentId}`)
      .pipe(map(() => {}));
  }
}