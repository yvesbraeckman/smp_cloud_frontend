import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';
import { Fleet } from '../../services/fleet';

/**
 * Settings page component for the currently authenticated admin.
 *
 * Provides three sections:
 * 1. **Personal details** — edit name, email, phone.
 * 2. **Security** — change password (current + new + confirm).
 * 3. **Admin management** — list, create, and delete other admin accounts
 *    (only visible to superadmins).
 */
@Component({
  selector: 'app-settings-comp',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './settings-comp.html',
  styleUrl: './settings-comp.scss',
})
export class SettingsComp {
  // ── Profile data ────────────────────────────────────────────────────

  myProfile = { id: 0, name: '', email: '', phone: '', role: '' };
  isSavingProfile = false;
  profileMessage = '';

  // ── Password data ───────────────────────────────────────────────────

  passwords = { current: '', new: '', confirm: '' };
  isSavingPassword = false;
  passwordMessage = '';
  passwordError = '';

  // ── Admin list ───────────────────────────────────────────────────────

  admins: any[] = [];
  isLoadingAdmins = true;

  // ── Add-admin modal state ───────────────────────────────────────────

  showAddModal = false;
  isSavingNewAdmin = false;
  newAdmin = { name: '', email: '', phone: '', password: '', role: 'admin' };
  adminErrorMessage = '';

  // ── Delete-admin modal state ────────────────────────────────────────

  showDeleteModal = false;
  adminToDelete: any = null;
  isDeletingAdmin = false;

  constructor(
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMyProfile();
    this.loadAdmins();
  }

  /** Fetch the current admin's profile from the backend. */
  loadMyProfile(): void {
    this.fleetService.getCurrentAdmin().subscribe({
      next: (data) => {
        this.myProfile = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          role: data.role,
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Fout bij laden profiel', err),
    });
  }

  /** Save updated personal details for the current admin. */
  saveProfile(): void {
    this.isSavingProfile = true;
    this.profileMessage = '';
    this.fleetService.updateCurrentAdmin(this.myProfile).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileMessage = 'Profiel succesvol bijgewerkt.';
        setTimeout(() => (this.profileMessage = ''), 3000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSavingProfile = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Submit a password change request.
   *
   * Validates that the new password and confirmation match before
   * sending the request. On success the password fields are cleared.
   */
  savePassword(): void {
    this.passwordError = '';
    this.passwordMessage = '';
    if (this.passwords.new !== this.passwords.confirm) {
      this.passwordError = 'Nieuwe wachtwoorden komen niet overeen.';
      return;
    }
    this.isSavingPassword = true;

    this.fleetService
      .updatePassword({
        current_password: this.passwords.current,
        new_password: this.passwords.new,
      })
      .subscribe({
        next: () => {
          this.isSavingPassword = false;
          this.passwords = { current: '', new: '', confirm: '' };
          this.passwordMessage = 'Wachtwoord succesvol gewijzigd.';
          setTimeout(() => (this.passwordMessage = ''), 3000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSavingPassword = false;
          this.passwordError = err.error?.detail || 'Fout bij wijzigen wachtwoord.';
          this.cdr.detectChanges();
        },
      });
  }

  /** Fetch the list of all admin accounts. */
  loadAdmins(): void {
    this.isLoadingAdmins = true;
    this.fleetService.getAdmins().subscribe({
      next: (data) => {
        this.admins = data;
        this.isLoadingAdmins = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingAdmins = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Open the modal for adding a new admin account. */
  openAddAdminModal(): void {
    this.newAdmin = { name: '', email: '', phone: '', password: '', role: 'admin' };
    this.adminErrorMessage = '';
    this.showAddModal = true;
  }

  /** Close the add-admin modal. */
  closeModal(): void {
    this.showAddModal = false;
  }

  /** Submit the new admin form after validating required fields. */
  submitNewAdmin(): void {
    if (!this.newAdmin.name || !this.newAdmin.email || !this.newAdmin.password) {
      this.adminErrorMessage = 'Naam, email en wachtwoord zijn verplicht.';
      return;
    }
    this.isSavingNewAdmin = true;
    this.fleetService.createAdmin(this.newAdmin).subscribe({
      next: () => {
        this.isSavingNewAdmin = false;
        this.closeModal();
        this.loadAdmins();
      },
      error: (err) => {
        this.isSavingNewAdmin = false;
        this.adminErrorMessage = err.error?.detail || 'Fout bij toevoegen.';
        this.cdr.detectChanges();
      },
    });
  }

  /** Open the delete-confirmation modal for a specific admin. */
  deleteAdmin(admin: any): void {
    this.adminToDelete = admin;
    this.showDeleteModal = true;
  }

  /** Close the delete-confirmation modal without deleting. */
  cancelDeleteAdmin(): void {
    this.showDeleteModal = false;
    this.adminToDelete = null;
  }

  /** Permanently delete the selected admin account. */
  confirmDeleteAdmin(): void {
    if (!this.adminToDelete) return;

    this.isDeletingAdmin = true;
    this.fleetService.deleteAdmin(this.adminToDelete.id).subscribe({
      next: () => {
        this.isDeletingAdmin = false;
        this.cancelDeleteAdmin();
        this.loadAdmins(); // Refresh the admin list
      },
      error: (err) => {
        this.isDeletingAdmin = false;
        alert('Kon beheerder niet verwijderen: ' + (err.error?.detail || 'Onbekende fout'));
        this.cancelDeleteAdmin();
      },
    });
  }

  /**
   * Derive initials from a name for the avatar circle.
   *
   * Takes the first letter of each word (max two), or the first
   * two characters of a single-word name.
   */
  getInitials(name: string): string {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
