import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../service/api.service';
import { Subscription, interval, forkJoin } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.less'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  public feedbackMessage: string = '';

  public isPaused: boolean = false;
  public queueView: any[] = [];
  public currentSong: any = null;
  public upcomingSongs: any[] = [];

  private adminPoll: Subscription | null = null;
  private readonly POLLING_INTERVAL_MS = 3000;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.startAdminPolling();
  }

  ngOnDestroy(): void {
    if (this.adminPoll) {
      this.adminPoll.unsubscribe();
    }
  }

  startAdminPolling(): void {
    this.adminPoll = interval(this.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            status: this.apiService.getPlayerStatus(),
            queue: this.apiService.getQueueView(),
          })
        )
      )
      .subscribe((response) => {
        this.isPaused = response.status.isPaused;
        this.queueView = response.queue;
        this.currentSong = this.queueView.length > 0 ? this.queueView[0] : null;
        this.upcomingSongs =
          this.queueView.length > 1 ? this.queueView.slice(1) : [];
      });
  }

  pause(): void {
    this.apiService.pausePlayer().subscribe(() => {
      this.mostrarFeedback('Player Pausado');
      this.isPaused = true;
    });
  }

  play(): void {
    this.apiService.playPlayer().subscribe(() => {
      this.mostrarFeedback('Player a Tocar');
      this.isPaused = false;
    });
  }

  skip(): void {
    if (confirm('Tem a certeza que quer pular a música atual?')) {
      this.apiService.skipSong().subscribe({
        next: () => {
          this.mostrarFeedback('Música pulada!');
          this.forceRefresh();
        },
        error: (err) => {
          this.mostrarFeedback('Erro: Nenhuma música a tocar para pular.');
        },
      });
    }
  }

  restart(): void {
    if (confirm('Tem a certeza que quer recomeçar a música atual?')) {
      this.apiService.restartPlayer().subscribe({
        next: () => {
          this.mostrarFeedback('Música reiniciada!');
          this.play(); 
        },
        error: (err) => {
          this.mostrarFeedback('Erro ao reiniciar a música.');
        }
      });
    }
  }

  forceRefresh(): void {
    if (this.adminPoll) {
      this.adminPoll.unsubscribe();
    }
    this.startAdminPolling();
  }

  mostrarFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2000);
  }
}
