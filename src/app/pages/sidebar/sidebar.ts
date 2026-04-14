import { Component } from '@angular/core';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

/**
 * Sidebar navigation component rendered on every authenticated page.
 *
 * Provides primary navigation links (Fleet Overview, Residents, Logs,
 * Settings) and a logout action with a confirmation modal. The currently
 * active route is highlighted automatically based on the URL.
 */
@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  /** Controls visibility of the logout confirmation modal. */
  showLogoutModal = false;

  constructor(
    private authService: Auth,
    public router: Router,
  ) {}

  /** Open the logout confirmation modal. */
  promptLogout(): void {
    this.showLogoutModal = true;
  }

  /** Close the logout confirmation modal without logging out. */
  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  /** Confirm logout — delegates to the Auth service which clears the session. */
  confirmLogout(): void {
    this.authService.logout();
  }
}
