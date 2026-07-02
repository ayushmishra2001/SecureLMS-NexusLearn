import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LocationDto {
  id?: number;
  code?: string;
  name?: string;
  status?: string;
  parentId?: number;
  
  population?: number;
  pinCode?: string;
  latitude?: string;
  longitude?: string;
  
  countryId?: number;
  stateId?: number;
  districtId?: number;
  blockId?: number;
  panchayatId?: number;
}

export interface LocationAuditLogDto {
  auditId: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: string;
  newValue: string;
  performedBy: string;
  performedAt: string;
  parsedChanges?: { field: string; old: any; new: any }[];
}

@Injectable({
  providedIn: 'root'
})
export class LocationMasterService {
  private http = inject(HttpClient);
  private apiUrl = '/api/locations';

  getLocations(level: string, parentId?: number, status?: string): Observable<LocationDto[]> {
    let params = new HttpParams();
    if (parentId) params = params.set('parentId', parentId.toString());
    if (status) params = params.set('status', status);
    
    return this.http.get<LocationDto[]>(`${this.apiUrl}/${level}`, { params });
  }

  saveLocation(level: string, dto: LocationDto): Observable<LocationDto> {
    return this.http.post<LocationDto>(`${this.apiUrl}/${level}`, dto);
  }

  updateLocation(level: string, id: number, dto: LocationDto): Observable<LocationDto> {
    return this.http.put<LocationDto>(`${this.apiUrl}/${level}/${id}`, dto);
  }

  deleteLocation(level: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${level}/${id}`);
  }

  getAuditLogs(level: string, id: number): Observable<LocationAuditLogDto[]> {
    return this.http.get<LocationAuditLogDto[]>(`${this.apiUrl}/${level}/${id}/audit`);
  }

  getAllAuditLogs(level: string): Observable<LocationAuditLogDto[]> {
    return this.http.get<LocationAuditLogDto[]>(`${this.apiUrl}/${level}/audit`);
  }
}
