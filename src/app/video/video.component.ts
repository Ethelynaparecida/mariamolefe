import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import { LoginService } from '../service/login.service';

@Component({
  selector: 'app-video',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.less'],
})
export class VideoComponent implements OnInit {
  searchForm: FormGroup;
  searchResults: any[] = [];
  isLoading: boolean = false;
  searchPerformed: boolean = false;
  urlForm: FormGroup;
  isAddingByUrl: boolean = false;

  private usuarioLogado: {
    nome: string;
    email: string;
    telefone: string;
  } | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private loginService: LoginService
  ) {
    this.searchForm = this.fb.group({
      query: ['', Validators.required],
    });
    this.urlForm = this.fb.group({
      videoUrl: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/
          ),
        ],
      ],
    });
  }

  ngOnInit(): void {
    if (!this.loginService.estaLogado()) {
      console.warn('Nenhum utilizador logado, a redirecionar para /login');
      this.router.navigate(['/login']);
    } else {
      this.usuarioLogado = this.loginService.getUsuarioLogado();
      console.log('Utilizador logado:', this.usuarioLogado?.nome);
    }
  }
  private parseAndValidateVideoId(url: string): string | null {
    // 1. Tenta extrair o ID usando uma Regex abrangente:
    const regex =
      /(?:youtube\.com\/(?:live\/|v\/|embed\/|watch\?(?:.*&)?v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);

    let videoId = match ? match[1] : null;

    // 2. Se a regex falhar, tenta extrair de URLs sem domínio (se o usuário colou só o caminho)
    if (!videoId) {
      const shortMatch = url.match(/([^"&?\/\s]{11})$/);
      if (shortMatch && shortMatch[1].length === 11) {
        videoId = shortMatch[1];
      }
    }

    // 3. Validação final: o ID TEM que ter 11 caracteres.
    if (videoId && videoId.length === 11) {
      return videoId;
    }

    return null;
  }
  private parseVideoId(url: string): string | null {
    let urlObject;
    try {
      urlObject = new URL(url);
    } catch (e) {
      const shortIdMatch = url.match(/(?:youtu\.be\/|v=)([^"&?\/\s]{11})/);
      return shortIdMatch ? shortIdMatch[1] : null;
    }

    const videoId = urlObject.searchParams.get('v');
    if (videoId && videoId.length === 11) {
      return videoId;
    }

    const pathname = urlObject.pathname;
    const pathSegments = pathname.split('/');
    if (pathSegments.length > 0) {
      const potentialId = pathSegments[pathSegments.length - 1];
      if (potentialId.length === 11) {
        return potentialId;
      }
    }

    return null;
  }

  onSearch(): void {
    if (this.searchForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.searchPerformed = true;
    this.searchResults = [];

    let searchTerm: string = this.searchForm.get('query')?.value || '';

    const searchTermLower = searchTerm.toLowerCase();
    if (
      !searchTermLower.includes('karaoke') &&
      !searchTermLower.includes('karaokê')
    ) {
      searchTerm += ' karaoke';
      console.log('Termo de busca modificado:', searchTerm);
    }

    this.apiService.buscarVideos(searchTerm).subscribe({
      next: (results) => {
        this.searchResults = results.items || [];
        this.isLoading = false;
        console.log('Resultados da busca:', this.searchResults);
      },
      error: (err) => {
        console.error('Erro ao buscar vídeos:', err);
        this.isLoading = false;
      },
    });
  }

  adicionarMusica(video: any): void {
    if (!this.usuarioLogado) {
      alert('Erro: não foi possível identificar o utilizador. A fazer logout.');
      this.loginService.fazerLogout();
      return;
    }
    const videoId = video.id.videoId;
    const videoTitle = video.snippet.title;
    const nomeUsuario = this.usuarioLogado.nome;
    const telefoneUsuario = this.usuarioLogado.telefone;

    console.log(`Utilizador ${nomeUsuario} a adicionar: ${videoTitle}`);

    this.apiService
      .adicionarNaFila(videoId, videoTitle, nomeUsuario, telefoneUsuario)
      .subscribe({
        next: (response) => {
          const posicao = response.position || 'na fila';

          this.loginService.salvarPosicao(posicao);
          this.router.navigate(['/fila']);
        },
        error: (err) => {
          console.error('Erro ao adicionar na fila:', err);
          if (err.status === 409) {
            // Erro 409: Já tem música na fila
            alert('Erro: Você já tem uma música na fila! Aguarde ela tocar.');
            this.router.navigate(['/fila']);
          } else if (err.status === 423) {
            // Erro 423: Fila bloqueada
            alert(
              'Desculpe, a fila de músicas está fechada pelo admin neste momento. Tente novamente mais tarde.'
            );
          } else {
            alert('Ocorreu um erro ao adicionar a música.');
          }
        },
      });
  }

  onAddByUrl(): void {
    if (this.urlForm.invalid || !this.usuarioLogado) {
      return;
    }

    this.isAddingByUrl = true;
    const url = this.urlForm.get('videoUrl')?.value;
    const videoId = this.parseAndValidateVideoId(url);

    if (!videoId) {
      alert('URL do YouTube inválida. Verifique o link e tente novamente.');
      this.isAddingByUrl = false;
      return;
    }

    const titulo = 'Video por url';

    this.apiService
      .adicionarNaFila(
        videoId,
        titulo,
        this.usuarioLogado!.nome,
        this.usuarioLogado!.telefone
      )
      .subscribe({
        next: (response) => {
          const posicao = response.position || 'na fila';
          this.loginService.salvarPosicao(posicao);
          this.router.navigate(['/fila']);
          this.isAddingByUrl = false;
        },
        error: (err) => {
          if (err.status === 409) {
            alert('Erro: Você já tem uma música na fila! Aguarde ela tocar.');
            this.router.navigate(['/fila']);
          } else if (err.status === 423) {
            alert(
              'Desculpe, a fila de músicas está fechada, e não aceita novos pedidos. Agradecemos a preferência!'
            );
          } else {
            alert('Ocorreu um erro ao adicionar a música.');
          }
          this.isAddingByUrl = false;
        },
      });
  }
}
