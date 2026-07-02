import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ApiResponse,
    User,
    Course,
    CourseModule,
    Enrollment,
    CourseRequest,
    ModuleRequest,
    PasswordExpiryStatus,
    NavbarGlobalGroup,
    GlobalLink,
    FunctionLink,
    PrimaryLink,
    ReorderItem,
    PermissionFlags,
    UserPermissionUserOption,
    UserPermissionByUserResponse,
    UserPermissionSaveRequest,
    RoleMaster,
    GroupMaster,
    PaginatedResponse,
    PermissionListResponse
} from '../models';

export interface AdminUserFilters {
    q?: string;
    role?: string;
    active?: '' | 'true' | 'false';
    locked?: '' | 'true' | 'false';
}

export interface AuditLogFilters {
    q?: string;
    outcome?: '' | 'SUCCESS' | 'FAILURE';
    role?: string;
    eventType?: string;
    fromDate?: string;
    toDate?: string;
}

export interface AuditLogEntry {
    id: number;
    userId: number | null;
    fullName: string | null;
    username: string | null;
    email: string | null;
    role: string | null;
    eventType: string;
    outcome: string;
    ipAddress: string | null;
    browser: string | null;
    contextInfo: string | null;
    details: string | null;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Bulk upload locations
  uploadLocations(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.base + '/locations/upload', formData);
  }
    private base = '/api';

    constructor(private http: HttpClient) { }

    // ── Auth ──────────────────────────────────────────────────────────────────
    login(identifier: string, password: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.base}/auth/login`, { identifier, password });
    }

    requestOtp(identifier: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.base}/auth/otp-request`, { identifier });
    }

    verifyOtp(preAuthToken: string, otp: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.base}/auth/verify-otp`, { preAuthToken, otp });
    }

    register(payload: any): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.base}/auth/register`, payload);
    }

    getRegistrationRoles(): Observable<ApiResponse<RoleMaster[]>> {
        const url = `${this.base}/auth/registration-roles`;
        return this.http.get<ApiResponse<RoleMaster[]>>(url);
    }

    getMe(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.base}/auth/me`);
    }

    getAuthSession(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.base}/auth/session`);
    }

    getProfile(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.base}/auth/profile`);
    }

    updateProfile(payload: any): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.base}/auth/profile`, payload);
    }

    changePassword(payload: any): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.base}/auth/change-password`, payload);
    }

    forgotPassword(email: string): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.base}/auth/forgot-password`, { email });
    }

    validateResetToken(token: string): Observable<ApiResponse<{ valid: boolean }>> {
        return this.http.get<ApiResponse<{ valid: boolean }>>(`${this.base}/auth/reset-password/validate`, {
            params: new HttpParams().set('token', token)
        });
    }

    resetPassword(token: string, newPassword: string, confirmNewPassword: string): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.base}/auth/reset-password`, { token, newPassword, confirmNewPassword });
    }

    getCsrf(): Observable<any> {
        return this.http.get(`${this.base}/auth/csrf`);
    }

    getPasswordExpiryStatus(): Observable<ApiResponse<PasswordExpiryStatus>> {
        return this.http.get<ApiResponse<PasswordExpiryStatus>>(`${this.base}/auth/password-expiry-status`);
    }

    // ── Admin: Users ──────────────────────────────────────────────────────────
    getAdminUsers(filters?: AdminUserFilters): Observable<ApiResponse<User[]>> {
        let params = new HttpParams();
        if (filters?.q?.trim()) params = params.set('q', filters.q.trim());
        if (filters?.role) params = params.set('role', filters.role);
        if (filters?.active) params = params.set('active', filters.active);
        if (filters?.locked) params = params.set('locked', filters.locked);
        return this.http.get<ApiResponse<User[]>>(`${this.base}/admin/users`, { params });
    }

    createAdminUser(payload: any): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(`${this.base}/admin/users`, payload);
    }

    updateAdminUser(id: number, payload: any): Observable<ApiResponse<User>> {
        return this.http.put<ApiResponse<User>>(`${this.base}/admin/users/${id}`, payload);
    }

    deleteAdminUser(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/users/${id}`);
    }

    toggleUserLock(id: number): Observable<ApiResponse<void>> {
        return this.http.patch<ApiResponse<void>>(`${this.base}/admin/users/${id}/toggle-lock`, {});
    }

    toggleUserActive(id: number): Observable<ApiResponse<void>> {
        return this.http.patch<ApiResponse<void>>(`${this.base}/admin/users/${id}/toggle-active`, {});
    }

    getRoles(includeInactive: boolean = true, assignableOnly: boolean = false, groupIds?: number[]): Observable<ApiResponse<RoleMaster[]>> {
        let params = new HttpParams()
            .set('includeInactive', String(includeInactive))
            .set('assignableOnly', String(assignableOnly));
        if (groupIds && groupIds.length > 0) {
            params = params.set('groupIds', groupIds.join(','));
        }
        return this.http.get<ApiResponse<RoleMaster[]>>(`${this.base}/admin/roles`, { params });
    }

    createRole(payload: Partial<RoleMaster>): Observable<ApiResponse<RoleMaster>> {
        return this.http.post<ApiResponse<RoleMaster>>(`${this.base}/admin/roles`, payload);
    }

    updateRole(id: number, payload: Partial<RoleMaster>): Observable<ApiResponse<RoleMaster>> {
        return this.http.put<ApiResponse<RoleMaster>>(`${this.base}/admin/roles/${id}`, payload);
    }

    setRoleActive(id: number, active: boolean): Observable<ApiResponse<RoleMaster>> {
        return this.http.patch<ApiResponse<RoleMaster>>(`${this.base}/admin/roles/${id}/status`, { active });
    }

    deleteRole(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/roles/${id}`);
    }

    getRolePermissions(roleId: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.base}/admin/roles/${roleId}/permissions`);
    }

    saveRolePermissions(roleId: number, payload: { permissions: UserPermissionSaveRequest['permissions'] }): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.base}/admin/roles/${roleId}/permissions`, payload);
    }

    getGroups(active?: boolean): Observable<ApiResponse<GroupMaster[]>> {
        let params = new HttpParams();
        if (active != null) params = params.set('active', String(active));
        return this.http.get<ApiResponse<GroupMaster[]>>(`${this.base}/admin/groups`, { params });
    }

    getGroupPermissions(groupId: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.base}/admin/groups/${groupId}/permissions`);
    }

    saveGroupPermissions(groupId: number, payload: { permissions: UserPermissionSaveRequest['permissions'] }): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.base}/admin/groups/${groupId}/permissions`, payload);
    }

    getPaginatedGroupPermissions(q?: string, page: number = 0, size: number = 20): Observable<ApiResponse<{content: any[], totalElements: number}>> {
        let params = new HttpParams().set('page', String(page)).set('size', String(size));
        if (q) params = params.set('q', q);
        return this.http.get<ApiResponse<{content: any[], totalElements: number}>>(`${this.base}/admin/groups/permissions/list`, { params });
    }

    deleteGroupPermission(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/groups/permissions/${id}`);
    }

    // ── Navbar / Link Management ──────────────────────────────────────────────
    getNavbarMenu(): Observable<ApiResponse<NavbarGlobalGroup[]>> {
        return this.http.get<ApiResponse<NavbarGlobalGroup[]>>(`${this.base}/navbar/menu`);
    }

    getGlobalLinks(includeInactive: boolean = true): Observable<ApiResponse<GlobalLink[]>> {
        return this.http.get<ApiResponse<GlobalLink[]>>(`${this.base}/global-links`, {
            params: new HttpParams().set('includeInactive', String(includeInactive))
        });
    }

    createGlobalLink(payload: { displayName: string; isActive?: boolean }): Observable<ApiResponse<GlobalLink>> {
        return this.http.post<ApiResponse<GlobalLink>>(`${this.base}/global-links`, payload);
    }

    updateGlobalLink(id: number, payload: { displayName: string; isActive?: boolean }): Observable<ApiResponse<GlobalLink>> {
        return this.http.put<ApiResponse<GlobalLink>>(`${this.base}/global-links/${id}`, payload);
    }

    deleteGlobalLink(id: number): Observable<ApiResponse<GlobalLink>> {
        return this.http.delete<ApiResponse<GlobalLink>>(`${this.base}/global-links/${id}`);
    }

    reorderGlobalLinks(items: ReorderItem[]): Observable<ApiResponse<GlobalLink[]>> {
        return this.http.patch<ApiResponse<GlobalLink[]>>(`${this.base}/global-links/reorder`, items);
    }

    getFunctionLinks(includeInactive: boolean = true): Observable<ApiResponse<FunctionLink[]>> {
        return this.http.get<ApiResponse<FunctionLink[]>>(`${this.base}/function-links`, {
            params: new HttpParams().set('includeInactive', String(includeInactive))
        });
    }

    createFunctionLink(payload: { displayName: string; routePath?: string; isActive?: boolean }): Observable<ApiResponse<FunctionLink>> {
        return this.http.post<ApiResponse<FunctionLink>>(`${this.base}/function-links`, payload);
    }

    updateFunctionLink(id: number, payload: { displayName: string; routePath?: string; isActive?: boolean }): Observable<ApiResponse<FunctionLink>> {
        return this.http.put<ApiResponse<FunctionLink>>(`${this.base}/function-links/${id}`, payload);
    }

    deleteFunctionLink(id: number): Observable<ApiResponse<FunctionLink>> {
        return this.http.delete<ApiResponse<FunctionLink>>(`${this.base}/function-links/${id}`);
    }

    reorderFunctionLinks(items: ReorderItem[]): Observable<ApiResponse<FunctionLink[]>> {
        return this.http.patch<ApiResponse<FunctionLink[]>>(`${this.base}/function-links/reorder`, items);
    }

    getPrimaryLinks(globalLinkId?: number, functionLinkId?: number): Observable<ApiResponse<PrimaryLink[]>> {
        let params = new HttpParams();
        if (globalLinkId != null) params = params.set('globalLinkId', String(globalLinkId));
        if (functionLinkId != null) params = params.set('functionLinkId', String(functionLinkId));
        return this.http.get<ApiResponse<PrimaryLink[]>>(`${this.base}/primary-links`, { params });
    }

    createPrimaryLink(payload: { globalLinkId: number; functionLinkId: number; displayName: string; isActive?: boolean }): Observable<ApiResponse<PrimaryLink>> {
        return this.http.post<ApiResponse<PrimaryLink>>(`${this.base}/primary-links`, payload);
    }

    updatePrimaryLink(id: number, payload: { globalLinkId: number; functionLinkId: number; displayName: string; isActive?: boolean }): Observable<ApiResponse<PrimaryLink>> {
        return this.http.put<ApiResponse<PrimaryLink>>(`${this.base}/primary-links/${id}`, payload);
    }

    deletePrimaryLink(id: number): Observable<ApiResponse<PrimaryLink>> {
        return this.http.delete<ApiResponse<PrimaryLink>>(`${this.base}/primary-links/${id}`);
    }

    reorderPrimaryLinks(items: ReorderItem[]): Observable<ApiResponse<PrimaryLink[]>> {
        return this.http.patch<ApiResponse<PrimaryLink[]>>(`${this.base}/primary-links/reorder`, items);
    }

    // ── User Permissions ──────────────────────────────────────────────────────
    getUserPermissionUsers(q?: string, groupIds?: number[], roleIds?: number[]): Observable<ApiResponse<UserPermissionUserOption[]>> {
        let params = new HttpParams();
        if (q) params = params.set('q', q);
        if (groupIds && groupIds.length > 0) params = params.set('groupIds', groupIds.join(','));
        if (roleIds && roleIds.length > 0) params = params.set('roleIds', roleIds.join(','));
        return this.http.get<ApiResponse<UserPermissionUserOption[]>>(`${this.base}/user-permissions/users`, { params });
    }

    getUserPermissions(userId: number): Observable<ApiResponse<UserPermissionByUserResponse>> {
        return this.http.get<ApiResponse<UserPermissionByUserResponse>>(`${this.base}/user-permissions/${userId}`);
    }

    saveUserPermissions(payload: UserPermissionSaveRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.base}/user-permissions/save`, payload);
    }

    getPaginatedRolePermissions(q?: string, page: number = 0, size: number = 20): Observable<ApiResponse<{content: any[], totalElements: number}>> {
        let params = new HttpParams().set('page', String(page)).set('size', String(size));
        if (q) params = params.set('q', q);
        return this.http.get<ApiResponse<{content: any[], totalElements: number}>>(`${this.base}/admin/roles/permissions/list`, { params });
    }

    deleteRolePermission(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/roles/permissions/${id}`);
    }

    getPaginatedUserPermissions(q?: string, page: number = 0, size: number = 20): Observable<ApiResponse<{content: any[], totalElements: number}>> {
        let params = new HttpParams().set('page', String(page)).set('size', String(size));
        if (q) params = params.set('q', q);
        return this.http.get<ApiResponse<{content: any[], totalElements: number}>>(`${this.base}/user-permissions/list`, { params });
    }

    deleteUserPermission(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/user-permissions/${id}`);
    }

    // ── Admin: Courses ────────────────────────────────────────────────────────
    getAdminCourses(): Observable<ApiResponse<Course[]>> {
        return this.http.get<ApiResponse<Course[]>>(`${this.base}/admin/courses`);
    }

    getAdminCourse(id: number): Observable<ApiResponse<Course>> {
        return this.http.get<ApiResponse<Course>>(`${this.base}/admin/courses/${id}`);
    }

    createAdminCourse(payload: CourseRequest): Observable<ApiResponse<Course>> {
        return this.http.post<ApiResponse<Course>>(`${this.base}/admin/courses`, payload);
    }

    updateAdminCourse(id: number, payload: CourseRequest): Observable<ApiResponse<Course>> {
        return this.http.put<ApiResponse<Course>>(`${this.base}/admin/courses/${id}`, payload);
    }

    deleteAdminCourse(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/courses/${id}`);
    }

    getAdminCourseModules(courseId: number): Observable<ApiResponse<CourseModule[]>> {
        return this.http.get<ApiResponse<CourseModule[]>>(`${this.base}/admin/courses/${courseId}/modules`);
    }

    createAdminModule(payload: ModuleRequest): Observable<ApiResponse<CourseModule>> {
        return this.http.post<ApiResponse<CourseModule>>(`${this.base}/admin/modules`, payload);
    }

    updateAdminModule(id: number, payload: ModuleRequest): Observable<ApiResponse<CourseModule>> {
        return this.http.put<ApiResponse<CourseModule>>(`${this.base}/admin/modules/${id}`, payload);
    }

    deleteAdminModule(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/admin/modules/${id}`);
    }

    getAdminCourseEnrollments(courseId: number): Observable<ApiResponse<Enrollment[]>> {
        return this.http.get<ApiResponse<Enrollment[]>>(`${this.base}/admin/courses/${courseId}/enrollments`);
    }

    // ── Admin: Audit Logs ─────────────────────────────────────────────────────
    getAuditLogs(
        tab: 'registrations' | 'logins' | 'all',
        page: number = 0,
        size: number = 20,
        filters?: AuditLogFilters
    ): Observable<ApiResponse<any>> {
        const endpoint = tab === 'registrations'
            ? 'security-events/registrations'
            : tab === 'logins'
                ? 'security-events/logins'
                : 'security-events';
        let params = new HttpParams().set('page', String(page)).set('size', String(size));
        if (filters?.q?.trim()) params = params.set('q', filters.q.trim());
        if (filters?.outcome) params = params.set('outcome', filters.outcome);
        if (filters?.role) params = params.set('role', filters.role);
        if (filters?.eventType?.trim()) params = params.set('eventType', filters.eventType.trim());
        if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
        if (filters?.toDate) params = params.set('toDate', filters.toDate);
        return this.http.get<ApiResponse<any>>(`${this.base}/admin/${endpoint}`, { params });
    }

    getAuditLogsByUser(
        userId: number,
        page: number = 0,
        size: number = 20,
        filters?: AuditLogFilters
    ): Observable<ApiResponse<any>> {
        let params = new HttpParams().set('page', String(page)).set('size', String(size));
        if (filters?.q?.trim()) params = params.set('q', filters.q.trim());
        if (filters?.outcome) params = params.set('outcome', filters.outcome);
        if (filters?.role) params = params.set('role', filters.role);
        if (filters?.eventType?.trim()) params = params.set('eventType', filters.eventType.trim());
        if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
        if (filters?.toDate) params = params.set('toDate', filters.toDate);
        return this.http.get<ApiResponse<any>>(`${this.base}/admin/users/${userId}/audit`, { params });
    }

    // ── Trainer ───────────────────────────────────────────────────────────────
    getTrainerCourses(): Observable<ApiResponse<Course[]>> {
        return this.http.get<ApiResponse<Course[]>>(`${this.base}/trainer/courses`);
    }

    getTrainerCourse(id: number): Observable<ApiResponse<Course>> {
        return this.http.get<ApiResponse<Course>>(`${this.base}/trainer/courses/${id}`);
    }

    createTrainerCourse(payload: CourseRequest): Observable<ApiResponse<Course>> {
        return this.http.post<ApiResponse<Course>>(`${this.base}/trainer/courses`, payload);
    }

    updateTrainerCourse(id: number, payload: CourseRequest): Observable<ApiResponse<Course>> {
        return this.http.put<ApiResponse<Course>>(`${this.base}/trainer/courses/${id}`, payload);
    }

    deleteTrainerCourse(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/trainer/courses/${id}`);
    }

    getTrainerCourseModules(courseId: number): Observable<ApiResponse<CourseModule[]>> {
        return this.http.get<ApiResponse<CourseModule[]>>(`${this.base}/trainer/courses/${courseId}/modules`);
    }

    createTrainerModule(payload: ModuleRequest): Observable<ApiResponse<CourseModule>> {
        return this.http.post<ApiResponse<CourseModule>>(`${this.base}/trainer/modules`, payload);
    }

    updateTrainerModule(id: number, payload: ModuleRequest): Observable<ApiResponse<CourseModule>> {
        return this.http.put<ApiResponse<CourseModule>>(`${this.base}/trainer/modules/${id}`, payload);
    }

    deleteTrainerModule(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/trainer/modules/${id}`);
    }

    getTrainerCourseEnrollments(courseId: number): Observable<ApiResponse<Enrollment[]>> {
        return this.http.get<ApiResponse<Enrollment[]>>(`${this.base}/trainer/courses/${courseId}/enrollments`);
    }

    updateTrainerProfile(payload: any): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.base}/trainer/profile`, payload);
    }

    // ── Student ───────────────────────────────────────────────────────────────
    getStudentCourses(): Observable<ApiResponse<Course[]>> {
        return this.http.get<ApiResponse<Course[]>>(`${this.base}/student/courses`);
    }

    getStudentCourse(id: number): Observable<ApiResponse<Course>> {
        return this.http.get<ApiResponse<Course>>(`${this.base}/student/courses/${id}`);
    }

    getStudentCourseModules(courseId: number): Observable<ApiResponse<CourseModule[]>> {
        return this.http.get<ApiResponse<CourseModule[]>>(`${this.base}/student/courses/${courseId}/modules`);
    }

    getMyEnrollments(): Observable<ApiResponse<Enrollment[]>> {
        return this.http.get<ApiResponse<Enrollment[]>>(`${this.base}/student/enrollments`);
    }

    enrollInCourse(courseId: number): Observable<ApiResponse<Enrollment>> {
        return this.http.post<ApiResponse<Enrollment>>(`${this.base}/student/enroll/${courseId}`, {});
    }

    unenrollFromCourse(courseId: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.base}/student/unenroll/${courseId}`);
    }

    updateModuleProgress(courseId: number, moduleId: number, completed: boolean): Observable<ApiResponse<void>> {
        return this.http.patch<ApiResponse<void>>(
            `${this.base}/student/courses/${courseId}/modules/${moduleId}/progress`,
            null,
            { params: new HttpParams().set('completed', completed.toString()) }
        );
    }

    // ── Export helpers ────────────────────────────────────────────────────────
    getAllUsersForExport(filters: AdminUserFilters): Observable<ApiResponse<User[]>> {
        let params = new HttpParams();
        if (filters.q) params = params.set('q', filters.q);
        if (filters.role) params = params.set('role', filters.role);
        if (filters.active) params = params.set('active', filters.active);
        if (filters.locked) params = params.set('locked', filters.locked);
        return this.http.get<ApiResponse<User[]>>(`${this.base}/admin/users`, { params });
    }

    getAllAuditLogsForExport(tab: string, filters: AuditLogFilters): Observable<ApiResponse<{ content: AuditLogEntry[]; totalElements: number }>> {
        let params = new HttpParams().set('tab', tab).set('page', '0').set('size', '9999');
        if (filters.q) params = params.set('q', filters.q);
        if (filters.outcome) params = params.set('outcome', filters.outcome);
        if (filters.role) params = params.set('role', filters.role);
        if (filters.eventType) params = params.set('eventType', filters.eventType);
        if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
        if (filters.toDate) params = params.set('toDate', filters.toDate);
        return this.http.get<ApiResponse<{ content: AuditLogEntry[]; totalElements: number }>>(`${this.base}/admin/audit-logs`, { params });
    }

    exportUsersPdf(filters: AdminUserFilters): Observable<Blob> {
        let params = new HttpParams();
        if (filters.q) params = params.set('q', filters.q);
        if (filters.role) params = params.set('role', filters.role);
        if (filters.active) params = params.set('active', filters.active);
        if (filters.locked) params = params.set('locked', filters.locked);
        return this.http.get(`${this.base}/export/users/pdf`, { params, responseType: 'blob' });
    }

    exportCoursesPdf(): Observable<Blob> {
        return this.http.get(`${this.base}/export/courses/pdf`, { responseType: 'blob' });
    }

    exportModulesPdf(courseId?: number | null): Observable<Blob> {
        let params = new HttpParams();
        if (courseId) params = params.set('courseId', courseId.toString());
        return this.http.get(`${this.base}/export/modules/pdf`, { params, responseType: 'blob' });
    }

    exportEnrollmentsPdf(courseId: number): Observable<Blob> {
        const params = new HttpParams().set('courseId', courseId.toString());
        return this.http.get(`${this.base}/export/enrollments/pdf`, { params, responseType: 'blob' });
    }

    exportAuditLogsPdf(tab: string, filters: AuditLogFilters): Observable<Blob> {
        let params = new HttpParams().set('tab', tab);
        if (filters.q) params = params.set('q', filters.q);
        if (filters.outcome) params = params.set('outcome', filters.outcome);
        if (filters.role) params = params.set('role', filters.role);
        if (filters.eventType) params = params.set('eventType', filters.eventType);
        if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
        if (filters.toDate) params = params.set('toDate', filters.toDate);
        return this.http.get(`${this.base}/export/audit-logs/pdf`, { params, responseType: 'blob' });
    }

    exportMyEnrollmentsPdf(): Observable<Blob> {
        return this.http.get(`${this.base}/export/my-enrollments/pdf`, { responseType: 'blob' });
    }
}



