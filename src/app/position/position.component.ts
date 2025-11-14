import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval, startWith, switchMap, takeUntil } from 'rxjs';

import { LoginService } from '../service/login.service';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-position',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './position.component.html',
  styleUrls: ['./position.component.less'],
})
export class PositionComponent implements OnInit, OnDestroy {
  usuarioNome: string | null = null;
  private usuarioTelefone: string | null = null;

  posicao: number = -2; // -2 = Carregando, -1 = Tocou, 0 = Tocando, >0 = Na Fila
  isLoading: boolean = true;

  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL_MS = 10000;

  constructor(
    private loginService: LoginService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const usuario = this.loginService.getUsuarioLogado();

    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioNome = usuario.nome;
    this.usuarioTelefone = usuario.telefone;

    this.startPolling();
  }

  startPolling(): void {
    if (this.pollingSubscription || !this.usuarioTelefone) {
      return;
    }

    this.pollingSubscription = interval(this.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.verPosicao(this.usuarioTelefone!)),
        takeUntil(this.loginService.logout$)
      )
      .subscribe({
        next: (response) => {
          this.posicao = response.position;
          this.isLoading = false;

          this.loginService.salvarPosicao(this.posicao);

          if (this.posicao === -1) {
            this.stopPolling();
          }
        },
        error: (err) => {
          console.error('Erro ao verificar posição:', err);
          this.isLoading = false;
        },
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  adicionarOutraMusica(): void {
    this.loginService.salvarPosicao(null);

    this.router.navigate(['/buscar']);
  }

  fazerLogout(): void {
    this.stopPolling();
    this.loginService.fazerLogout();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }
}
