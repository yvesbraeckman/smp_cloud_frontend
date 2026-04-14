import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Fleet } from '../../services/fleet';
import { AuditLog, Wall } from '../../models/fleet.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Audit log viewer component that displays a filterable, sortable table
 * of system events (deliveries, alarms, admin actions, hardware events).
 *
 * Supports filtering by date, location/wall, event type, and free-text
 * search. Logs can be exported as a CSV file.
 */
@Component({
  selector: 'app-logs-comp',
  imports: [FormsModule, CommonModule, Sidebar],
  templateUrl: './logs-comp.html',
  styleUrl: './logs-comp.scss',
})
export class LogsComp implements OnInit {
  /** List of walls for the location filter dropdown. */
  walls: Wall[] = [];

  /** Current audit log entries returned by the backend. */
  logs: AuditLog[] = [];

  /** Active filter values applied to the log query. */
  filters = {
    date: new Date().toISOString().split('T')[0], // Defaults to today
    locationId: '',
    type: '',
    search: '',
  };

  constructor(
    private fleetService: Fleet,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadWalls();
    this.loadLogs();
  }

  /** Fetch all walls to populate the location filter dropdown. */
  loadWalls(): void {
    this.fleetService.getWalls().subscribe({
      next: (data) => {
        this.walls = data;
        this.cdr.detectChanges();
      },
    });
  }

  /** Fetch audit logs from the backend using the current filter values. */
  loadLogs(): void {
    this.fleetService
      .getAuditLogs(
        this.filters.date,
        this.filters.locationId,
        this.filters.type,
        this.filters.search,
      )
      .subscribe({
        next: (data) => {
          this.logs = data;
          this.cdr.detectChanges(); // Force immediate UI update
        },
        error: (err) => console.error('Fout bij ophalen logs:', err),
      });
  }

  /** Reset all filters to their defaults (today, no location/type/search). */
  resetFilters(): void {
    this.filters = {
      date: new Date().toISOString().split('T')[0], // Reset to today
      locationId: '',
      type: '',
      search: '',
    };
    this.loadLogs();
  }

  /**
   * Export the current filtered logs as a CSV download.
   *
   * Creates a temporary `<a>` element to trigger the browser's
   * download behaviour with the blob returned by the backend.
   */
  exportCsv(): void {
    this.fleetService
      .exportAuditLogs(
        this.filters.date,
        this.filters.locationId,
        this.filters.type,
        this.filters.search,
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `smartwall_logs_${this.filters.date || 'export'}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.cdr.detectChanges(); // Force immediate UI update
        },
        error: (err) => console.error('Fout bij exporteren CSV:', err),
      });
  }

  /**
   * Return a CSS class name based on the log severity level.
   *
   * Used by `ngClass` to apply colour-coded status tags.
   */
  getLogTypeClass(severity: string): string {
    const sev = severity?.toLowerCase();
    if (sev === 'critical' || sev === 'error') return 'type-error';
    if (sev === 'warning') return 'type-warning';
    if (sev === 'admin') return 'type-admin';
    return 'type-info';
  }
}
