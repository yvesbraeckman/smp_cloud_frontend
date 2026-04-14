export interface DashboardKPIs {
  parcels_today: number;
  active_walls: number;
  total_walls: number;
  offline_locations: number;
  open_errors: number;
}

export interface Wall {
  id: number;
  name: string;
  status: string; 
  occupancy: string; 
  active_alarms: number;
  last_sync: string | null;
}

export interface Locker {
  id: number;
  location_id: number;
  size: 'S' | 'M' | 'L';
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Error' | 'Return';
  shadow_state: any; 
}

export interface WallDetail {
  location_id: number;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  last_sync: string;
  lockers: Locker[];
}

export interface LockerDetail {
  id: number;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Error' | 'Return';
  size: 'S' | 'M' | 'L';
  shadow_state: any;
  parcel_id: number | null;
  parcel_status: string | null;
  courier: string | null;
  delivery_time: string | null;
  resident_name: string | null;
  resident_unit: string | null;
}

export interface Resident {
  id: number;
  location_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  unit_number: string | null;
  created_at: string;
}

export interface ResidentPaginatedResponse {
  items: Resident[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  locker_id: number | null;
  event_type: string;
  severity: string;
  description: string;
  location_name?: string;
}