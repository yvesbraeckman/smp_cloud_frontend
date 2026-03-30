import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardKPIs, Wall, WallDetail, LockerDetail, Resident, ResidentPaginatedResponse, AuditLog } from '../models/fleet.model';


@Injectable({
  providedIn: 'root',
})
export class Fleet {
  // Let op: dankzij proxy.conf.json wordt '/api' netjes naar Nginx/FastAPI gestuurd
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getDashboardKPIs(): Observable<DashboardKPIs> {
    return this.http.get<DashboardKPIs>(`${this.apiUrl}/dashboard/kpis`);
  }

  getWalls(search?: string, status?: string): Observable<Wall[]> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }

    // Vertaal de frontend dropdown waardes naar de backend parameters
    if (status && status !== 'Alle Statussen') {
      const backendStatus = status === 'Alleen Online' ? 'ONLINE' : 'OFFLINE';
      params = params.set('status', backendStatus);
    }

    return this.http.get<Wall[]>(`${this.apiUrl}/walls`, { params });
  }

  getWallDetail(wallId: number): Observable<WallDetail> {
    return this.http.get<WallDetail>(`${this.apiUrl}/walls/${wallId}`);
  }

  getLockerDetail(lockerId: number): Observable<LockerDetail> {
    return this.http.get<LockerDetail>(`${this.apiUrl}/lockers/${lockerId}`);
  }

  remoteUnlock(locationId: number, lockerId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/remote-unlock`, {
      location_id: locationId,
      locker_id: lockerId,
      reason: reason
    });
  }

  setServiceMode(lockerId: number, status: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/service-mode`, {
      locker_id: lockerId,
      status: status
    });
  }

  getResidents(page: number = 1, limit: number = 10, search?: string): Observable<ResidentPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ResidentPaginatedResponse>(`${this.apiUrl}/residents`, { params });
  }

  deleteResident(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/residents/${id}`);
  }

  updateResident(id: number, residentData: any): Observable<Resident> {
  return this.http.put<Resident>(`${this.apiUrl}/residents/${id}`, residentData);
}

  generateCredentials(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/residents/${id}/credentials/generate`, {});
  }

  getAuditLogs(date?: string, locationId?: string, type?: string, search?: string, limit: number = 50): Observable<AuditLog[]> {
    let params = new HttpParams().set('limit', limit.toString());

    if (date) params = params.set('date', date);
    if (locationId) params = params.set('location_id', locationId);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);

    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs`, { params });
  }
  // --- POST LOG ---
  createAuditLog(logData: { location_id?: number, locker_id?: number, event_type: string, severity: string, description: string }): Observable<AuditLog> {
    return this.http.post<AuditLog>(`${this.apiUrl}/logs`, logData);
  }

  exportAuditLogs(date?: string, locationId?: string, type?: string, search?: string): Observable<Blob> {
    let params = new HttpParams();

    if (date) params = params.set('date', date);
    if (locationId) params = params.set('location_id', locationId);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);

    // Let op: responseType 'blob' is vereist voor het downloaden van bestanden
    return this.http.get(`${this.apiUrl}/logs/export`, { params, responseType: 'blob' });
  }

  createResident(residentData: any): Observable<Resident> {
    return this.http.post<Resident>(`${this.apiUrl}/residents`, residentData);
  }

  // --- ADMIN & SETTINGS ---
  getCurrentAdmin(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins/me`);
  }

  updateCurrentAdmin(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admins/me`, data);
  }

  updatePassword(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admins/me/password`, data);
  }

  getAdmins(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admins`);
  }

  createAdmin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins`, data);
  }

  deleteAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admins/${id}`);
  }

  createWall(wallData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/walls`, wallData);
  }

  // --- NIEUW: Muur verwijderen ---
  deleteWall(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/walls/${id}`);
  }
}
