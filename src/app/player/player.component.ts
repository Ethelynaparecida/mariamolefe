import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import {
  Subscription,
  interval,
  firstValueFrom,
  switchMap,
  startWith,
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
  private readonly POLLING_INTERVAL_MS = 5000;
  private videoCheckInterval: any;
  private statusCheckSubscription: Subscription | null = null;
  private isLocallyPaused: boolean = false;
  private readonly STATUS_POLLING_INTERVAL_MS = 2000;
  private lastRestartHandledTime: number = 0;
  private lastSkipHandledTime: number = 0;

  constructor(private apiService: ApiService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.loadYouTubeApi();
    //this.startStatusPolling();
  }

  loadYouTubeApi(): void {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);

      (window as any).onYouTubeIframeAPIReady = () => {
        this.ngZone.run(() => {
          this.createPlayer();
        });
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
        autoplay: 1,
        controls: 0,
        rel: 0,
        fs: 0,
        mute: 1,
        iv_load_policy: 3,
        modestbranding: 1,
      },
      events: {
        onReady: (event: any) => this.onPlayerReady(event),
        onStateChange: (event: any) => this.onPlayerStateChange(event),
      },
    });
  }

  onPlayerReady(event: any): void {
    this.player.unMute();
    this.startVideoPolling();
    this.startStatusPolling();
  }

  startVideoPolling(): void {
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
    }
    this.getNextVideo();
    this.videoCheckInterval = setInterval(() => {
      this.getNextVideo();
    }, this.POLLING_INTERVAL_MS);
  }

  async getNextVideo(): Promise<void> {
    if (this.isWaiting) {
      try {
        const response = await firstValueFrom(this.apiService.getProximaMusica());

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
          }
        });
      } catch (error: any) {
        console.error("Erro ao buscar próxima música:", error);
        this.ngZone.run(() => {
          this.isWaiting = true;
        });
      }
    }
  }

  onPlayerStateChange(event: any): void {
    if (event.data === YT.PlayerState.ENDED) {
      
      const videoIdQueTerminou = this.videoAtual?.videoId; 
      if (!videoIdQueTerminou) return; // Segurança

      console.log("Música terminada (Fim Natural):", videoIdQueTerminou);

      this.isLocallyPaused = true; 
            
      
      this.apiService.musicaTerminada(videoIdQueTerminou).subscribe({
        
        next: () => {
          console.log("Backend notificado com sucesso. AGORA a procurar a próxima música.");
          
          this.ngZone.run(() => {
            this.isWaiting = true;
            this.videoAtual = null;
            this.startVideoPolling(); 
          });
        },
        error: (err) => {
          console.error("Erro ao notificar backend:", err);
          this.ngZone.run(() => {
            this.isWaiting = true;
            this.videoAtual = null;
            this.startVideoPolling(); 
          });
        }
      });
    }
  }

 startStatusPolling(): void {
    if (this.statusCheckSubscription) return;

    this.statusCheckSubscription = interval(this.STATUS_POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getPlayerStatus())
      )
      .subscribe((status: { 
          isPaused: boolean; 
          lastRestartRequestTime: number; 
          lastSkipRequestTime: number; 
      }) => {
        this.ngZone.run(() => {
          
          if (status.lastRestartRequestTime > this.lastRestartHandledTime) {
            console.log("COMANDO DE REINÍCIO RECEBIDO");
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
          this.handlePauseState(status.isPaused);
        });
      });
  }
  handlePauseState(serverIsPaused: boolean): void {
    
    if (serverIsPaused && !this.isLocallyPaused) {
      console.log("PAUSANDO (via admin)");
      this.player.pauseVideo();
      this.isLocallyPaused = true;
      
      if (this.videoCheckInterval) {
        clearInterval(this.videoCheckInterval);
        this.videoCheckInterval = null;
      }
    }
    
    if (!serverIsPaused && this.isLocallyPaused) { 
      console.log("A TOCAR (via admin)");
      this.player.playVideo();
      this.isLocallyPaused = false;
      
      if (!this.videoCheckInterval && this.isWaiting) {
        this.startVideoPolling();
      }
    }
    
  }

  ngOnDestroy(): void {
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
    }
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }
}
