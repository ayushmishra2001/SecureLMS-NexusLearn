import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupMaster, ApiResponse } from '../models';

export interface GroupRequest {
    groupName: string;
    description?: string;
    active: boolean;
    roleIds?: number[];
    userIds?: number[];
}

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private apiUrl = '/api/admin/groups';
    private publicApiUrl = '/api/auth/groups';

    constructor(private http: HttpClient) {}

    // Public endpoint for registration
    getPublicGroups(): Observable<GroupMaster[]> {
        return this.http.get<ApiResponse<GroupMaster[]>>(this.publicApiUrl)
            .pipe(map(res => res.data));
    }

    // Admin endpoints
    getAllGroups(): Observable<GroupMaster[]> {
        return this.http.get<ApiResponse<GroupMaster[]>>(this.apiUrl)
            .pipe(map(res => res.data));
    }

    getGroupById(id: number): Observable<GroupMaster> {
        return this.http.get<ApiResponse<GroupMaster>>(`${this.apiUrl}/${id}`)
            .pipe(map(res => res.data));
    }

    createGroup(request: GroupRequest): Observable<GroupMaster> {
        return this.http.post<ApiResponse<GroupMaster>>(this.apiUrl, request)
            .pipe(map(res => res.data));
    }

    updateGroup(id: number, request: GroupRequest): Observable<GroupMaster> {
        return this.http.put<ApiResponse<GroupMaster>>(`${this.apiUrl}/${id}`, request)
            .pipe(map(res => res.data));
    }

    toggleGroupStatus(id: number, active: boolean): Observable<GroupMaster> {
        return this.http.patch<ApiResponse<GroupMaster>>(`${this.apiUrl}/${id}/status`, { active })
            .pipe(map(res => res.data));
    }

    assignUsersToGroup(groupId: number, userIds: number[]): Observable<void> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${groupId}/users`, { userIds })
            .pipe(map(() => void 0));
    }
}
