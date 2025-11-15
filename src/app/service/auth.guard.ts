import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = (route, state) => {
  
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (!loginService.estaLogado()) {
    console.warn('AuthGuard: Utilizador não logado. A redirecionar para /login');
    router.navigate(['/login']);
    return false;
  }

  if (state.url.includes('/fila')) {
    if (loginService.estaNaFila()) {
      return true;
    } else {
      console.warn("AuthGuard: Utilizador logado mas sem música na fila. A redirecionar de /fila para /buscar.");
      router.navigate(['/buscar']);
      return false;
    }
  }
  return true;
};