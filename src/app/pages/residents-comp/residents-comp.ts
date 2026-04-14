import { ChangeDetectorRef, Component } from '@angular/core';
import { Fleet } from '../../services/fleet';
import { Resident, ResidentPaginatedResponse } from '../../models/fleet.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Residents management page component.
 *
 * Provides a full CRUD interface for residents including listing with
 * pagination/search, creating, editing, deleting, and generating
 * access credentials (QR/PIN codes). Each mutation is recorded via
 * a frontend audit-log entry for traceability.
 */
@Component({
  selector: 'app-residents-comp',
  imports: [FormsModule, CommonModule, Sidebar],
  templateUrl: './residents-comp.html',
  styleUrl: './residents-comp.scss',
})
export class ResidentsComp {
  // ── Helpers & State ──

  protected readonly Math = Math;

  // ── Table Data & Pagination ──

  residents: Resident[] = [];
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  isLoading = true;
  showAddModal = false;
  isSaving = false;
  errorMessage = '';

  // ── Resident Form Model ──

  newResident = {
    name: '',
    email: '',
    unit_number: '',
    phone: '',
    location_id: 1, // Default value
  };
  locations: any[] = [];

  // ── Delete Modal State ──

  showDeleteModal = false;
  residentToDelete: Resident | null = null;
  isDeleting = false;

  // ── Edit Mode State ──

  isEditMode = false;
  editingResidentId: number | null = null;

  // ── Key/PIN Code Modal Variables ──

  showKeyModal = false;
  isGeneratingKey = false;
  generatedPin = '';
  residentForKey: Resident | null = null;
  keyErrorMessage = ''; // Error message specific to this modal

  currentAdminName = 'Een beheerder'; // Fallback name

  // ── Search Debouncing ──

  private searchSubject = new Subject<string>();

  constructor(
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initialise the component: load residents & locations,
   * fetch the current admin profile, and set up search debouncing.
   */
  ngOnInit(): void {
    this.loadResidents();
    this.loadLocations();

    // Fetch the logged-in admin name for audit log descriptions
    this.fleetService.getCurrentAdmin().subscribe({
      next: (admin) => {
        if (admin && admin.name) {
          this.currentAdminName = admin.name;
        }
      },
      error: (err) => console.error('Kon admin profiel niet ophalen', err),
    });

    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm = term;
      this.currentPage = 1; // Reset to page 1 on new search
      this.loadResidents();
    });
  }

  // ── Location Loading ──

  /**
   * Load all wall/locations from the API and populate the location dropdown.
   * Reuses the existing getWalls() method — no filters needed, so it fetches everything.
   */
  loadLocations(): void {
    this.fleetService.getWalls().subscribe({
      next: (walls) => {
        // Convert the walls to an id/name list for the dropdown
        this.locations = walls.map((wall) => ({
          id: wall.id, // Note: verify whether the Wall model uses 'id' or 'location_id'
          name: wall.name,
        }));

        // Select the first location by default
        if (this.locations.length > 0) {
          this.newResident.location_id = this.locations[0].id;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fout bij laden van muren/locaties', err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Resident Loading & Search ──

  /**
   * Load the paginated list of residents from the API.
   */
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
      },
    });
  }

  /**
   * Handle search input by pushing the value into the debounced subject.
   * @param event - The input event from the search field.
   */
  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  // ── Pagination ──

  /**
   * Navigate to a different page if it is within valid range.
   * @param newPage - The target page number.
   */
  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.loadResidents();
    }
  }

  /** Total number of pages based on current records and page size. */
  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  /** Generate an array of page numbers for the pagination UI. */
  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // ── Delete Resident ──

  /**
   * Open the delete-confirmation modal for the given resident.
   * @param resident - The resident to mark for deletion.
   */
  deleteResident(resident: Resident): void {
    this.residentToDelete = resident;
    this.showDeleteModal = true;
  }

  /** Close the delete modal without taking action. */
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.residentToDelete = null;
  }

  /**
   * Execute the deletion of the selected resident, then log an audit entry.
   * Saves resident data to local constants before cancelDelete() clears
   * this.residentToDelete to null.
   */
  confirmDelete(): void {
    if (!this.residentToDelete) return;

    this.isDeleting = true;

    // Save the data to constants before cancelDelete()
    // clears this.residentToDelete to null.
    const deletedName = this.residentToDelete.name;
    const deletedId = this.residentToDelete.id;
    const deletedLocationId = this.residentToDelete.location_id;

    this.fleetService.deleteResident(deletedId).subscribe({
      next: () => {
        // --- Audit log entry for deletion ---
        this.fleetService
          .createAuditLog({
            location_id: deletedLocationId || 1,
            locker_id: undefined, // Not tied to a specific locker
            event_type: 'USER_DELETED',
            severity: 'WARNING',
            description: `${this.currentAdminName} heeft bewoner '${deletedName}' (ID: ${deletedId}) verwijderd.`,
          })
          .subscribe();
        // -------------------------------------------------

        this.isDeleting = false;
        this.cancelDelete();
        this.loadResidents();
      },
      error: (err) => {
        this.isDeleting = false;
        alert('Fout bij verwijderen: ' + (err.error?.detail || 'Onbekende fout'));
        this.cancelDelete();
      },
    });
  }

  // ── Key / PIN Code Generation ──

  /**
   * Open the key/PIN modal and request credentials for the given resident.
   * @param resident - The resident to generate credentials for.
   */
  generateCode(resident: Resident): void {
    this.residentForKey = resident;
    this.showKeyModal = true;
    this.isGeneratingKey = true;
    this.generatedPin = '';
    this.keyErrorMessage = ''; // Reset any previous error messages

    this.fleetService.generateCredentials(resident.id).subscribe({
      next: (res) => {
        this.generatedPin = res.debug_pin;
        this.isGeneratingKey = false;

        this.fleetService
          .createAuditLog({
            location_id: resident.location_id || 1,
            locker_id: undefined,
            event_type: 'CREDENTIALS_GENERATED',
            severity: 'INFO',
            description: `${this.currentAdminName} heeft handmatig een toegangscode opgevraagd voor bewoner '${resident.name}'.`,
          })
          .subscribe();

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isGeneratingKey = false;

        // Check for the specific 400 error meaning "no parcels"
        if (err.status === 400) {
          this.keyErrorMessage =
            'Deze bewoner heeft momenteel geen pakjes in de kluiswand. Er is geen afhaalcode nodig.';
        } else {
          // Fallback for other server errors (e.g. 500)
          this.keyErrorMessage =
            err.error?.detail ||
            'Er is een onbekende fout opgetreden bij het genereren van de code.';
        }

        // Intentionally keep the modal open so the user can read the error
        this.cdr.detectChanges();
      },
    });
  }

  /** Close the key/PIN modal and reset its state. */
  closeKeyModal(): void {
    this.showKeyModal = false;
    this.residentForKey = null;
    this.generatedPin = '';
    this.keyErrorMessage = ''; // Reset error on close
  }

  /**
   * Close the key modal when the user clicks the backdrop overlay.
   * @param event - The mouse event from the backdrop click.
   */
  onBackdropClickKey(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeKeyModal();
    }
  }

  // ── Add / Edit Resident Modal ──

  /** Open the resident form modal in "create" mode with empty fields. */
  addResident(): void {
    this.errorMessage = '';
    this.isEditMode = false;
    this.editingResidentId = null;

    // Clear fields for a new resident
    this.newResident = {
      name: '',
      email: '',
      unit_number: '',
      phone: '',
      location_id: this.locations.length > 0 ? this.locations[0].id : null,
    };

    this.showAddModal = true;
  }

  /** Close the add/edit modal. */
  closeModal(): void {
    this.showAddModal = false;
  }

  /**
   * Close the add/edit modal when the user clicks the backdrop overlay.
   * Checks whether the click target is exactly the overlay (currentTarget)
   * so that clicking or dragging inside the white popup box does not close it.
   * @param event - The mouse event from the backdrop click.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Validate the resident form data and submit it.
   * Trims whitespace, validates name/unit/phone/email formats,
   * then either creates (POST) or updates (PUT) the resident.
   */
  submitNewResident(): void {
    // 1. Trim leading/trailing whitespace
    this.newResident.name = this.newResident.name.trim();
    this.newResident.email = this.newResident.email.toLowerCase().trim();
    this.newResident.unit_number = this.newResident.unit_number.trim();
    this.newResident.phone = this.newResident.phone ? this.newResident.phone.trim() : '';

    // 2. Basic check: are required fields still non-empty after trimming?
    if (!this.newResident.name || !this.newResident.email || !this.newResident.unit_number) {
      this.errorMessage =
        'Naam, e-mailadres en bus/unit zijn verplicht en mogen niet alleen uit spaties bestaan.';
      return;
    }

    // 3. Strict name validation — only letters, spaces, hyphens and apostrophes
    // The À-ÿ range allows accented letters (e.g. é, ç, ë).
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (!nameRegex.test(this.newResident.name)) {
      this.errorMessage =
        'De naam mag alleen letters, spaties, koppeltekens en apostrofs bevatten.';
      return;
    }

    // 4. Strict unit/bus validation — only letters, digits, spaces, hyphens and slashes
    const unitRegex = /^[a-zA-Z0-9\s\/\-]+$/;
    if (!unitRegex.test(this.newResident.unit_number)) {
      this.errorMessage = 'De bus/unit bevat ongeldige tekens (gebruik bijv. 12A, B-4 of 101/2).';
      return;
    }

    // 5. Phone validation — only when filled in
    if (this.newResident.phone) {
      // May start with +, then only digits, spaces, hyphens or parentheses (8–20 chars)
      const phoneRegex = /^[\+]?[0-9\s\-()]{8,20}$/;
      if (!phoneRegex.test(this.newResident.phone)) {
        this.errorMessage = 'Voer een geldig telefoonnummer in (bijv. +32 400 00 00 00).';
        return;
      }
    }

    // 6. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newResident.email)) {
      this.errorMessage = 'Voer een geldig e-mailadres in (bijv. naam@domein.be).';
      return;
    }

    // If we reach this point, all data is clean and safe

    this.isSaving = true;
    this.errorMessage = '';

    // Determine whether to create (POST) or update (PUT)
    if (this.isEditMode && this.editingResidentId) {
      // --- Audit log entry for editing ---
      this.fleetService.updateResident(this.editingResidentId, this.newResident).subscribe({
        next: () => {
          this.fleetService
            .createAuditLog({
              location_id: this.newResident.location_id || 1,
              locker_id: undefined, // No specific locker
              event_type: 'USER_UPDATED',
              severity: 'INFO',
              description: `${this.currentAdminName} heeft de gegevens van bewoner '${this.newResident.name}' (ID: ${this.editingResidentId}) bewerkt.`,
            })
            .subscribe();
          // -----------------------------------------------

          this.isSaving = false;
          this.closeModal();
          this.loadResidents();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het bewerken.';
        },
      });
    } else {
      this.fleetService.createResident(this.newResident).subscribe({
        next: () => {
          // --- Audit log entry for creation ---
          this.fleetService
            .createAuditLog({
              location_id: this.newResident.location_id || 1,
              locker_id: undefined,
              event_type: 'USER_CREATED',
              severity: 'INFO',
              description: `${this.currentAdminName} heeft een nieuwe bewoner '${this.newResident.name}' aangemaakt.`,
            })
            .subscribe();
          // -----------------------------------------------

          this.isSaving = false;
          this.closeModal();
          this.loadResidents();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het opslaan.';
        },
      });
    }
  }

  /**
   * Open the resident form modal in "edit" mode, prepopulated with the
   * given resident's data. A copy is made so the table row is not modified
   * before the user clicks "Save".
   * @param resident - The resident whose data should be loaded into the form.
   */
  editResident(resident: Resident): void {
    this.errorMessage = '';
    this.isEditMode = true;
    this.editingResidentId = resident.id;

    // Copy the data so we don't accidentally modify the table row
    // before the user clicks "Save".
    this.newResident = {
      name: resident.name,
      email: resident.email,
      unit_number: resident.unit_number || '',
      phone: resident.phone || '',
      location_id:
        resident.location_id || (this.locations.length > 0 ? this.locations[0].id : null),
    };

    // Open the same form for editing
    this.showAddModal = true;
  }

  // ── Location Display Helper ──

  /**
   * Resolve a location ID to its human-readable name.
   * @param locationId - The location ID to look up.
   * @returns The location name, or a fallback string if not found.
   */
  getLocationName(locationId: number | null | undefined): string {
    if (!locationId) return '—';

    // Look up the location in the already-loaded array
    const location = this.locations.find((loc) => loc.id === locationId);

    // Return the name, or a fallback if locations are still loading
    return location ? location.name : `Locatie ${locationId}`;
  }
}
