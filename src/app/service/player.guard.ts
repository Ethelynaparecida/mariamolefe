import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PLAYER_AUTH_KEY } from '../player-login/player-login.component';

export const playerGuard: CanActivateFn = (route, state) => {
  
  const router = inject(Router);

const isPlayerAuthenticated = localStorage.getItem(PLAYER_AUTH_KEY) === 'true'; 
  if (isPlayerAuthenticated) {
    return true;
  }

  console.warn('PlayerGuard: Acesso negado. A redirecionar para /player-login');
  router.navigate(['/player-login']);
  return false;
};