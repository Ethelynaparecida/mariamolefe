import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs'; // Importe o Subject
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly USER_STORAGE_KEY = 'karaoke_user';
  private readonly POSITION_STORAGE_KEY = 'karaoke_position';

  private logoutSubject = new Subject<void>();
  public logout$ = this.logoutSubject.asObservable();

  constructor(private router: Router, private apiService: ApiService) {}

  salvarPosicao(posicao: number | string | null): void {
    if (posicao === null || posicao === undefined) {
      localStorage.removeItem(this.POSITION_STORAGE_KEY);
    } else {
      localStorage.setItem(this.POSITION_STORAGE_KEY, String(posicao));
    }
  }
  salvarLogin(userData: {
    nome: string;
    email: string;
    telefone: string;
  }): void {
    try {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error('Erro ao salvar dados no localStorage:', e);
    }
  }

  fazerLogout(): void {
    const userId = this.getUserId();
    if (userId) {
      this.apiService.removeUserSong(userId).subscribe({
        next: () =>
          console.log(`Música do usuário ${userId} removida (se existente).`),
        error: (err) => console.error(`Erro ao tentar remover a música:`, err),
      });
    }
    try {
      this.logoutSubject.next(); // Emite o sinal
      localStorage.removeItem(this.USER_STORAGE_KEY);
      this.salvarPosicao(null);
      this.router.navigate(['/login']);
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    }
  }

  getUsuarioLogado(): { nome: string; email: string; telefone: string } | null {
    try {
      const userData = localStorage.getItem(this.USER_STORAGE_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (e) {
      console.error('Erro ao ler dados do localStorage:', e);
    }
    return null;
  }

  estaLogado(): boolean {
    return this.getUsuarioLogado() !== null;
  }

  getPosicao(): string | null {
    return localStorage.getItem(this.POSITION_STORAGE_KEY);
  }

  estaNaFila(): boolean {
    const pos = this.getPosicao();
    if (!pos) {
      return false; // Não tem posição
    }
    const posNum = parseInt(pos, 10);
    // Se a posição for 0 ou mais, ele está "ativo"
    return !isNaN(posNum) && posNum >= 0;
  }

  private getUserId(): string | null {
    const userJson = localStorage.getItem(this.USER_STORAGE_KEY);
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
                return user.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
