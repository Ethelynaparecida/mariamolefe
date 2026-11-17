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
  providers: [DatePipe] 
})
export class AdminLogComponent implements OnInit {

  public logData: any[] = [];
  public isLoading: boolean = true;
  public error: string | null = null;
  public sortColumn: string = 'horarioCadastro';
  public sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private apiService: ApiService,
    private datePipe: DatePipe 
  ) {}

  ngOnInit(): void {
    this.carregarLog();
  }

  carregarLog(): void {
    this.isLoading = true;
    this.apiService.getLogDoDia().subscribe({
      next: (data) => {
        this.logData = this.ordenarListaPadrao(data ?? []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erro ao carregar log:", err);
        this.error = "Falha ao carregar o histórico.";
        this.isLoading = false;
      }
    });
  }

  private ordenarListaPadrao(data: any[]): any[] {
    return [...data].sort((a, b) => {
      const aEstaTocandoAgora = !a?.horarioExibicao && !a?.motivoCancelamento;
      const bEstaTocandoAgora = !b?.horarioExibicao && !b?.motivoCancelamento;

      if (aEstaTocandoAgora && !bEstaTocandoAgora) {
        return -1;
      }

      if (!aEstaTocandoAgora && bEstaTocandoAgora) {
        return 1;
      }

      if (aEstaTocandoAgora && bEstaTocandoAgora) {
        return new Date(a?.horarioCadastro ?? 0).getTime() - new Date(b?.horarioCadastro ?? 0).getTime();
      }

      if (a?.horarioExibicao && b?.horarioExibicao) {
        return new Date(b.horarioExibicao).getTime() - new Date(a.horarioExibicao).getTime();
      }

      if (a?.motivoCancelamento && b?.motivoCancelamento) {
        return new Date(b?.horarioCadastro ?? 0).getTime() - new Date(a?.horarioCadastro ?? 0).getTime();
      }

      return new Date(b?.horarioCadastro ?? 0).getTime() - new Date(a?.horarioCadastro ?? 0).getTime();
    });
  }

  private getItemAtualEmExecucao(): any | null {
    const itensNaoCancelados = this.logData.filter((item) => !item?.motivoCancelamento);

    if (itensNaoCancelados.length === 0) {
      return null;
    }

    const comExibicao = itensNaoCancelados.filter((item) => !!item?.horarioExibicao);

    if (comExibicao.length === 0) {
      return null;
    }

    return [...comExibicao].sort((a, b) => {
      const tempoA = new Date(a?.horarioExibicao ?? a?.horarioCadastro ?? 0).getTime();
      const tempoB = new Date(b?.horarioExibicao ?? b?.horarioCadastro ?? 0).getTime();
      return tempoB - tempoA;
    })[0];
  }

  private getFilaAtivaOrdenada(): any[] {
    const itemAtual = this.getItemAtualEmExecucao();
    const ativos = this.logData.filter((item) => {
      if (item?.motivoCancelamento) {
        return false;
      }

      if (item === itemAtual) {
        return true;
      }

      if (item?.horarioExibicao) {
        return false;
      }

      return true;
    });

    return [...ativos].sort((a, b) => {
      if (a === itemAtual) return -1;
      if (b === itemAtual) return 1;

      const valorA = new Date(a?.horarioCadastro ?? 0).getTime();
      const valorB = new Date(b?.horarioCadastro ?? 0).getTime();
      return valorA - valorB;
    });
  }

  private getPosicaoNumerica(item: any): number {
    if (!item || item.motivoCancelamento) {
      return Number.MAX_SAFE_INTEGER;
    }

    const filaAtiva = this.getFilaAtivaOrdenada();
    const index = filaAtiva.findIndex((registro) => registro === item);

    if (index === -1) {
      return Number.MAX_SAFE_INTEGER;
    }

    if (item === this.getItemAtualEmExecucao()) {
      return 0;
    }

    return index;
  }

  getFilaAtiva(): any[] {
    return this.getFilaAtivaOrdenada();
  }

  getHistoricoTocado(): any[] {
    const itemAtual = this.getItemAtualEmExecucao();

    return this.logData.filter((item) => {
      if (item?.motivoCancelamento) {
        return true;
      }

      if (item === itemAtual) {
        return false;
      }

      return !!item?.horarioExibicao;
    });
  }

  isPending(item: any): boolean {
    return !!item && !item.horarioExibicao && !item.motivoCancelamento;
  }

  getMotivoCancelamento(item: any): string {
    if (!item) {
      return '---';
    }

    if (item.motivoCancelamento) {
      return item.motivoCancelamento;
    }

    if (this.isPending(item)) {
      return 'Pendente';
    }

    return '---';
  }

  getIpUsuario(item: any): string {
    return item?.ipUsuario || 'N/A';
  }

  cancelarMusica(item: any): void {
    if (!item?.telefoneUsuario) {
      alert('Erro: O telefone do utilizador não está disponível neste registo.');
      return;
    }

    const mensagem = prompt(
      'A música será removida da fila.\nDigite o motivo para aparecer no telemóvel do cliente (ou deixe em branco se não quiser justificar):',
      'Vídeo indisponível ou inadequado.'
    );

    if (mensagem !== null) {
      this.apiService.cancelSong(item.telefoneUsuario, mensagem).subscribe({
        next: () => {
          this.carregarLog();
        },
        error: (err) => {
          console.error('Erro ao cancelar música:', err);
          alert('Erro ao tentar remover a música. Verifique se ela já tocou.');
        }
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

    this.logData = [...this.logData].sort((a, b) => {
      if (coluna === 'posicaoFila') {
        const posA = this.getPosicaoNumerica(a);
        const posB = this.getPosicaoNumerica(b);

        if (posA === Number.MAX_SAFE_INTEGER && posB === Number.MAX_SAFE_INTEGER) {
          return new Date(b?.horarioCadastro ?? 0).getTime() - new Date(a?.horarioCadastro ?? 0).getTime();
        }

        if (posA === Number.MAX_SAFE_INTEGER) return 1;
        if (posB === Number.MAX_SAFE_INTEGER) return -1;

        const comparacao = posA - posB;
        return this.sortDirection === 'asc' ? comparacao : -comparacao;
      }

      const valorA = a[coluna] ?? '';
      const valorB = b[coluna] ?? '';

      if (valorA < valorB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valorA > valorB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getPosicaoFila(item: any): string {
    if (!item || item.motivoCancelamento) {
      return 'N/A';
    }

    const posicao = this.getPosicaoNumerica(item);
    if (posicao === 0) {
      return 'Agora';
    }

    return posicao === Number.MAX_SAFE_INTEGER ? 'N/A' : String(posicao);
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