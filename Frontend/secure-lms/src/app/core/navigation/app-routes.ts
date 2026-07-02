import { NavItem, Role } from '../models';

export const APP_ROUTES = {
  profile: '/profile',
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    courses: '/admin/courses',
    modules: '/admin/modules',
    enrollments: '/admin/enrollments',
    auditLogs: '/admin/audit-logs',
    profile: '/admin/profile',
    manageLinks: '/admin/manage-links',
    globalLinks: '/admin/manage-links/global-links',
    functionLinks: '/admin/manage-links/function-links',
    primaryLinks: '/admin/manage-links/primary-links',
    roleMaster: '/admin/manage-links/role-master',
    permissions: '/admin/manage-links/permissions',
    groups: '/admin/groups'
  },
  trainer: {
    dashboard: '/trainer/dashboard',
    courses: '/trainer/courses',
    modules: '/trainer/modules',
    enrollments: '/trainer/enrollments',
    profile: '/trainer/profile'
  },
  student: {
    dashboard: '/student/dashboard',
    myCourses: '/student/my-courses',
    browse: '/student/browse-courses',
    profile: '/student/profile'
  }
} as const;

export const ADMIN_SECTION_ROUTES: Record<string, string> = {
  dashboard: APP_ROUTES.admin.dashboard,
  users: APP_ROUTES.admin.users,
  courses: APP_ROUTES.admin.courses,
  modules: APP_ROUTES.admin.modules,
  enrollments: APP_ROUTES.admin.enrollments,
  'audit-logs': APP_ROUTES.admin.auditLogs,
  profile: APP_ROUTES.admin.profile,
  'global-links': APP_ROUTES.admin.globalLinks,
  'function-links': APP_ROUTES.admin.functionLinks,
  'primary-links': APP_ROUTES.admin.primaryLinks,
  'role-master': APP_ROUTES.admin.roleMaster,
  permissions: APP_ROUTES.admin.permissions,
  groups: APP_ROUTES.admin.groups
};

export const TRAINER_SECTION_ROUTES: Record<string, string> = {
  dashboard: APP_ROUTES.trainer.dashboard,
  courses: APP_ROUTES.trainer.courses,
  modules: APP_ROUTES.trainer.modules,
  enrollments: APP_ROUTES.trainer.enrollments,
  profile: APP_ROUTES.trainer.profile
};

export const STUDENT_SECTION_ROUTES: Record<string, string> = {
  dashboard: APP_ROUTES.student.dashboard,
  'my-courses': APP_ROUTES.student.myCourses,
  browse: APP_ROUTES.student.browse,
  profile: APP_ROUTES.student.profile
};

export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  ADMIN: APP_ROUTES.admin.dashboard,
  SUPER_ADMIN: APP_ROUTES.admin.dashboard,
  TRAINER: APP_ROUTES.trainer.dashboard,
  STUDENT: APP_ROUTES.student.dashboard
};

export const ROLE_SECTION_ROUTES: Record<Role, Record<string, string>> = {
  ADMIN: ADMIN_SECTION_ROUTES,
  SUPER_ADMIN: ADMIN_SECTION_ROUTES,
  TRAINER: TRAINER_SECTION_ROUTES,
  STUDENT: STUDENT_SECTION_ROUTES
};

export const ADMIN_NAV_GROUPS: { label: string; items: NavItem[] }[] = [];

export const TRAINER_NAV_GROUPS: { label: string; items: NavItem[] }[] = [];

export const STUDENT_NAV_GROUPS: { label: string; items: NavItem[] }[] = [];

export const ADMIN_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  courses: 'Courses',
  modules: 'Modules',
  enrollments: 'Enrollments',
  'audit-logs': 'Audit Logs',
  profile: 'My Profile',
  'manage-links': 'Manage Links',
  'global-links': 'Global Links',
  'function-links': 'Function Links',
  'primary-links': 'Primary Links',
  'role-master': 'Role Master',
  permissions: 'User Permissions',
  groups: 'Groups'
};

export const TRAINER_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  courses: 'My Courses',
  modules: 'Modules',
  enrollments: 'Student Enrollments',
  profile: 'My Profile'
};

export const STUDENT_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'my-courses': 'My Courses',
  browse: 'Browse Courses',
  profile: 'My Profile'
};

export function dashboardRouteForRole(role: Role | null): string {
  return role ? (ROLE_DASHBOARD_ROUTES[role] ?? APP_ROUTES.profile) : APP_ROUTES.profile;
}

export function sectionFromRoutePath(routePath: string, sectionRoutes: Record<string, string>, fallback = 'dashboard'): string {
  const path = routePath.split('?')[0];
  return Object.entries(sectionRoutes).find(([, route]) => route === path)?.[0] ?? fallback;
}

export function resolveRoleRoutePath(routePath: string, role: Role | null): string {
  const normalized = normalizeAppRoute(routePath);
  if (!role) return normalized;

  if (isFullyScopedRoute(normalized)) {
    return normalized;
  }

  const sectionRoutes = ROLE_SECTION_ROUTES[role] ?? {};
  const key = normalized.slice(1);
  const aliases = roleRouteAliases(role);

  return aliases[key] ?? sectionRoutes[key] ?? `${roleBasePath(role)}${normalized}`;
}

export function routesMatchForRole(candidateRoutePath: string, currentRoutePath: string, role: Role | null): boolean {
  const current = normalizeAppRoute(currentRoutePath);
  const candidate = normalizeAppRoute(candidateRoutePath);
  return candidate === current || resolveRoleRoutePath(candidate, role) === current;
}

function normalizeAppRoute(routePath: string): string {
  const path = (routePath || '').split('?')[0].trim();
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function isFullyScopedRoute(routePath: string): boolean {
  return [
    '/admin/',
    '/trainer/',
    '/student/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/403'
  ].some(prefix => routePath === prefix.slice(0, -1) || routePath.startsWith(prefix));
}

function roleRouteAliases(role: Role): Record<string, string> {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return {
      'manage-links': APP_ROUTES.admin.manageLinks,
      'manage-links/global-links': APP_ROUTES.admin.globalLinks,
      'manage-links/function-links': APP_ROUTES.admin.functionLinks,
      'manage-links/primary-links': APP_ROUTES.admin.primaryLinks,
      'manage-links/role-master': APP_ROUTES.admin.roleMaster,
      'manage-links/permissions': APP_ROUTES.admin.permissions,
      'global-links': APP_ROUTES.admin.globalLinks,
      'function-links': APP_ROUTES.admin.functionLinks,
      'primary-links': APP_ROUTES.admin.primaryLinks,
      'role-master': APP_ROUTES.admin.roleMaster
    };
  }

  if (role === 'TRAINER') {
    return {
      'my-courses': APP_ROUTES.trainer.courses,
      courses: APP_ROUTES.trainer.courses
    };
  }

  return {
    courses: APP_ROUTES.student.myCourses,
    'my-courses': APP_ROUTES.student.myCourses,
    browse: APP_ROUTES.student.browse,
    'browse-courses': APP_ROUTES.student.browse
  };
}

function roleBasePath(role: Role): string {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
  if (role === 'TRAINER') return '/trainer';
  if (role === 'STUDENT') return '/student';
  return '/student';
}
