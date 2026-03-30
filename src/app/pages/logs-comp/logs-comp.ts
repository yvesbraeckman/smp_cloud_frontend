import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Fleet } from '../../services/fleet';
import { AuditLog, Wall } from '../../models/fleet.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-logs-comp',
  imports: [FormsModule, CommonModule, Sidebar],
  templateUrl: './logs-comp.html',
  styleUrl: './logs-comp.scss',
})
export class LogsComp implements OnInit{
  walls: Wall[] = []; // Nieuwe array voor de dropdown
  logs: AuditLog[] = [];
  
  // Filter statussen
  filters = {
    date: new Date().toISOString().split('T')[0], // Vandaag als standaard
    locationId: '',
    type: '',
    search: ''
  };

  constructor(private fleetService: Fleet, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWalls()
    this.loadLogs();
  }

  loadWalls(): void {
    this.fleetService.getWalls().subscribe({
      next: (data) => {
        this.walls = data;
        this.cdr.detectChanges();
      }
    });
  }

  // Haal de logs op via de Fleet service
  loadLogs(): void {
    this.fleetService.getAuditLogs(
      this.filters.date,
      this.filters.locationId,
      this.filters.type,
      this.filters.search
    ).subscribe({
      next: (data) => {
        this.logs = data
        this.cdr.detectChanges(); // 2. Forceer Angular om de tabel DIRECT te tekenen!
      },
      error: (err) => console.error('Fout bij ophalen logs:', err)
    });
  }

  resetFilters(): void {
    this.filters = {
      date: new Date().toISOString().split('T')[0], // Zet terug naar vandaag
      locationId: '',
      type: '',
      search: ''
    };
    // Laad direct de schone lijst in
    this.loadLogs();
  }

  // Exporteer CSV via de Fleet service
  exportCsv(): void {
    this.fleetService.exportAuditLogs(
      this.filters.date,
      this.filters.locationId,
      this.filters.type,
      this.filters.search
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartwall_logs_${this.filters.date || 'export'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges(); // 2. Forceer Angular om de tabel DIRECT te tekenen!
      },
      error: (err) => console.error('Fout bij exporteren CSV:', err)
    });
  }

  // CSS classes toewijzen op basis van severity
  getLogTypeClass(severity: string): string {
    const sev = severity?.toLowerCase();
    if (sev === 'critical' || sev === 'error') return 'type-error';
    if (sev === 'warning') return 'type-warning';
    if (sev === 'admin') return 'type-admin';
    return 'type-info';
  }
}
