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
const temMusicaNaFila = loginService.estaNaFila(); 
  const estaAcederFila = state.url.includes('/fila');
  const estaAcederBuscar = state.url.includes('/buscar');

  if (temMusicaNaFila) {
if (estaAcederFila) {
      return true; 
    } else {
      
      console.warn("AuthGuard: Utilizador com música ativa foi bloqueado de aceder a " + state.url + ". A redirecionar para /fila.");
      router.navigate(['/fila']);
      return false; 
    }

  } else {
    if (estaAcederBuscar) {
      return true; 
    } else {

 console.warn("AuthGuard: Utilizador sem música foi bloqueado de aceder a " + state.url + ". A redirecionar para /buscar.");
      router.navigate(['/buscar']);
      return false; 
    }
  }
};