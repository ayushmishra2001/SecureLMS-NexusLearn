import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
    { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'register', loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
    { path: 'forgot-password', loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
    { path: 'reset-password', loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    {
        path: 'profile',
        canActivate: [authGuard, permissionGuard],
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
    },
    {
        path: 'admin',
        canActivate: [authGuard, permissionGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'users', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'groups', loadComponent: () => import('./pages/admin/groups.component').then(m => m.GroupsComponent) },
            { path: 'courses', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'modules', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'enrollments', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'audit-logs', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
            {
                path: 'manage-links',
                children: [
                    { path: 'global-links', loadComponent: () => import('./pages/admin/global-links.component').then(m => m.GlobalLinksComponent) },
                    { path: 'function-links', loadComponent: () => import('./pages/admin/function-links.component').then(m => m.FunctionLinksComponent) },
                    { path: 'primary-links', loadComponent: () => import('./pages/admin/primary-links.component').then(m => m.PrimaryLinksComponent) },
                    { path: 'role-master', loadComponent: () => import('./pages/admin/role-master.component').then(m => m.RoleMasterComponent) },
                    { path: 'group-master', loadComponent: () => import('./pages/admin/group-master.component').then(m => m.GroupMasterComponent) },
                    { path: 'permissions', loadComponent: () => import('./pages/admin/user-permissions.component').then(m => m.UserPermissionsComponent) },
                    { path: '', redirectTo: 'global-links', pathMatch: 'full' }
                ]
            },
            { path: 'global-links', redirectTo: 'manage-links/global-links', pathMatch: 'full' },
            { path: 'function-links', redirectTo: 'manage-links/function-links', pathMatch: 'full' },
            { path: 'primary-links', redirectTo: 'manage-links/primary-links', pathMatch: 'full' },
            { path: 'role-master', redirectTo: 'manage-links/role-master', pathMatch: 'full' },
            { path: 'group-master', redirectTo: 'manage-links/group-master', pathMatch: 'full' },
            { path: 'permissions', redirectTo: 'manage-links/permissions', pathMatch: 'full' },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: '**', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) }
        ]
    },
    {
        path: 'trainer',
        canActivate: [authGuard, permissionGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./pages/trainer/trainer-dashboard.component').then(m => m.TrainerDashboardComponent) },
            { path: 'courses', loadComponent: () => import('./pages/trainer/trainer-dashboard.component').then(m => m.TrainerDashboardComponent) },
            { path: 'modules', loadComponent: () => import('./pages/trainer/trainer-dashboard.component').then(m => m.TrainerDashboardComponent) },
            { path: 'enrollments', loadComponent: () => import('./pages/trainer/trainer-dashboard.component').then(m => m.TrainerDashboardComponent) },
            { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: '**', loadComponent: () => import('./pages/trainer/trainer-dashboard.component').then(m => m.TrainerDashboardComponent) }
        ]
    },
    {
        path: 'student',
        canActivate: [authGuard, permissionGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./pages/student/student-dashboard.component').then(m => m.StudentDashboardComponent) },
            { path: 'my-courses', loadComponent: () => import('./pages/student/student-dashboard.component').then(m => m.StudentDashboardComponent) },
            { path: 'browse-courses', loadComponent: () => import('./pages/student/student-dashboard.component').then(m => m.StudentDashboardComponent) },
            { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: '**', loadComponent: () => import('./pages/student/student-dashboard.component').then(m => m.StudentDashboardComponent) }
        ]
    },
    { path: '403', loadComponent: () => import('./pages/forbidden/forbidden.component').then(m => m.ForbiddenComponent) },
    { path: '**', redirectTo: '' }
];
