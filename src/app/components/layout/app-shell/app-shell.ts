import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Role } from '../../../models/enums/role.enum';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell implements OnInit, OnDestroy {
  user: any = null;
  isAdmin = false;
  sidebarOpen = true; // Default to open on desktop
  isMobile = false;
  private userSubscription: Subscription | null = null;
  imageTimestamp: number = Date.now();

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.isAdmin = this.user?.role === Role.ADMIN;
    
    // Subscribe to user changes for reactive updates
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.user = user;
      this.isAdmin = user?.role === Role.ADMIN;
      this.imageTimestamp = Date.now(); // Update timestamp to bust image cache
      this.cdr.markForCheck();
    });
    
    // Check initial screen size
    this.isMobile = window.innerWidth < 768;
    this.sidebarOpen = !this.isMobile;
    // Add window resize listener
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (wasMobile !== this.isMobile) {
        this.sidebarOpen = !this.isMobile;
      }
      this.cdr.markForCheck();
    });
    this.cdr.markForCheck();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.cdr.markForCheck();
  }

  handleNavLinkClick(): void {
    if (this.isMobile) {
      this.toggleSidebar();
    }
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }

  getInitial(name: string | undefined): string {
    if (!name) return '?';
    const trimmedName = name.trim();
    if (!trimmedName) return '?';
    // Get first letter of first name (before first space)
    const firstName = trimmedName.split(' ')[0];
    return firstName.charAt(0).toUpperCase();
  }

  hasProfilePhoto(): boolean {
    return !!(this.user?.profilePhotoUrl && this.user.profilePhotoUrl.trim().length > 0);
  }

  getCacheBustedImageUrl(): string | null {
    if (this.user?.profilePhotoUrl) {
      const separator = this.user.profilePhotoUrl.includes('?') ? '&' : '?';
      return `${this.user.profilePhotoUrl}${separator}t=${this.imageTimestamp}`;
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}
