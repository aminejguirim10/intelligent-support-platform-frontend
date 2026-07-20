import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Login } from './components/pages/login/login';
import { Register } from './components/pages/register/register';
import { ForgotPassword } from './components/pages/forgot-password/forgot-password';
import { ResetPassword } from './components/pages/reset-password/reset-password';
import { AppShell } from './components/layout/app-shell/app-shell';
import { DashboardTickets } from './components/pages/dashboard/dashboard-tickets/dashboard-tickets';
import { DashboardUsers } from './components/pages/dashboard/dashboard-users/dashboard-users';
import { CreateTicket } from './components/pages/create-ticket/create-ticket';
import { UserProfile } from './components/pages/shared/user-profile/user-profile';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  {
    path: '',
    component: AppShell,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', redirectTo: '/dashboard/tickets', pathMatch: 'full' },
      { path: 'dashboard/tickets', component: DashboardTickets },
      {
        path: 'dashboard/users',
        component: DashboardUsers,
        canActivate: [RoleGuard],
        data: { role: 'ADMIN' },
      },
      { path: 'create-ticket', component: CreateTicket },
      { path: 'profile', component: UserProfile },
    ],
  },
];
