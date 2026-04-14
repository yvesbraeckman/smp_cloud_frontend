import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardKPIs,
  Wall,
  WallDetail,
  LockerDetail,
  Resident,
  ResidentPaginatedResponse,
  AuditLog,
} from '../models/fleet.model';

/**
 * Fleet service that acts as the single point of communication with the
 * Smart Parcel Wall backend API.
 *
 * All endpoints are relative to `/api`, which is proxied to the FastAPI
 * backend via `proxy.conf.json` during development and via a reverse
 * proxy (e.g. Nginx) in production.
 */
@Injectable({
  providedIn: 'root',
})
export class Fleet {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // ── Dashboard ──────────────────────────────────────────────────────

  /** Fetch the key performance indicators for the fleet dashboard. */
  getDashboardKPIs(): Observable<DashboardKPIs> {
    return this.http.get<DashboardKPIs>(`${this.apiUrl}/dashboard/kpis`);
  }

  // ── Walls ───────────────────────────────────────────────────────────

  /**
   * Retrieve the list of locker walls, optionally filtered by search term
   * and online/offline status.
   *
   * The `status` parameter accepts frontend display values which are mapped
   * to the backend `ONLINE` / `OFFLINE` query parameters internally.
   */
  getWalls(search?: string, status?: string): Observable<Wall[]> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }

    // Map frontend dropdown values to backend query parameters
    if (status && status !== 'Alle Statussen') {
      const backendStatus = status === 'Alleen Online' ? 'ONLINE' : 'OFFLINE';
      params = params.set('status', backendStatus);
    }

    return this.http.get<Wall[]>(`${this.apiUrl}/walls`, { params });
  }

  /** Fetch detailed information for a single wall, including its lockers. */
  getWallDetail(wallId: number): Observable<WallDetail> {
    return this.http.get<WallDetail>(`${this.apiUrl}/walls/${wallId}`);
  }

  /** Create a new wall with the given name, address, and locker configuration. */
  createWall(wallData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/walls`, wallData);
  }

  /** Permanently delete a wall and all of its associated lockers. */
  deleteWall(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/walls/${id}`);
  }

  // ── Lockers & Maintenance ───────────────────────────────────────────

  /** Fetch detailed information for a single locker, including parcel and resident data. */
  getLockerDetail(lockerId: number): Observable<LockerDetail> {
    return this.http.get<LockerDetail>(`${this.apiUrl}/lockers/${lockerId}`);
  }

  /**
   * Send a remote-unlock command to a specific locker.
   *
   * @param locationId - The wall/location identifier the locker belongs to.
   * @param lockerId   - The identifier of the locker to unlock.
   * @param reason     - A free-text reason for the forced unlock (recorded in the audit log).
   */
  remoteUnlock(locationId: number, lockerId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/remote-unlock`, {
      location_id: locationId,
      locker_id: lockerId,
      reason: reason,
    });
  }

  /**
   * Toggle the service/maintenance mode for a specific locker.
   *
   * @param lockerId - The locker to put into or take out of maintenance.
   * @param status   - Expected values: `'Maintenance'` or `'Available'`.
   */
  setServiceMode(lockerId: number, status: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/service-mode`, {
      locker_id: lockerId,
      status: status,
    });
  }

  // ── Residents ───────────────────────────────────────────────────────

  /**
   * Retrieve a paginated list of residents.
   *
   * @param page   - Page number (1-based).
   * @param limit  - Number of items per page.
   * @param search - Optional search string to filter by name, email, or unit.
   */
  getResidents(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Observable<ResidentPaginatedResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ResidentPaginatedResponse>(`${this.apiUrl}/residents`, { params });
  }

  /** Create a new resident linked to a location. */
  createResident(residentData: any): Observable<Resident> {
    return this.http.post<Resident>(`${this.apiUrl}/residents`, residentData);
  }

  /** Update an existing resident's data. */
  updateResident(id: number, residentData: any): Observable<Resident> {
    return this.http.put<Resident>(`${this.apiUrl}/residents/${id}`, residentData);
  }

  /** Permanently delete a resident. */
  deleteResident(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/residents/${id}`);
  }

  /**
   * Generate a one-time access credential (QR code / PIN) for a resident.
   *
   * @param id - The resident identifier.
   */
  generateCredentials(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/residents/${id}/credentials/generate`, {});
  }

  // ── Audit Logs ──────────────────────────────────────────────────────

  /**
   * Retrieve audit log entries with optional filters.
   *
   * @param date       - ISO date string to filter by.
   * @param locationId - Wall/location identifier to filter by.
   * @param type       - Event type to filter by.
   * @param search     - Free-text search term.
   * @param limit      - Maximum number of entries to return (default 50).
   */
  getAuditLogs(
    date?: string,
    locationId?: string,
    type?: string,
    search?: string,
    limit: number = 50,
  ): Observable<AuditLog[]> {
    let params = new HttpParams().set('limit', limit.toString());

    if (date) params = params.set('date', date);
    if (locationId) params = params.set('location_id', locationId);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);

    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs`, { params });
  }

  /** Create a new audit log entry (e.g. to record admin actions from the frontend). */
  createAuditLog(logData: {
    location_id?: number;
    locker_id?: number;
    event_type: string;
    severity: string;
    description: string;
  }): Observable<AuditLog> {
    return this.http.post<AuditLog>(`${this.apiUrl}/logs`, logData);
  }

  /**
   * Export audit logs as a downloadable file (CSV).
   *
   * The `responseType: 'blob'` option is required to correctly handle
   * the binary file response.
   */
  exportAuditLogs(
    date?: string,
    locationId?: string,
    type?: string,
    search?: string,
  ): Observable<Blob> {
    let params = new HttpParams();

    if (date) params = params.set('date', date);
    if (locationId) params = params.set('location_id', locationId);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);

    return this.http.get(`${this.apiUrl}/logs/export`, { params, responseType: 'blob' });
  }

  // ── Admin & Settings ─────────────────────────────────────────────────

  /** Fetch the currently authenticated admin's profile. */
  getCurrentAdmin(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins/me`);
  }

  /** Update the currently authenticated admin's profile data. */
  updateCurrentAdmin(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admins/me`, data);
  }

  /** Change the currently authenticated admin's password. */
  updatePassword(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admins/me/password`, data);
  }

  /** List all admin accounts. */
  getAdmins(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admins`);
  }

  /** Create a new admin account. */
  createAdmin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins`, data);
  }

  /** Delete an admin account by ID. */
  deleteAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admins/${id}`);
  }
}
