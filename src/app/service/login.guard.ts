import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const loginGuard: CanActivateFn = (route, state) => {

  const loginService = inject(LoginService);
  const router = inject(Router);

  // Se o usuario NÃO está logado, permite o acesso à página de login
  if (!loginService.estaLogado()) {
    return true;
  }

  // Bloqueia o acesso à página de login e redireciona
  if (loginService.estaNaFila()) {
    console.log('LoginGuard: Utilizador logado e na fila. A redirecionar para /fila');
    router.navigate(['/fila']);
  } else {
    console.log('LoginGuard: Utilizador logado, sem fila. A redirecionar para /buscar');
    router.navigate(['/buscar']);
  }

  return false; 
};