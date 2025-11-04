import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = (route, state) => {
  
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.estaLogado()) {
    return true; 
  }

  // Se não está logado, bloqueia e redireciona para o login
  console.warn('Acesso bloqueado pela AuthGuard. A redirecionar para /login');
  router.navigate(['/login']);
  return false;
};