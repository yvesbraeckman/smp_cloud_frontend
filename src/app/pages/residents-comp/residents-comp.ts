import { ChangeDetectorRef, Component } from '@angular/core';
import { Fleet } from '../../services/fleet';
import { Resident, ResidentPaginatedResponse } from '../../models/fleet.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-residents-comp',
  imports: [FormsModule, CommonModule, Sidebar],
  templateUrl: './residents-comp.html',
  styleUrl: './residents-comp.scss',
})
export class ResidentsComp {

  protected readonly Math = Math;

  residents: Resident[] = [];
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  isLoading = true;
  showAddModal = false;
  isSaving = false;
  errorMessage = '';
  newResident = {
    name: '',
    email: '',
    unit_number: '',
    phone: '',
    location_id: 1 // Standaardwaarde
  };
  locations: any[] = [];
  showDeleteModal = false;
  residentToDelete: Resident | null = null;
  isDeleting = false;
  isEditMode = false;
  editingResidentId: number | null = null;

  currentAdminName = 'Een beheerder'; // Fallback naam

  // Use a Subject for search debouncing so we don't spam the API on every keystroke
  private searchSubject = new Subject<string>();

  constructor(private fleetService: Fleet, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadResidents();
    this.loadLocations(); // Nieuw!

    // --- NIEUW: Haal de ingelogde beheerder op voor de logs ---
    this.fleetService.getCurrentAdmin().subscribe({
      next: (admin) => {
        if (admin && admin.name) {
          this.currentAdminName = admin.name;
        }
      },
      error: (err) => console.error('Kon admin profiel niet ophalen', err)
    });

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1; // Reset to page 1 on new search
      this.loadResidents();
    });
  }


  loadLocations(): void {
    // Gebruik gewoon je bestaande getWalls() methode! Geen filters nodig, dus haalt alles op.
    this.fleetService.getWalls().subscribe({
      next: (walls) => {
        // Zet de muren om naar de id/name lijst voor je dropdown
        this.locations = walls.map(wall => ({
          id: wall.id, // Let op: check even of je Wall model hier 'id' of 'location_id' gebruikt
          name: wall.name
        }));

        // Selecteer standaard de eerste locatie
        if (this.locations.length > 0) {
          this.newResident.location_id = this.locations[0].id;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fout bij laden van muren/locaties', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadResidents(): void {
    this.isLoading = true;
    this.fleetService.getResidents(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (response: ResidentPaginatedResponse) => {
        this.residents = response.items;
        this.totalRecords = response.total;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading residents:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.loadResidents();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  // Generate an array of page numbers for the pagination UI
  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  deleteResident(resident: Resident): void {
    this.residentToDelete = resident;
    this.showDeleteModal = true;
  }

  // Sluit de pop-up zonder iets te doen
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.residentToDelete = null;
  }

  // Voert de daadwerkelijke verwijdering uit
  confirmDelete(): void {
    if (!this.residentToDelete) return;

    this.isDeleting = true;
    
    // Sla de gegevens even op in constanten, want nadat we cancelDelete() 
    // aanroepen is this.residentToDelete leeg (null).
    const deletedName = this.residentToDelete.name;
    const deletedId = this.residentToDelete.id;
    const deletedLocationId = this.residentToDelete.location_id;

    this.fleetService.deleteResident(deletedId).subscribe({
      next: () => {
        
        // --- NIEUW: Frontend Audit Log voor Verwijderen ---
        this.fleetService.createAuditLog({
          location_id: deletedLocationId || 1, // Val terug op een standaard ID indien nodig
          locker_id: undefined, // Niet gekoppeld aan een specifiek kluisje
          event_type: 'USER_DELETED',
          severity: 'WARNING',
          description: `${this.currentAdminName} heeft bewoner '${deletedName}' (ID: ${deletedId}) verwijderd.`
        }).subscribe();
        // -------------------------------------------------

        this.isDeleting = false;
        this.cancelDelete();
        this.loadResidents(); // Ververs de tabel
      },
      error: (err) => {
        this.isDeleting = false;
        alert('Fout bij verwijderen: ' + (err.error?.detail || 'Onbekende fout'));
        this.cancelDelete();
      }
    });
  }

  generateCode(resident: Resident): void {
    this.fleetService.generateCredentials(resident.id).subscribe({
      next: (res) => {
        // Since we don't have real email yet, show the debug pin in the alert
        alert(`Succes: ${res.message}\n(Debug PIN: ${res.debug_pin})`);
      },
      error: (err) => alert('Fout bij genereren code')
    });
  }

  addResident(): void {
    this.errorMessage = '';
    this.isEditMode = false;
    this.editingResidentId = null;
    
    // Maak de velden leeg voor een nieuwe bewoner
    this.newResident = { 
      name: '', 
      email: '', 
      unit_number: '', 
      phone: '', 
      location_id: this.locations.length > 0 ? this.locations[0].id : null 
    };
    
    this.showAddModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
  }

  onBackdropClick(event: MouseEvent): void {
    // We checken of het element waar je op klikte (target) exact hetzelfde is 
    // als de donkere overlay (currentTarget). Zo voorkomen we dat klikken of 
    // slepen in de witte popup de modal sluit.
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  submitNewResident(): void {
    // 1. Verwijder direct alle overbodige spaties aan het begin en einde
    this.newResident.name = this.newResident.name.trim();
    this.newResident.email = this.newResident.email.toLowerCase().trim();
    this.newResident.unit_number = this.newResident.unit_number.trim();
    this.newResident.phone = this.newResident.phone ? this.newResident.phone.trim() : '';

    // 2. Basis check: is alles (na het trimmen) nog steeds ingevuld?
    if (!this.newResident.name || !this.newResident.email || !this.newResident.unit_number) {
      this.errorMessage = 'Naam, e-mailadres en bus/unit zijn verplicht en mogen niet alleen uit spaties bestaan.';
      return;
    }

    // 3. Strenge check op de Naam (Alleen letters, spaties, koppeltekens en apostrofs)
    // De À-ÿ zorgt ervoor dat letters met accenten (zoals é, ç, ë) ook zijn toegestaan.
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (!nameRegex.test(this.newResident.name)) {
      this.errorMessage = 'De naam mag alleen letters, spaties, koppeltekens en apostrofs bevatten.';
      return;
    }

    // 4. Strenge check op de Bus/Unit (Alleen letters, cijfers, spaties, koppeltekens en slashes)
    const unitRegex = /^[a-zA-Z0-9\s\/\-]+$/;
    if (!unitRegex.test(this.newResident.unit_number)) {
      this.errorMessage = 'De bus/unit bevat ongeldige tekens (gebruik bijv. 12A, B-4 of 101/2).';
      return;
    }

    // 5. Strenge check op Telefoonnummer (Alleen als deze is ingevuld!)
    if (this.newResident.phone) {
      // Mag beginnen met een +, daarna alleen cijfers, spaties, koppeltekens of haakjes (8 tot 20 tekens lang)
      const phoneRegex = /^[\+]?[0-9\s\-()]{8,20}$/;
      if (!phoneRegex.test(this.newResident.phone)) {
        this.errorMessage = 'Voer een geldig telefoonnummer in (bijv. +32 400 00 00 00).';
        return;
      }
    }

    // 6. Strenge check op E-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newResident.email)) {
      this.errorMessage = 'Voer een geldig e-mailadres in (bijv. naam@domein.be).';
      return;
    }

    // --- Als we hier belanden, is alle data 100% clean en veilig! ---

    this.isSaving = true;
    this.errorMessage = '';

    // Bepaal of we moeten toevoegen (POST) of updaten (PUT)
    if (this.isEditMode && this.editingResidentId) {
      // BEWERKEN
      this.fleetService.updateResident(this.editingResidentId, this.newResident).subscribe({
        next: () => {
          
          // --- NIEUW: Frontend Audit Log voor Bewerken ---
          this.fleetService.createAuditLog({
            location_id: this.newResident.location_id || 1,
            locker_id: undefined, // Geen specifieke kluis
            event_type: 'USER_UPDATED',
            severity: 'INFO',
            description: `${this.currentAdminName} heeft de gegevens van bewoner '${this.newResident.name}' (ID: ${this.editingResidentId}) bewerkt.`
          }).subscribe();
          // -----------------------------------------------

          this.isSaving = false;
          this.closeModal();
          this.loadResidents(); // Ververs tabel
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het bewerken.';
        }
      });
    } else {
        this.fleetService.createResident(this.newResident).subscribe({
            next: () => {
              
              // --- NIEUW: Frontend Audit Log voor Aanmaken ---
              this.fleetService.createAuditLog({
                location_id: this.newResident.location_id || 1,
                locker_id: undefined, 
                event_type: 'USER_CREATED',
                severity: 'INFO',
                description: `${this.currentAdminName} heeft een nieuwe bewoner '${this.newResident.name}' aangemaakt.`
              }).subscribe();
              // -----------------------------------------------

              this.isSaving = false;
              this.closeModal();
              this.loadResidents(); // Ververs tabel
            },
            error: (err) => {
              this.isSaving = false;
              this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het opslaan.';
            }
          });
    }
  }

  editResident(resident: Resident): void {
    this.errorMessage = '';
    this.isEditMode = true;
    this.editingResidentId = resident.id;
    
    // We maken een KOPIE van de data, zodat we niet per ongeluk de tabelrij 
    // al wijzigen voordat de gebruiker op "Opslaan" heeft geklikt.
    this.newResident = {
      name: resident.name,
      email: resident.email,
      unit_number: resident.unit_number || '',
      phone: resident.phone || '',
      location_id: resident.location_id || (this.locations.length > 0 ? this.locations[0].id : null)
    };
    
    this.showAddModal = true; // We openen gewoon hetzelfde formulier!
  }  

  getLocationName(locationId: number | null | undefined): string {
    if (!locationId) return '—';
    
    // Zoek de locatie op in de array die we al geladen hebben
    const location = this.locations.find(loc => loc.id === locationId);
    
    // Geef de naam terug, of een fallback als de locaties nog laden
    return location ? location.name : `Locatie ${locationId}`;
  }

  
}
