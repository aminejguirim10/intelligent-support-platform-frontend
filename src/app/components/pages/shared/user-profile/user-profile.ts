import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { UserService } from '../../../../services/user.service';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth.service';
import { UserResponse } from '../../../../models/user/user-response.model';
import { Role } from '../../../../models/enums/role.enum';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile implements OnInit {
  profileForm: FormGroup;
  user: UserResponse | null = null;
  isLoading = true;
  isSaving = false;
  isUploading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  oldImageUrl: string | null = null;
  imageTimestamp: number = Date.now(); // Cache-busting timestamp

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.pattern('^[0-9]{8}$')]],
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.userService.getCurrentUser().subscribe({
      next: (user: UserResponse) => {
        this.user = user;
        this.oldImageUrl = user.profilePhotoUrl;
        this.imageTimestamp = Date.now(); // Update timestamp when loading profile
        this.profileForm.patchValue({
          name: user.name,
          phoneNumber: user.phoneNumber,
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImage = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      let finalImageUrl = this.oldImageUrl;

      if (this.selectedFile && this.user) {
        this.isUploading = true;
        this.cdr.markForCheck();

        // Step 1: Delete old image if it exists
        if (this.oldImageUrl) {
          await this.supabaseService.deleteImageByUrl(this.oldImageUrl);
        }

        // Step 2: Upload new image
        const uploadedUrl = await this.supabaseService.uploadUserProfileImage(
          this.user.id,
          this.selectedFile,
        );

        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          this.imageTimestamp = Date.now(); // Update timestamp for cache busting
        }
      }

      // Update user profile
      const updateData = {
        ...this.profileForm.value,
        profilePhotoUrl: finalImageUrl,
      };

      this.userService.updateCurrentUser(updateData).subscribe({
        next: (updatedUser: UserResponse) => {
          this.user = updatedUser;
          this.oldImageUrl = updatedUser.profilePhotoUrl;
          this.selectedFile = null;
          this.previewImage = null; // Reset preview to use the new saved URL
          this.isSaving = false;
          this.isUploading = false;
          this.successMessage = 'Profile updated successfully!';
          
          // Update localStorage to reflect changes in navigation
          this.authService.updateUser({
            name: updatedUser.name,
            profilePhotoUrl: updatedUser.profilePhotoUrl,
          });
          
          this.cdr.markForCheck();

          setTimeout(() => {
            this.successMessage = null;
            this.cdr.markForCheck();
          }, 3000);
        },
        error: (err: any) => {
          this.isSaving = false;
          this.isUploading = false;
          this.errorMessage = err.error?.message || 'Failed to update profile. Please try again.';
          this.cdr.markForCheck();
        },
      });
    } catch (error) {
      this.isSaving = false;
      this.isUploading = false;
      this.errorMessage = 'An error occurred. Please try again.';
      this.cdr.markForCheck();
    }
  }

  // Helper method to get cache-busted image URL
  getCacheBustedImageUrl(): string | null {
    if (this.previewImage) {
      return this.previewImage;
    }
    if (this.user?.profilePhotoUrl) {
      // Add a timestamp query parameter to prevent caching
      const separator = this.user.profilePhotoUrl.includes('?') ? '&' : '?';
      return `${this.user.profilePhotoUrl}${separator}t=${this.imageTimestamp}`;
    }
    return null;
  }

  getRoleClass(role: Role): string {
    return role === Role.ADMIN ? 'role-admin' : 'role-user';
  }
}
