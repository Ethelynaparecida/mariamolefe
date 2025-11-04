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

  private usuarioLogado: { nome: string; email: string; cpf: string } | null =
    null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private loginService: LoginService
  ) {
    this.searchForm = this.fb.group({
      query: ['', Validators.required],
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
    const cpfUsuario = this.usuarioLogado.cpf;

    console.log(`Utilizador ${nomeUsuario} a adicionar: ${videoTitle}`);

    this.apiService
      .adicionarNaFila(videoId, videoTitle, nomeUsuario, cpfUsuario)
      .subscribe({
        next: (response) => {
          const posicao = response.position || 'na fila';

          this.loginService.salvarPosicao(posicao);
          this.router.navigate(['/fila']);
        },
        error: (err) => {
          console.error('Erro ao adicionar na fila:', err);
          if (err.status === 409) {
            alert('Erro: Você já tem uma música na fila! Aguarde ela tocar.');
            this.router.navigate(['/fila']);
          } else {
            alert('Ocorreu um erro ao adicionar a música.');
          }
        },
      });
  }
}
