import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { DashboardKPIs, Wall } from '../../models/fleet.model';
import { Fleet } from '../../services/fleet';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-fleet-overview',
  imports: [DatePipe, NgClass, FormsModule, CommonModule, RouterLink, Sidebar],
  templateUrl: './fleet-overview.html',
  styleUrl: './fleet-overview.scss',
})
export class FleetOverview implements OnInit {
  kpis: DashboardKPIs | null = null;
  walls: Wall[] = [];

  searchTerm: string = '';
  selectedStatus: string = 'Alle Statussen';

  // --- DELETE VARIABELEN ---
  wallToDelete: Wall | null = null;
  isDeleting: boolean = false;

  // --- WIZARD VARIABELEN ---
  showAddModal: boolean = false;
  wizardStep: number = 1;
  isSaving: boolean = false;

  newWall = {
    name: '',
    address: '',
    lockerCount: 10
  };

  newLockers: { door_number: number, size: string }[] = [];
  sizes = ['S', 'M', 'L'];

  constructor(
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
    private authService: Auth
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.fleetService.getDashboardKPIs().subscribe(data => { this.kpis = data; this.cdr.detectChanges(); });
    this.loadWalls();
  }

  loadWalls(): void {
    this.fleetService.getWalls(this.searchTerm, this.selectedStatus).subscribe(data => {
      this.walls = data;
      this.cdr.detectChanges();
    });
  }

  onFilterChange(): void { this.loadWalls(); }

  getOccupancyPercentage(occupancy: string): number {
    if (!occupancy || occupancy === 'Onbekend') return 0;
    const parts = occupancy.split('/');
    if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
      return (parseInt(parts[0], 10) / parseInt(parts[1], 10)) * 100;
    }
    return 0;
  }

  // --- WIZARD LOGICA ---
  openModal() {
    this.newWall = { name: '', address: '', lockerCount: 10 };
    this.wizardStep = 1;
    this.showAddModal = true;
  }

  closeModal() {
    this.showAddModal = false;
  }

  goToStep2() {
    if (!this.newWall.name || !this.newWall.address || this.newWall.lockerCount < 1) return;
    
    // Genereer de grid op basis van het aantal kluisjes
    this.newLockers = Array.from({ length: this.newWall.lockerCount }, (_, i) => ({
      door_number: i + 1,
      size: 'M' // Standaard Medium
    }));
    
    this.wizardStep = 2;
  }

  toggleSize(locker: { door_number: number, size: string }) {
    // Wisselt tussen S, M, en L bij elke klik
    const currentIndex = this.sizes.indexOf(locker.size);
    locker.size = this.sizes[(currentIndex + 1) % this.sizes.length];
  }

  saveWall() {
    this.isSaving = true;
    const payload = {
      name: this.newWall.name,
      address: this.newWall.address,
      lockers: this.newLockers
    };

    this.fleetService.createWall(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.cdr.detectChanges()
        this.loadWalls(); // Herlaad de grid
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error('Fout bij opslaan:', err);
        this.isSaving = false;
        this.cdr.detectChanges()
        alert('Er ging iets mis bij het opslaan.');
      }
    });
  }

  // --- DELETE LOGICA ---
  promptDeleteWall(wall: Wall, event: Event) {
    event.stopPropagation(); // Belangrijk: voorkomt dat je doorklikt naar de detailpagina!
    this.wallToDelete = wall;
  }

  cancelDeleteWall() {
    this.wallToDelete = null;
  }

  confirmDeleteWall() {
    if (!this.wallToDelete) return;
    
    this.isDeleting = true;
    this.fleetService.deleteWall(this.wallToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.wallToDelete = null;
        this.loadData(); // Herlaad direct de KPI's en de muren-grid
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fout bij verwijderen muur:', err);
        this.isDeleting = false;
        this.cdr.detectChanges();
        alert('Kan muur niet verwijderen. Controleer of deze nog actieve pakketten of bewoners heeft (afhankelijk van je backend restricties).');
      }
    });
  }

  logout(): void { this.authService.logout(); }
}