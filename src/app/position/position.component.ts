import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  Subscription,
  interval,
  startWith,
  switchMap,
  takeUntil,
  of,
  map,
} from 'rxjs';
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
  posicao: number = -2; // -2 = Carregando
  isLoading: boolean = true;
  public isCancelada: boolean = false;
  public mensagemCancelamento: string = '';
  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL_MS = 3000;

  private errorCounter: number = 0;
  private readonly MAX_ERRORS = 3; // Desiste após 3 falhas seguidas

  constructor(
    private loginService: LoginService,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const usuario = this.loginService.getUsuarioLogado();
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }
    const pos = this.loginService.getPosicao();
    console.log(' posicaoooooo dois ' + pos);
    /* if(pos === null || pos === undefined || pos === '0'){
      this.loginService.fazerLogout();
      return
    }*/

    this.usuarioNome = usuario.nome;
    this.usuarioTelefone = usuario.telefone;
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  startPolling(): void {
    if (this.pollingSubscription || !this.usuarioTelefone) {
      return;
    }

    this.pollingSubscription = interval(this.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.apiService.checkCancelStatus(this.usuarioTelefone!),
        ),
        switchMap((cancelRes: any) => {
          if (cancelRes.cancelada) {
            return of({
              cancelada: true,
              mensagem: cancelRes.mensagem,
              position: -1,
            });
          } else {
            return this.apiService
              .verPosicao(this.usuarioTelefone!)
              .pipe(
                map((posRes: any) => ({
                  cancelada: false,
                  mensagem: '',
                  position: posRes.position,
                })),
              );
          }
        }),
        takeUntil(this.loginService.logout$),
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.errorCounter = 0;

          if (response.cancelada) {
            this.isCancelada = true;
            this.mensagemCancelamento = response.mensagem;
            this.posicao = -1;
            this.loginService.salvarPosicao('-1');
            this.stopPolling();
          } else {
            this.isCancelada = false;
            this.posicao = response.position;
            this.loginService.salvarPosicao(String(this.posicao));

            if (this.posicao === -1) {
              this.stopPolling();
            }
          }
        },
        error: (err) => {
          console.error('Erro ao verificar posição/status:', err);
          this.isLoading = false;
          this.errorCounter++;

          if (this.errorCounter >= this.MAX_ERRORS) {
            console.warn(
              `[Auto-Logout] Falhou ${this.MAX_ERRORS} vezes. A forçar o logout.`,
            );
            this.stopPolling();
            this.loginService.fazerLogout();
          }
        },
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  limparAvisoEAdicionar(): void {
    this.isCancelada = false;
    this.mensagemCancelamento = '';
    this.adicionarOutraMusica();
  }

  adicionarOutraMusica(): void {
    this.loginService.salvarPosicao(null);
    this.router.navigate(['/buscar']);
  }

 fazerLogout(): void {
    this.stopPolling();

    if (this.usuarioTelefone && this.posicao >= 0) {
      this.apiService.removeUserSong(this.usuarioTelefone).subscribe({
        next: () => {
          console.log('Música removida com sucesso no servidor.');
          this.loginService.fazerLogout(); 
        },
        error: (err) => {
          console.error('Erro ao remover música no servidor:', err);
          this.loginService.fazerLogout(); 
        }
      });
    } else {
      this.loginService.fazerLogout();
    }
  }
}
