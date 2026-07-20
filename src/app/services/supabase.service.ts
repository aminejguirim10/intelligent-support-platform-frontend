import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET } from '../config/api.config';

export interface UploadedAttachment {
  filename: string;
  mediaType: string;
  bucketName: string;
  storagePath: string;
  publicUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async uploadUserProfileImage(userId: number, file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const filePath = `users/${userId}/profile.${fileExt}`;

    if (!file) {
      console.error('No file provided');
      return null;
    }

    const { error: uploadError } = await this.supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data: urlData } = this.supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async deleteUserProfileImage(userId: number, fileExt?: string): Promise<void> {
    const filePath = `users/${userId}/profile.${fileExt || 'jpg'}`;
    const { error } = await this.supabase.storage.from(SUPABASE_BUCKET).remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
    }
  }

  async deleteImageByUrl(publicUrl: string): Promise<void> {
    try {
      const urlParts = publicUrl.split(`/storage/v1/object/public/${SUPABASE_BUCKET}/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const { error } = await this.supabase.storage.from(SUPABASE_BUCKET).remove([filePath]);

        if (error) {
          console.error('Error deleting image by URL:', error);
        }
      }
    } catch (error) {
      console.error('Error parsing URL for deletion:', error);
    }
  }

  async uploadTicketAttachment(userId: number, file: File): Promise<UploadedAttachment | null> {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const uniqueFilename = `${baseName}_${timestamp}.${fileExt}`;
    const filePath = `attachments/${userId}/${uniqueFilename}`;

    if (!file) {
      return null;
    }

    const { error: uploadError } = await this.supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return null;
    }

    const { data: urlData } = this.supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    return {
      filename: file.name,
      mediaType: file.type,
      bucketName: SUPABASE_BUCKET,
      storagePath: filePath,
      publicUrl: urlData.publicUrl,
    };
  }

  async deleteTicketAttachment(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);

    if (error) {
      console.error('Error deleting attachment:', error);
    }
  }
}
