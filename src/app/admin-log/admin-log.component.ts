import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../service/api.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-log',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './admin-log.component.html',
  styleUrls: ['./admin-log.component.less'],
  providers: [DatePipe],
})
export class AdminLogComponent implements OnInit {
  public logData: any[] = [];
  public isLoading: boolean = true;
  public error: string | null = null;
  public sortColumn: string = 'horarioCadastro';
  public sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private apiService: ApiService,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.carregarLog();
  }

  carregarLog(): void {
    this.isLoading = true;
    this.apiService.getLogDoDia().subscribe({
      next: (data) => {
        this.logData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar log:', err);
        this.error = 'Falha ao carregar o histórico.';
        this.isLoading = false;
      },
    });
  }

  cancelarMusica(telefone: string): void {
    if (!telefone) {
      alert(
        'Erro: O telefone do utilizador não está disponível neste registo.',
      );
      return;
    }

    const mensagem = prompt(
      'A música será removida da fila.\nDigite o motivo para aparecer no telemóvel do cliente (ou deixe em branco se não quiser justificar):',
      'Vídeo indisponível ou inadequado.',
    );
    if (mensagem !== null) {
      this.apiService.cancelSong(telefone, mensagem).subscribe({
        next: () => {
          const itemCancelado = this.logData.find(
            (i) =>
              i.telefoneUsuario === telefone &&
              !i.horarioExibicao &&
              !i.motivoCancelamento,
          );

          if (itemCancelado) {
            itemCancelado.motivoCancelamento = mensagem || 'Sem justificação';
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar:', err);
          alert('Erro ao tentar remover a música. Verifique se ela já tocou.');
        },
      });
    }
  }

  ordenarPor(coluna: string): void {
    if (this.sortColumn === coluna) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = coluna;
      this.sortDirection = 'asc';
    }

    this.logData.sort((a, b) => {
      let valorA = a[coluna];
      let valorB = b[coluna];

      if (!valorA) valorA = '';
      if (!valorB) valorB = '';

      if (valorA < valorB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valorA > valorB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  obterIconeOrdenacao(coluna: string): string {
    if (this.sortColumn !== coluna) return '↕';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  getYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  formatarData(data: string | null): string {
    if (!data) {
      return '---';
    }
    return this.datePipe.transform(data, 'dd/MM HH:mm:ss') || '---';
  }
}
