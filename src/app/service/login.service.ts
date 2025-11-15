import { Injectable } from '@angular/core'; 
import { Router } from '@angular/router';
import { Subject } from 'rxjs'; 

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private readonly USER_STORAGE_KEY = 'karaoke_user';
  private readonly POSITION_STORAGE_KEY = 'karaoke_position';

private logoutSubject = new Subject<void>();
  public logout$ = this.logoutSubject.asObservable();


  constructor(
    private router: Router,
   
  ) {
    
  }

  salvarPosicao(posicao: number | string | null): void {
    if (posicao === null || posicao === undefined || posicao === '0') {
      localStorage.removeItem(this.POSITION_STORAGE_KEY);
    } else {
      localStorage.setItem(this.POSITION_STORAGE_KEY, String(posicao));
    }
  }

  salvarLogin(userData: { nome: string; email: string; telefone: string }): void {
    
      try {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(userData));
      } catch (e) {
        console.error("Erro ao salvar dados no localStorage:", e);
      }
    
  }

  getUsuarioLogado(): { nome: string; email: string; telefone: string} | null {
 
      try {
        const userData = localStorage.getItem(this.USER_STORAGE_KEY);
        if (userData) {
          return JSON.parse(userData);
        }
      } catch (e) {
        console.error("Erro ao ler dados do localStorage:", e);
      }
    
    return null; 
  }

  estaLogado(): boolean {
    return this.getUsuarioLogado() !== null;
  }

  fazerLogout(): void {
    try {
      this.logoutSubject.next(); 
      localStorage.removeItem(this.USER_STORAGE_KEY);
      localStorage.removeItem(this.POSITION_STORAGE_KEY);
      this.router.navigate(['/login']);
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
  }


  getPosicao(): string | null {
  
      return localStorage.getItem(this.POSITION_STORAGE_KEY);
    }

  estaNaFila(): boolean {
    const pos = this.getPosicao();
    if (!pos) {
      return false;
    }
    const posNum = parseInt(pos, 10);
    return !isNaN(posNum) && posNum >= 0; 
  }
}