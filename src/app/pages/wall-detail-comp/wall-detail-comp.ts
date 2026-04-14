import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Locker, LockerDetail, WallDetail } from '../../models/fleet.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Fleet } from '../../services/fleet';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Wall detail page that renders an interactive grid of lockers for a
 * specific wall (location). Clicking a locker opens a detail panel on the
 * right side with parcel/resident info and two admin actions:
 *
 * 1. **Force Open** — remotely unlock a locker (for emergencies).
 * 2. **Toggle Maintenance** — put a locker into or take it out of
 *    maintenance mode.
 *
 * All actions are logged in the audit trail and confirmation modals
 * are shown before execution. Actions are disabled when the wall is
 * offline.
 */
@Component({
  selector: 'app-wall-detail-comp',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, NgClass, Sidebar],
  templateUrl: './wall-detail-comp.html',
  styleUrl: './wall-detail-comp.scss',
})
export class WallDetailComp implements OnInit {
  wall: WallDetail | null = null;
  selectedLocker: Locker | null = null;
  lockerDetail: LockerDetail | null = null;

  isLoading = true;
  actionLoading = false;

  // ── Modal toggle flags ─────────────────────────────────────────────

  showForceOpenModal = false;
  showMaintenanceModal = false;

  // ── Result modal state (success or error after an action) ──────────

  showResultModal = false;
  resultTitle = '';
  resultMessage = '';
  isErrorResult = false;

  /** Current admin name (fallback) used in audit log descriptions. */
  currentAdminName = 'Een beheerder';

  constructor(
    private route: ActivatedRoute,
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fleetService.getCurrentAdmin().subscribe({
      next: (admin) => {
        if (admin && admin.name) {
          this.currentAdminName = admin.name;
        }
      },
      error: (err) => console.error('Kon admin profiel niet ophalen', err),
    });
    this.route.paramMap.subscribe((params) => {
      const wallId = Number(params.get('id'));
      if (wallId) {
        this.loadWall(wallId);
      }
    });
  }

  // ── Force Open ─────────────────────────────────────────────────────

  /** Open the force-unlock confirmation modal (only when wall is online). */
  promptForceOpen(): void {
    if (this.wall?.status !== 'ONLINE') return;
    this.showForceOpenModal = true;
  }

  /** Close the force-unlock confirmation modal. */
  cancelForceOpen(): void {
    this.showForceOpenModal = false;
  }

  /** Execute the force-unlock after user confirmation and log the action. */
  confirmForceOpen(): void {
    this.showForceOpenModal = false;
    if (!this.wall || !this.selectedLocker) return;

    this.actionLoading = true;

    this.fleetService
      .remoteUnlock(this.wall.location_id, this.selectedLocker.id, 'Admin Override')
      .subscribe({
        next: (res) => {
          this.fleetService
            .createAuditLog({
              location_id: this.wall!.location_id,
              locker_id: this.selectedLocker!.id,
              event_type: 'ADMIN_OVERRIDE',
              severity: 'CRITICAL',
              description: `${this.currentAdminName} heeft kluis ${this.selectedLocker!.id} geforceerd geopend via het dashboard.`,
            })
            .subscribe();

          // Show the styled result modal instead of alert()
          this.resultTitle = 'Kluis Geopend';
          this.resultMessage = `Het commando is verzonden. Kluis ${this.selectedLocker!.id} springt nu open.`;
          this.isErrorResult = false;
          this.showResultModal = true;

          this.actionLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          // Show the styled error modal instead of alert()
          this.resultTitle = 'Fout bij openen';
          this.resultMessage =
            'Er is een fout opgetreden bij het communiceren met de kluiswand. Controleer de verbinding.';
          this.isErrorResult = true;
          this.showResultModal = true;

          console.error(err);
          this.actionLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Close the action-result modal. */
  closeResultModal(): void {
    this.showResultModal = false;
  }

  // ── Maintenance Mode ────────────────────────────────────────────────

  /** Open the maintenance-mode confirmation modal (only when wall is online). */
  promptMaintenance(): void {
    if (this.wall?.status !== 'ONLINE') return;
    this.showMaintenanceModal = true;
  }

  /** Close the maintenance-mode confirmation modal. */
  cancelMaintenance(): void {
    this.showMaintenanceModal = false;
  }

  /**
   * Toggle the maintenance mode on the selected locker.
   *
   * If the locker is currently in maintenance, it is set to 'Available'
   * (or 'Occupied' if it still holds a parcel). Otherwise it is put
   * into maintenance mode. The change is logged in the audit trail.
   */
  confirmMaintenance(): void {
    this.showMaintenanceModal = false;
    if (!this.selectedLocker || !this.wall) return;

    let newStatus = 'Maintenance';
    const currentStatus = this.selectedLocker.status.toLowerCase();

    // Determine the target status when coming out of maintenance
    if (currentStatus === 'maintenance') {
      if (this.lockerDetail && this.lockerDetail.parcel_id != null) {
        newStatus = 'Occupied';
      } else {
        newStatus = 'Available';
      }
    }

    this.actionLoading = true;

    this.fleetService.setServiceMode(this.selectedLocker.id, newStatus).subscribe({
      next: () => {
        const actieTekst =
          newStatus === 'Maintenance' ? 'in onderhoud gezet' : 'uit onderhoud gehaald';
        this.fleetService
          .createAuditLog({
            location_id: this.wall!.location_id,
            locker_id: this.selectedLocker!.id,
            event_type: 'ADMIN_ACTION',
            severity: 'WARNING',
            description: `${this.currentAdminName} heeft kluis ${this.selectedLocker!.id} ${actieTekst}.`,
          })
          .subscribe();

        if (this.wall) this.loadWall(this.wall.location_id);
        this.closePanel();
        this.actionLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert('Fout bij aanpassen status. Check console!');
        console.error('API Error:', err);
        this.actionLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Data Loading ────────────────────────────────────────────────────

  /** Fetch wall detail data and sort lockers by ID (numeric). */
  loadWall(id: number): void {
    this.isLoading = true;
    this.fleetService.getWallDetail(id).subscribe({
      next: (data) => {
        if (data.lockers) {
          data.lockers.sort((a, b) =>
            a.id.toString().localeCompare(b.id.toString(), undefined, { numeric: true }),
          );
        }

        this.wall = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading wall detail:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Select a locker and fetch its detailed info from the backend. */
  selectLocker(locker: Locker): void {
    this.selectedLocker = locker;
    this.lockerDetail = null;

    this.fleetService.getLockerDetail(locker.id).subscribe({
      next: (detail) => {
        this.lockerDetail = detail;
        this.cdr.detectChanges();
        console.log(this.lockerDetail);
      },
      error: (err) => console.error('Error loading locker detail:', err),
    });
  }

  /** Deselect the current locker and close the detail panel. */
  closePanel(): void {
    this.selectedLocker = null;
    this.lockerDetail = null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Return the CSS size class for a locker (e.g. 'size-s', 'size-m'). */
  getSizeClass(size: string): string {
    return `size-${size.toLowerCase()}`;
  }

  /** Return the CSS status class for a locker based on its status string. */
  getStatusClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return 'status-free';
      case 'OCCUPIED':
        return 'status-occupied';
      case 'RETURN':
        return 'status-return';
      case 'ERROR':
        return 'status-error';
      case 'MAINTENANCE':
        return 'status-maintenance';
      default:
        return 'status-free';
    }
  }
}
