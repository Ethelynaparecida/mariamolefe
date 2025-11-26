import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import { LoginService } from '../service/login.service';
import {
  Subscription,
  interval,
  firstValueFrom,
  switchMap,
  startWith,
  takeUntil,
} from 'rxjs';

declare var YT: any;

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.less'],
})
export class PlayerComponent implements OnInit, OnDestroy {
  public player: any;

  public videoAtual: any = null;
  public isWaiting: boolean = true;

  private videoCheckInterval: any;
  private readonly POLLING_INTERVAL_MS = 7000;

  private statusCheckSubscription: Subscription | null = null;
  private readonly STATUS_POLLING_INTERVAL_MS = 3000;

  private isLocallyPaused: boolean = false;
  private lastRestartHandledTime: number = 0;
  private lastSkipHandledTime: number = 0;
  public isPaused: boolean = false;

  constructor(
    private apiService: ApiService,
    private loginService: LoginService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadYouTubeApi();
  }

  ngOnDestroy(): void {
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
    }
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }

  loadYouTubeApi(): void {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = () => {
        this.ngZone.run(() => this.createPlayer());
      };
    } else {
      this.createPlayer();
    }
  }

  createPlayer(): void {
    this.player = new YT.Player('youtube-player-div', {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 1, // Autoplay
        controls: 0, // Sem controlos
        rel: 0, // Sem vídeos relacionados
        fs: 0, // Sem botão de fullscreen
        mute: 1, // Toca em mute para contornar restrições de autoplay
        iv_load_policy: 3, // Remove as "anotações" do vídeo
        modestbranding: 1, // Tenta remover o logo do YouTube
      },
      events: {
        onReady: (event: any) => this.onPlayerReady(event),
        onStateChange: (event: any) => this.onPlayerStateChange(event),
      },
    });
  }

  onPlayerReady(event: any): void {
    console.log('Player do YouTube está PRONTO.');
    this.player.unMute();

    this.startVideoPolling();

    this.startStatusPolling();
  }

  onPlayerStateChange(event: any): void {
    if (event.data === YT.PlayerState.ENDED) {
      const videoIdQueTerminou = this.videoAtual?.videoId;
      if (!videoIdQueTerminou) return;

      console.log('Música terminada (Fim Natural):', videoIdQueTerminou);

      this.isLocallyPaused = true;
      this.apiService.musicaTerminada(videoIdQueTerminou).subscribe({
        next: () => {
          console.log(
            'Backend notificado com sucesso. AGORA a procurar a próxima música.'
          );

          this.ngZone.run(() => {
            this.isWaiting = true;
            this.videoAtual = null;
            this.startVideoPolling();
          });
        },
        error: (err) => {
          console.error('Erro ao notificar backend:', err);
          this.ngZone.run(() => {
            this.isWaiting = true;
            this.videoAtual = null;
            this.startVideoPolling();
          });
        },
      });
    }
  }

  startVideoPolling(): void {
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
      this.videoCheckInterval = null;
    }

    this.getNextVideo();
    this.videoCheckInterval = setInterval(() => {
      this.getNextVideo();
    }, this.POLLING_INTERVAL_MS);
  }

  async getNextVideo(): Promise<void> {
    if (this.isWaiting) {
      try {
        const response = await firstValueFrom(
          this.apiService.getProximaMusica()
        );

        this.ngZone.run(() => {
          if (response && response.videoId) {
            clearInterval(this.videoCheckInterval);
            this.videoAtual = response;
            this.isWaiting = false;
            this.player.loadVideoById(response.videoId);
            this.player.unMute();

            if (!this.isLocallyPaused) {
              this.player.playVideo();
            }
          } else {
            this.videoAtual = null;
            this.isWaiting = true;
            if (this.player) {
                this.player.stopVideo(); 
            }
          }
        });
      } catch (error: any) {
        console.error('Erro ao buscar próxima música:', error);
        this.ngZone.run(() => {
          this.isWaiting = true;
        });
      }
    }
  }

  startStatusPolling(): void {
    if (this.statusCheckSubscription) return;

    this.statusCheckSubscription = interval(this.STATUS_POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getPlayerStatus()),
        takeUntil(this.loginService.logout$)
      )
      .subscribe(
        (status: {
          isPaused: boolean;
          lastRestartRequestTime: number;
          lastSkipRequestTime: number;
        }) => {
          this.ngZone.run(() => {
            this.isPaused = status.isPaused;
            if (status.lastRestartRequestTime > this.lastRestartHandledTime) {
              console.log('COMANDO DE REINÍCIO RECEBIDO');
              this.player.seekTo(0);
              this.lastRestartHandledTime = status.lastRestartRequestTime;
            }

            if (status.lastSkipRequestTime > this.lastSkipHandledTime) {
              console.log("COMANDO DE 'PULAR' RECEBIDO (via timestamp)");
              this.lastSkipHandledTime = status.lastSkipRequestTime;

              this.isWaiting = true;
              this.isLocallyPaused = false;
              this.startVideoPolling();
            }
            if (this.player) {
              if (
                this.isPaused &&
                this.player.getPlayerState() === YT.PlayerState.PLAYING
              ) {
                this.player.pauseVideo();
              } else if (
                !this.isPaused &&
                this.player.getPlayerState() === YT.PlayerState.PAUSED
              ) {
                // Apenas toca se a música já estiver carregada (estado UNSTARTED ou CUED)
                this.player.playVideo();
              }
            }

            this.handlePauseState(status.isPaused);
          });
        }
      );
  }

  handlePauseState(serverIsPaused: boolean): void {
    if (serverIsPaused && !this.isLocallyPaused) {
      console.log('PAUSANDO (via admin)');
      this.player.pauseVideo();
      this.isLocallyPaused = true;

      if (this.videoCheckInterval) {
        clearInterval(this.videoCheckInterval);
        this.videoCheckInterval = null;
      }
    }

    if (!serverIsPaused && this.isLocallyPaused) {
      console.log('A TOCAR (via admin)');
      this.player.playVideo();
      this.isLocallyPaused = false;

      if (!this.videoCheckInterval && this.isWaiting) {
        this.startVideoPolling();
      }
    }
  }
  
  loadVideoAndPlay(videoId: string, startSeconds: number = 0): void {
    if (this.player) {
      this.player.loadVideoById({
        videoId: videoId,
        startSeconds: startSeconds,
      });

      // Após carregar, força o estado baseado no que o servidor diz
      if (this.isPaused) {
        this.player.pauseVideo();
        console.log(
          'Player: Vídeo carregado, mas mantido PAUSADO (status do servidor).'
        );
      } else {
        // Se o servidor diz para tocar, garante o play (se o player não iniciar automaticamente)
        this.player.playVideo();
      }
    }
  }
}
