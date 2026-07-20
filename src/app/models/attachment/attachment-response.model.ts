export interface AttachmentResponse {
  id: number;
  filename: string;
  mediaType: string;
  bucketName: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
  ticketId: number;
}
