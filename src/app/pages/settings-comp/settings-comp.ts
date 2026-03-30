import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';
import { Fleet } from '../../services/fleet';

@Component({
  selector: 'app-settings-comp',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './settings-comp.html',
  styleUrl: './settings-comp.scss',
})
export class SettingsComp {
  // Profiel Data
  myProfile = { id: 0, name: '', email: '', phone: '', role: '' };
  isSavingProfile = false;
  profileMessage = '';

  // Wachtwoord Data
  passwords = { current: '', new: '', confirm: '' };
  isSavingPassword = false;
  passwordMessage = '';
  passwordError = '';

  // Beheerders (Lijst)
  admins: any[] = [];
  isLoadingAdmins = true;

  // Modal State
  showAddModal = false;
  isSavingNewAdmin = false;
  newAdmin = { name: '', email: '', phone: '', password: '', role: 'admin' };
  adminErrorMessage = '';

  // Modal State voor Verwijderen
  showDeleteModal = false;
  adminToDelete: any = null;
  isDeletingAdmin = false;

  constructor(private fleetService: Fleet, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadMyProfile();
    this.loadAdmins();
  }

  loadMyProfile(): void {
    this.fleetService.getCurrentAdmin().subscribe({
      next: (data) => {
        this.myProfile = { 
          id: data.id,           // <-- Deze is erbij gekomen!
          name: data.name, 
          email: data.email, 
          phone: data.phone || '',
          role: data.role // <-- Deze is nieuw!
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Fout bij laden profiel', err)
    });
  }

  saveProfile(): void {
    this.isSavingProfile = true;
    this.profileMessage = '';
    this.fleetService.updateCurrentAdmin(this.myProfile).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileMessage = 'Profiel succesvol bijgewerkt.';
        setTimeout(() => this.profileMessage = '', 3000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSavingProfile = false;
        this.cdr.detectChanges();
      }
    });
  }

  savePassword(): void {
    this.passwordError = '';
    this.passwordMessage = '';
    if (this.passwords.new !== this.passwords.confirm) {
      this.passwordError = 'Nieuwe wachtwoorden komen niet overeen.';
      return;
    }
    this.isSavingPassword = true;
    
    this.fleetService.updatePassword({
      current_password: this.passwords.current,
      new_password: this.passwords.new
    }).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwords = { current: '', new: '', confirm: '' };
        this.passwordMessage = 'Wachtwoord succesvol gewijzigd.';
        setTimeout(() => this.passwordMessage = '', 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingPassword = false;
        this.passwordError = err.error?.detail || 'Fout bij wijzigen wachtwoord.';
        this.cdr.detectChanges();
      }
    });
  }

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
      }
    });
  }

  openAddAdminModal(): void {
    this.newAdmin = { name: '', email: '', phone: '', password: '', role: 'admin' };
    this.adminErrorMessage = '';
    this.showAddModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
  }

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
      }
    });
  }

  // Triggert de pop-up
  deleteAdmin(admin: any): void {
    this.adminToDelete = admin;
    this.showDeleteModal = true;
  }

  // Sluit de pop-up zonder te verwijderen
  cancelDeleteAdmin(): void {
    this.showDeleteModal = false;
    this.adminToDelete = null;
  }

  // Voert de daadwerkelijke verwijdering uit
  confirmDeleteAdmin(): void {
    if (!this.adminToDelete) return;

    this.isDeletingAdmin = true;
    this.fleetService.deleteAdmin(this.adminToDelete.id).subscribe({
      next: () => {
        this.isDeletingAdmin = false;
        this.cancelDeleteAdmin();
        this.loadAdmins(); // Ververs de tabel
      },
      error: (err) => {
        this.isDeletingAdmin = false;
        alert('Kon beheerder niet verwijderen: ' + (err.error?.detail || 'Onbekende fout'));
        this.cancelDeleteAdmin();
      }
    });
  }

  // Voeg deze functie toe ergens in je SettingsComp class:
  getInitials(name: string): string {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
