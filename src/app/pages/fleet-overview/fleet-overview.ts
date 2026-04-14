import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { DashboardKPIs, Wall } from '../../models/fleet.model';
import { Fleet } from '../../services/fleet';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Fleet overview dashboard — the main landing page after login.
 *
 * Displays real-time KPI cards (parcels today, active walls, offline
 * locations, open errors) and a filterable grid of wall cards. Each card
 * links to the wall-detail page and shows occupancy, status, and last
 * sync time. Also provides a modal wizard for adding new walls and a
 * confirmation dialog for deleting walls.
 */
@Component({
  selector: 'app-fleet-overview',
  imports: [DatePipe, NgClass, FormsModule, CommonModule, RouterLink, Sidebar],
  templateUrl: './fleet-overview.html',
  styleUrl: './fleet-overview.scss',
})
export class FleetOverview implements OnInit {
  // ── Admin identity (used in audit log descriptions) ────────────────

  adminName: string = 'Systeem/Onbekende Admin'; // Fallback name

  // ── Dashboard data ─────────────────────────────────────────────────

  kpis: DashboardKPIs | null = null;
  walls: Wall[] = [];

  // ── Filters ─────────────────────────────────────────────────────────

  searchTerm: string = '';
  selectedStatus: string = 'Alle Statussen';

  // ── Delete-wall modal state ────────────────────────────────────────

  wallToDelete: Wall | null = null;
  isDeleting: boolean = false;

  // ── Add-wall wizard state ───────────────────────────────────────────

  showAddModal: boolean = false;
  wizardStep: number = 1;
  isSaving: boolean = false;

  newWall = {
    name: '',
    address: '',
    lockerCount: 10,
  };

  newLockers: { door_number: number; size: string }[] = [];
  sizes = ['S', 'M', 'L'];

  constructor(
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
    private authService: Auth,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.fetchAdmin(); // Fetch admin name for audit log descriptions
  }

  /** Fetch the current admin's profile to use in audit log entries. */
  fetchAdmin(): void {
    this.fleetService.getCurrentAdmin().subscribe({
      next: (admin) => {
        // Adjust '.name' to '.email' if your admin object uses a different property
        if (admin && admin.name) {
          this.adminName = admin.name;
        }
      },
      error: (err) => console.error('Kon admin niet ophalen:', err),
    });
  }

  /** Load KPIs and walls in parallel. */
  loadData(): void {
    this.fleetService.getDashboardKPIs().subscribe((data) => {
      this.kpis = data;
      this.cdr.detectChanges();
    });
    this.loadWalls();
  }

  /** Fetch walls using the current search term and status filter. */
  loadWalls(): void {
    this.fleetService.getWalls(this.searchTerm, this.selectedStatus).subscribe((data) => {
      this.walls = data;
      this.cdr.detectChanges();
    });
  }

  /** Re-fetch walls whenever a filter value changes. */
  onFilterChange(): void {
    this.loadWalls();
  }

  /**
   * Parse an occupancy string like "9/20" into a percentage.
   * Returns 0 for empty or "Onbekend" strings.
   */
  getOccupancyPercentage(occupancy: string): number {
    if (!occupancy || occupancy === 'Onbekend') return 0;
    const parts = occupancy.split('/');
    if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
      return (parseInt(parts[0], 10) / parseInt(parts[1], 10)) * 100;
    }
    return 0;
  }

  // ── Add-wall wizard ─────────────────────────────────────────────────

  /** Open the wizard modal and reset all form state. */
  openModal() {
    this.newWall = { name: '', address: '', lockerCount: 10 };
    this.wizardStep = 1;
    this.showAddModal = true;
  }

  /** Close the wizard modal. */
  closeModal() {
    this.showAddModal = false;
  }

  /**
   * Advance the wizard to step 2 after validating the basic fields.
   * Generates a default locker grid based on the chosen locker count.
   */
  goToStep2() {
    if (!this.newWall.name || !this.newWall.address || this.newWall.lockerCount < 1) return;

    // Generate the locker grid from the chosen door count
    this.newLockers = Array.from({ length: this.newWall.lockerCount }, (_, i) => ({
      door_number: i + 1,
      size: 'M', // Default size: Medium
    }));

    this.wizardStep = 2;
  }

  /** Cycle through S → M → L sizes when a locker cell is clicked. */
  toggleSize(locker: { door_number: number; size: string }) {
    const currentIndex = this.sizes.indexOf(locker.size);
    locker.size = this.sizes[(currentIndex + 1) % this.sizes.length];
  }

  /** Submit the new wall to the backend and log the creation in the audit trail. */
  saveWall() {
    this.isSaving = true;
    const payload = {
      name: this.newWall.name,
      address: this.newWall.address,
      lockers: this.newLockers,
    };

    this.fleetService.createWall(payload).subscribe({
      next: (response) => {
        this.isSaving = false;

        // Log wall creation in the audit trail
        this.fleetService
          .createAuditLog({
            event_type: 'WALL_CREATED',
            severity: 'INFO',
            description: `Muur '${this.newWall.name}' is aangemaakt door admin: ${this.adminName}`,
          })
          .subscribe(); // Fire-and-forget; no need to wait for the response

        this.closeModal();
        this.loadWalls(); // Refresh the grid
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fout bij opslaan:', err);
        this.isSaving = false;
        this.cdr.detectChanges();
        alert('Er ging iets mis bij het opslaan.');
      },
    });
  }

  // ── Delete-wall logic ──────────────────────────────────────────────

  /** Open the delete-confirmation dialog for a specific wall. */
  promptDeleteWall(wall: Wall, event: Event) {
    event.stopPropagation(); // Prevent navigation to the wall detail page
    this.wallToDelete = wall;
  }

  /** Close the delete-confirmation dialog without deleting. */
  cancelDeleteWall() {
    this.wallToDelete = null;
  }

  /** Confirm deletion, call the API, and log the action in the audit trail. */
  confirmDeleteWall() {
    if (!this.wallToDelete) return;

    this.isDeleting = true;
    const wallName = this.wallToDelete.name; // Capture name before clearing state

    this.fleetService.deleteWall(this.wallToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.wallToDelete = null;

        // Log wall deletion in the audit trail (no location_id)
        this.fleetService
          .createAuditLog({
            event_type: 'WALL_DELETED',
            severity: 'WARNING',
            description: `Muur '${wallName}' is verwijderd door admin: ${this.adminName}`,
          })
          .subscribe();

        this.loadData(); // Refresh KPIs and the wall grid
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fout bij verwijderen muur:', err);
        this.isDeleting = false;
        this.cdr.detectChanges();
        alert(
          'Kan muur niet verwijderen. Controleer of deze nog actieve pakketten of bewoners heeft.',
        );
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
