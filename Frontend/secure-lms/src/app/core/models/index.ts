export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface PermissionListResponse {
    id: number;
    entityType: string;
    entityId: number;
    entityName: string;
    functionLinkId: number;
    functionLinkName: string;
    globalLinkName: string;
    canView: boolean;
    canAdd: boolean;
    canManage: boolean;
}

export type Role = string;

export interface RoleMaster {
    id: number;
    code: string;
    displayName: string;
    description?: string | null;
    active: boolean;
    systemRole: boolean;
    assignable: boolean;
    sortOrder: number;
    clonePermissionsFromRoleId?: number | null;
    groupIds?: number[];
    userCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface GroupMaster {
    id: number;
    groupName: string;
    description?: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
    userCount?: number;
    roles?: RoleMaster[];
}

export interface User {
    id: number;
    username: string;
    email: string;
    role: Role;
    roleId?: number;
    roleName?: string;
    groupId?: number;
    groupName?: string;
    active: boolean;
    accountNonLocked: boolean;
    firstName?: string;
    lastName?: string;
    contactNumber?: string;
    aadharNumber?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthUser {
    id: number;
    username: string;
    email: string;
    role: Role;
    roleId?: number;
    roleName?: string;
    groupId?: number;
    groupName?: string;
}

export interface Course {
    id: number;
    title: string;
    description?: string;
    category?: string;
    difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    durationHours?: number;
    published: boolean;
    active: boolean;
    createdByUsername: string;
    createdById: number;
    moduleCount: number;
    enrollmentCount: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CourseModule {
    id: number;
    title: string;
    content?: string;
    resourceUrl?: string;
    moduleType?: 'VIDEO' | 'READING' | 'QUIZ' | 'ASSIGNMENT';
    orderIndex?: number;
    durationMinutes?: number;
    active: boolean;
    courseId: number;
    courseTitle?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Enrollment {
    id: number;
    studentId: number;
    studentUsername: string;
    courseId: number;
    courseTitle: string;
    progressPercent: number;
    completedModuleCount?: number;
    totalModuleCount?: number;
    completedModuleIds?: number[];
    active: boolean;
    enrolledAt?: string;
    completedAt?: string;
}

export interface CourseRequest {
    title: string;
    description?: string;
    category?: string;
    difficultyLevel?: string | null;
    durationHours?: number | null;
    published: boolean;
}

export interface ModuleRequest {
    courseId: number;
    title: string;
    content: string;
    moduleType?: string;
    resourceUrl?: string;
    orderIndex?: number | null;
    durationMinutes?: number | null;
}

export interface NavItem {
    label: string;
    icon: string;
    section: string;
    routePath?: string;
    children?: NavItem[];
}

export interface PermissionFlags {
    canView: boolean;
    canAdd: boolean;
    canManage: boolean;
}

export interface NavbarPrimaryLink {
    id: number;
    displayName: string;
    routePath?: string;
    orderIndex: number;
}

export interface NavbarFunctionLinkInfo {
    id: number;
    displayName: string;
    routePath?: string;
    orderIndex: number;
}

export interface NavbarFunctionGroup {
    functionLink: NavbarFunctionLinkInfo;
    permissions: PermissionFlags;
    primaryLinks: NavbarPrimaryLink[];
}

export interface NavbarGlobalLinkInfo {
    id: number;
    displayName: string;
    orderIndex: number;
}

export interface NavbarGlobalGroup {
    globalLink: NavbarGlobalLinkInfo;
    functionLinks: NavbarFunctionGroup[];
}

export interface GlobalLink {
    id: number;
    displayName: string;
    orderIndex: number;
    active: boolean;
}

export interface FunctionLink {
    id: number;
    displayName: string;
    routePath?: string;
    orderIndex: number;
    active: boolean;
    activePrimaryLinkCount: number;
    mappedUserCount: number;
}

export interface PrimaryLink {
    id: number;
    globalLinkId: number;
    functionLinkId: number;
    displayName: string;
    routePath?: string;
    orderIndex: number;
    active: boolean;
}

export interface ReorderItem {
    id: number;
    orderIndex: number;
}

export interface UserPermissionUserOption {
    id: number;
    username: string;
    fullName: string;
    hasPermissions: boolean;
}

export interface UserPermissionFunctionRow {
    functionLinkId: number;
    functionLinkName: string;
    permissions: PermissionFlags;
}

export interface UserPermissionGlobalGroup {
    globalLinkId: number;
    globalLinkName: string;
    orderIndex: number;
    functionLinks: UserPermissionFunctionRow[];
}

export interface UserPermissionByUserResponse {
    userId: number;
    globalLinks: UserPermissionGlobalGroup[];
}

export interface UserPermissionEntryRequest {
    functionLinkId: number;
    canView: boolean;
    canAdd: boolean;
    canManage: boolean;
}

export interface UserPermissionSaveRequest {
    userIds: number[];
    permissions: UserPermissionEntryRequest[];
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}
export interface PasswordExpiryStatus {
    warningRequired: boolean;
    /** "REGISTRATION" | "PASSWORD_CHANGE" | "PASSWORD_RESET" */
    warningType?: string;
    /** Calendar days remaining; 0 = expires today; negative = already expired */
    daysUntilExpiry?: number;
    /** ISO-8601 date string e.g. "2025-06-18" */
    expiresOn?: string;
}
export interface ExportColumn {
  header: string;
  field: string;
  format?: 'date' | 'datetime' | 'percent' | 'boolean' | 'yesno_inv' | 'none';
}
export type ExportScope = 'current' | 'all';
// ─── Section Definitions ─────────────────────────────────────────────────────
export interface SectionDef {
    key: string;
    label: string;
    icon: string;
}

export const ROLE_SECTIONS: Record<string, SectionDef[]> = {
    STUDENT: [
        { key: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
        { key: 'my-courses', label: 'My Courses', icon: 'import_contacts' },
        { key: 'browse', label: 'Browse Courses', icon: 'search' },
        { key: 'profile', label: 'My Profile', icon: 'person' }
    ],
    TRAINER: [
        { key: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
        { key: 'courses', label: 'My Courses', icon: 'menu_book' },
        { key: 'modules', label: 'Modules', icon: 'description' },
        { key: 'enrollments', label: 'Student Enrollments', icon: 'groups' },
        { key: 'profile', label: 'My Profile', icon: 'person' }
    ]
};

