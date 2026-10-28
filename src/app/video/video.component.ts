import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
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
  @ViewChild('searchContainer') searchContainer?: ElementRef<HTMLDivElement>;

  searchForm: FormGroup;
  searchResults: any[] = [];
  topSongs: any[] = [];
  isLoading: boolean = false;
  isTopSongsLoading: boolean = false;
  searchPerformed: boolean = false;
  selectedSuggestionIndex: number = -1;
  urlForm: FormGroup;
  isAddingByUrl: boolean = false;
  duplicateQueueModal = {
    visible: false,
    titulo: '',
    artista: '',
    videoId: '',
  };
  private queryDebounceTimer: any = null;

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.searchContainer) {
      return;
    }

    const target = event.target as Node;
    if (!this.searchContainer.nativeElement.contains(target)) {
      this.searchResults = [];
      this.selectedSuggestionIndex = -1;
    }
  }

  ngOnInit(): void {
    if (!this.loginService.estaLogado()) {
      console.warn('Nenhum utilizador logado, a redirecionar para /login');
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioLogado = this.loginService.getUsuarioLogado();
    console.log('Utilizador logado:', this.usuarioLogado?.nome);
    this.carregarTopSongs();
  }

  onQueryInput(): void {
    const query = (this.searchForm.get('query')?.value ?? '').trim();

    if (!query) {
      this.searchPerformed = false;
      this.searchResults = [];
      this.selectedSuggestionIndex = -1;
      if (this.queryDebounceTimer) {
        clearTimeout(this.queryDebounceTimer);
      }
      return;
    }

    if (this.queryDebounceTimer) {
      clearTimeout(this.queryDebounceTimer);
    }

    this.searchPerformed = true;
    this.isLoading = true;
    this.queryDebounceTimer = setTimeout(() => {
      this.apiService.getLocalSearchSuggestions(query).subscribe({
        next: (results) => {
          this.searchResults = this.normalizeSearchResults(results);
          this.searchResults = this.searchResults
            .slice()
            .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
          this.selectedSuggestionIndex = this.searchResults.length > 0 ? 0 : -1;
          this.isLoading = false;
        },
        error: () => {
          this.searchResults = [];
          this.selectedSuggestionIndex = -1;
          this.isLoading = false;
        },
      });
    }, 300);
  }

  private normalizeSearchResults(raw: any): any[] {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (!raw || typeof raw !== 'object') {
      return [];
    }

    const possibleCollections = [raw.items, raw.results, raw.data, raw.musicas, raw.videos, raw.suggestions];
    for (const candidate of possibleCollections) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private isIgnoredTopSong(item: any): boolean {
    const title = this.getResultTitle(item);
    const normalized = this.normalizeText(title);

    return normalized === 'video por url' || normalized.includes('video por url');
  }

  private carregarTopSongs(): void {
    this.isTopSongsLoading = true;

    this.apiService.getTopSongsLast30Days().subscribe({
      next: (results) => {
        const filteredResults = Array.isArray(results) ? results.filter((song) => !this.isIgnoredTopSong(song)) : [];
        this.topSongs = filteredResults;
        this.topSongs.sort((a, b) => Number(b.totalPedidos ?? 0) - Number(a.totalPedidos ?? 0));
        this.isTopSongsLoading = false;
      },
      error: () => {
        this.topSongs = [];
        this.isTopSongsLoading = false;
      },
    });
  }

  getResultTitle(item: any): string {
    return item?.titulo || item?.title || item?.nome || item?.snippet?.title || 'Sem título';
  }

  getResultArtist(item: any): string {
    return item?.artista || item?.artist || item?.autor || item?.channelTitle || item?.snippet?.channelTitle || 'Artista desconhecido';
  }

  getResultThumbnail(item: any): string {
    return (
      item?.thumbnail ||
      item?.miniatura ||
      item?.imagem ||
      item?.thumbnailUrl ||
      item?.artwork ||
      item?.snippet?.thumbnails?.default?.url ||
      item?.snippet?.thumbnails?.medium?.url ||
      item?.snippet?.thumbnails?.high?.url ||
      'https://placehold.co/80x80/eeeeee/666666?text=M'
    );
  }

  getResultVideoId(item: any): string {
    return item?.videoId || item?.id?.videoId || item?.youtubeId || item?.id || '';
  }

  private normalizeText(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isApproximateDuplicate(titleA: string, titleB: string): boolean {
    const cleanedA = this.normalizeText(titleA);
    const cleanedB = this.normalizeText(titleB);

    if (!cleanedA || !cleanedB) {
      return false;
    }

    if (cleanedA === cleanedB) {
      return true;
    }

    if (cleanedA.includes(cleanedB) || cleanedB.includes(cleanedA)) {
      return true;
    }

    const aTokens = new Set(cleanedA.split(' ').filter(Boolean));
    const bTokens = new Set(cleanedB.split(' ').filter(Boolean));

    if (!aTokens.size || !bTokens.size) {
      return false;
    }

    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    const similarity = union ? intersection / union : 0;

    return similarity >= 0.75;
  }

  private areArtistsSimilar(artistA: string, artistB: string): boolean {
    const cleanedA = this.normalizeText(artistA);
    const cleanedB = this.normalizeText(artistB);

    if (!cleanedA && !cleanedB) {
      return true;
    }

    if (!cleanedA || !cleanedB) {
      return false;
    }

    if (cleanedA === cleanedB) {
      return true;
    }

    if (cleanedA.includes(cleanedB) || cleanedB.includes(cleanedA)) {
      return true;
    }

    const aTokens = new Set(cleanedA.split(' ').filter(Boolean));
    const bTokens = new Set(cleanedB.split(' ').filter(Boolean));

    if (!aTokens.size || !bTokens.size) {
      return false;
    }

    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    const similarity = union ? intersection / union : 0;

    return similarity >= 0.85;
  }

  private abrirModalDuplicata(videoId: string, titulo: string, artista: string = ''): void {
    this.duplicateQueueModal = {
      visible: true,
      titulo,
      artista,
      videoId,
    };
  }

  confirmarAdicionarMesmoAssim(): void {
    const { videoId, titulo } = this.duplicateQueueModal;
    this.duplicateQueueModal = { visible: false, titulo: '', artista: '', videoId: '' };

    if (!videoId || !titulo) {
      return;
    }

    this.adicionarMusica({
      id: { videoId },
      snippet: { title: titulo },
    });
  }

  cancelarAdicionarMesmoAssim(): void {
    this.duplicateQueueModal = { visible: false, titulo: '', artista: '', videoId: '' };
  }

  onSuggestionSelect(suggestion: any): void {
    const titulo = this.getResultTitle(suggestion);
    const videoId = this.getResultVideoId(suggestion);

    if (!titulo || !videoId) {
      return;
    }

    this.searchForm.patchValue({ query: titulo });
    this.searchResults = [];
    this.selectedSuggestionIndex = -1;

    this.apiService.getQueueView().subscribe({
      next: (queue) => {
        const fila = Array.isArray(queue) ? queue : [];
        const jaExisteNaFila = fila.some((item: any) => {
          const itemVideoId = item?.videoId || item?.id?.videoId || item?.youtubeId || item?.video_id || '';
          const itemTitulo = this.getResultTitle(item);
          const itemArtista = this.getResultArtist(item);

          const sameVideoId = itemVideoId && videoId &&
            this.normalizeText(itemVideoId.toString()) === this.normalizeText(videoId.toString());

          const sameTitle = this.isApproximateDuplicate(itemTitulo, titulo);
          const sameArtist = this.areArtistsSimilar(itemArtista, this.getResultArtist(suggestion));

          const sameSongByIdentity =
            sameVideoId ||
            (sameTitle && (!itemArtista || !this.getResultArtist(suggestion) || sameArtist));

          if (sameSongByIdentity) {
            this.abrirModalDuplicata(videoId, itemTitulo, itemArtista);
          }

          return sameSongByIdentity;
        });

        if (jaExisteNaFila) {
          return;
        }

        this.adicionarMusica({
          id: { videoId },
          snippet: { title: titulo },
        });
      },
      error: () => {
        this.adicionarMusica({
          id: { videoId },
          snippet: { title: titulo },
        });
      },
    });
  }

  private parseAndValidateVideoId(url: string): string | null {
    const regex =
      /(?:youtube\.com\/(?:live\/|v\/|embed\/|watch\?(?:.*&)?v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);

    let videoId = match ? match[1] : null;

    if (!videoId) {
      const shortMatch = url.match(/([^"&?\/\s]{11})$/);
      if (shortMatch && shortMatch[1].length === 11) {
        videoId = shortMatch[1];
      }
    }

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
    const query = (this.searchForm.get('query')?.value ?? '').trim();

    if (!query) {
      this.searchResults = [];
      this.searchPerformed = false;
      return;
    }

    this.isLoading = true;
    this.searchPerformed = true;

    this.apiService.buscarVideos(query).subscribe({
      next: (results) => {
        this.searchResults = this.normalizeSearchResults(results);
        this.searchResults = this.searchResults
          .slice()
          .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao buscar vídeos:', err);
        this.searchResults = [];
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

    const videoId = video?.videoId || video?.id?.videoId;
    const videoTitle = video?.titulo || video?.title || video?.snippet?.title || 'Música sem título';
    const nomeUsuario = this.usuarioLogado.nome;
    const telefoneUsuario = this.usuarioLogado.telefone;

    if (!videoId) {
      console.error('Video sem videoId:', video);
      return;
    }

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
            alert('Erro: Você já tem uma música na fila! Aguarde ela tocar.');
            this.router.navigate(['/fila']);
          } else if (err.status === 423) {
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

