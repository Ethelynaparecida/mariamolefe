import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { VideoComponent } from './video/video.component';
import { PositionComponent } from './position/position.component';
import { PlayerComponent } from './player/player.component';
import { PlayerLoginComponent } from './player-login/player-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { authGuard } from './service/auth.guard';
import { loginGuard } from './service/login.guard';
import { playerGuard } from './service/player.guard';
import { AdminLogComponent } from './admin-log/admin-log.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';

export const routes: Routes = [
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [playerGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard], // Protegida pelo loginGuard
  },
  {
    path: 'buscar',
    component: VideoComponent,
    canActivate: [authGuard], // Protegida pelo authGuard
  },
  {
    path: 'fila',
    component: PositionComponent,
    canActivate: [authGuard], // Protegida pelo authGuard
  },
  {
    path: 'player-login',
    component: PlayerLoginComponent,
  },
  {
    path: 'player',
    component: PlayerComponent,
    canActivate: [playerGuard], // Protegida pelo playerGuard
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [playerGuard],
  },
  {
    path: 'admin/log',
    component: AdminLogComponent,
    canActivate: [playerGuard],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
