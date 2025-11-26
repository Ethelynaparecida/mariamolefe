import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = (route, state) => {
  
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.estaLogado()) {
    return true; 
  }
  const temMusicaNaFila = loginService.estaNaFila(); 
  const estaAcederFila = state.url.includes('/fila');
  const estaAcederBuscar = state.url.includes('/buscar');

  console.log("**authguard temMusicaNaFila ",temMusicaNaFila," estaAcederFila ",estaAcederFila," estaAcederBuscar ",estaAcederBuscar);

  if (temMusicaNaFila) {
    
    if (estaAcederFila) {
      return true; 
    } else {
      // ERRO! Está logado, tem música, mas está a tentar ir para /buscar.
      console.warn("AuthGuard: Utilizador com música ativa foi bloqueado de aceder a " + state.url + ". A redirecionar para /fila.");
      router.navigate(['/fila']);
      return false; // Bloqueia e força para /fila
    }

  } else {
   
    if (estaAcederBuscar) {
      return true; // OK! Permite o acesso a /buscar
    } else {
      // ERRO! Está logado, sem música, mas a tentar ir para /fila.
      console.warn("AuthGuard: Utilizador sem música foi bloqueado de aceder a " + state.url + ". A redirecionar para /buscar.");
      router.navigate(['/buscar']);
      return false; // Bloqueia e força para /buscar
    }
  }

  console.warn('Acesso bloqueado pela AuthGuard. A redirecionar para /login');
  router.navigate(['/login']);
  return false;
};