import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Locker, LockerDetail, WallDetail } from '../../models/fleet.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Fleet } from '../../services/fleet';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common'; // NgStyle verwijderd indien niet meer gebruikt
import { Sidebar } from '../sidebar/sidebar';

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

  // Schakelaars voor de popups
  showForceOpenModal = false;
  showMaintenanceModal = false;

  // Nieuwe variabelen voor de resultaat-popup
  showResultModal = false;
  resultTitle = '';
  resultMessage = '';
  isErrorResult = false;

  currentAdminName = 'Een beheerder'; // <-- NIEUW: Fallback naam

  constructor(
    private route: ActivatedRoute,
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.fleetService.getCurrentAdmin().subscribe({
      next: (admin) => {
        if (admin && admin.name) {
          this.currentAdminName = admin.name;
        }
      },
      error: (err) => console.error('Kon admin profiel niet ophalen', err)
    });
    this.route.paramMap.subscribe(params => {
      const wallId = Number(params.get('id'));
      if (wallId) {
        this.loadWall(wallId);
      }
    });
  }

  // --- MODAL FUNCTIES: GEFORCEERD OPENEN ---
  promptForceOpen(): void {
    if (this.wall?.status !== 'ONLINE') return; // Voorkom actie als wand offline is
    this.showForceOpenModal = true;
  }

  cancelForceOpen(): void {
    this.showForceOpenModal = false;
  }

  confirmForceOpen(): void {
    this.showForceOpenModal = false; // Sluit de popup
    if (!this.wall || !this.selectedLocker) return;

    this.actionLoading = true;

    // De ECHTE api call
    this.fleetService.remoteUnlock(this.wall.location_id, this.selectedLocker.id, "Admin Override").subscribe({
      next: (res) => {
        this.fleetService.createAuditLog({
          location_id: this.wall!.location_id,
          locker_id: this.selectedLocker!.id,
          event_type: 'ADMIN_OVERRIDE',
          severity: 'CRITICAL',
          description: `${this.currentAdminName} heeft kluis ${this.selectedLocker!.id} geforceerd geopend via het dashboard.`
        }).subscribe();

        // NIEUW: Toon de mooie succes popup in plaats van alert()
        this.resultTitle = 'Kluis Geopend';
        this.resultMessage = `Het commando is verzonden. Kluis ${this.selectedLocker!.id} springt nu open.`;
        this.isErrorResult = false;
        this.showResultModal = true;
        
        this.actionLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        // NIEUW: Toon de mooie error popup in plaats van alert()
        this.resultTitle = 'Fout bij openen';
        this.resultMessage = 'Er is een fout opgetreden bij het communiceren met de kluiswand. Controleer de verbinding.';
        this.isErrorResult = true;
        this.showResultModal = true;
        
        console.error(err);
        this.actionLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeResultModal(): void {
    this.showResultModal = false;
  }

  // --- MODAL FUNCTIES: ONDERHOUD ---
  promptMaintenance(): void {
    if (this.wall?.status !== 'ONLINE') return; // Voorkom actie als wand offline is
    this.showMaintenanceModal = true;
  }

  cancelMaintenance(): void {
    this.showMaintenanceModal = false;
  }

  confirmMaintenance(): void {
    this.showMaintenanceModal = false; // Sluit de popup
    if (!this.selectedLocker || !this.wall) return; // Toegevoegd: check of wall bestaat

    let newStatus = 'Maintenance';
    const currentStatus = this.selectedLocker.status.toLowerCase();

    // Als we hem UIT onderhoud halen
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
        // --- GEÜPDATET: We sturen nu ook de location_id mee! ---
        const actieTekst = newStatus === 'Maintenance' ? 'in onderhoud gezet' : 'uit onderhoud gehaald';
        this.fleetService.createAuditLog({
          location_id: this.wall!.location_id,
          locker_id: this.selectedLocker!.id,
          event_type: 'ADMIN_ACTION',
          severity: 'WARNING',
          // Gebruik de nieuwe variabele hier:
          description: `${this.currentAdminName} heeft kluis ${this.selectedLocker!.id} ${actieTekst}.`
        }).subscribe();
        // --------------------------------------------------------

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
      }
    });
  }

  // --- DATA INLADEN ---
  loadWall(id: number): void {
    this.isLoading = true;
    this.fleetService.getWallDetail(id).subscribe({
      next: (data) => {
        if (data.lockers) {
          data.lockers.sort((a, b) =>
            a.id.toString().localeCompare(b.id.toString(), undefined, { numeric: true })
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
      }
    });
  }

  selectLocker(locker: Locker): void {
    this.selectedLocker = locker;
    this.lockerDetail = null;

    this.fleetService.getLockerDetail(locker.id).subscribe({
      next: (detail) => {
        this.lockerDetail = detail;
        this.cdr.detectChanges();
        console.log(this.lockerDetail)
      },
      error: (err) => console.error('Error loading locker detail:', err)
    });
  }

  closePanel(): void {
    this.selectedLocker = null;
    this.lockerDetail = null;
  }

  // --- HELPERS ---
  getSizeClass(size: string): string {
    return `size-${size.toLowerCase()}`;
  }

getStatusClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'status-free';
      case 'OCCUPIED': return 'status-occupied';
      case 'RETURN': return 'status-return'; // <--- NIEUW: Voor retouren
      case 'ERROR': return 'status-error';
      case 'MAINTENANCE': return 'status-maintenance';
      default: return 'status-free';
    }
  }
}