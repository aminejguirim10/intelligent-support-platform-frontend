import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Role } from '../../../models/enums/role.enum';

@Component({
  selector: 'app-app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell implements OnInit {
  user: any = null;
  isAdmin = false;
  sidebarOpen = true; // Default to open on desktop
  isMobile = false;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.isAdmin = this.user?.role === Role.ADMIN;
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
}
