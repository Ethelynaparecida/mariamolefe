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
  localSuggestions: any[] = [];
  youtubeResults: any[] = [];
  topSongs: any[] = [];
  isLoading: boolean = false;
  isTopSongsLoading: boolean = false;
  searchPerformed: boolean = false;
  selectedSuggestionIndex: number = -1;
  currentQueuePosition: number = -2;
  canReplaceCurrentSong: boolean = false;
  isReplacingCurrentSong: boolean = false;
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
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.searchContainer) {
      return;
    }

    const target = event.target as Node;
    if (!this.searchContainer.nativeElement.contains(target)) {
      this.localSuggestions = [];
      this.youtubeResults = [];
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
    this.verificarPosicaoUsuario();
    this.carregarTopSongs();
  }

  private verificarPosicaoUsuario(): void {
    if (!this.usuarioLogado?.telefone) {
      this.currentQueuePosition = -2;
      this.canReplaceCurrentSong = false;
      return;
    }

    this.apiService.verPosicao(this.usuarioLogado.telefone).subscribe({
      next: (response) => {
        const posicao = Number(response?.position ?? -2);
        this.currentQueuePosition = Number.isFinite(posicao) ? posicao : -2;
        this.canReplaceCurrentSong = this.currentQueuePosition > 1;
      },
      error: () => {
        this.currentQueuePosition = -2;
        this.canReplaceCurrentSong = false;
      },
    });
  }

  onQueryInput(): void {
    const query = (this.searchForm.get('query')?.value ?? '').trim();

    if (!query) {
      this.searchPerformed = false;
      this.localSuggestions = [];
      this.youtubeResults = [];
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
          this.localSuggestions = this.normalizeSearchResults(results)
            .slice()
            .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
          this.searchResults = this.localSuggestions;
          this.selectedSuggestionIndex = this.searchResults.length > 0 ? 0 : -1;
          this.isLoading = false;
        },
        error: () => {
          this.localSuggestions = [];
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
    const candidates = [
      item?.thumbnailUrl,
      item?.thumbnail_url,
      item?.thumbnail,
      item?.miniatura,
      item?.imagem,
      item?.imageUrl,
      item?.image_url,
      item?.artwork,
      item?.cover,
      item?.snippet?.thumbnails?.default?.url,
      item?.snippet?.thumbnails?.medium?.url,
      item?.snippet?.thumbnails?.high?.url,
    ];

    const url = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
    if (url && url.trim()) {
      return url;
    }

    const videoId = item?.videoId || item?.id?.videoId || item?.youtubeId || item?.video_id || item?.id || '';
    if (videoId && videoId.toString().trim().length === 11) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return 'https://placehold.co/80x80/eeeeee/666666?text=M';
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

    if (this.queryDebounceTimer) {
      clearTimeout(this.queryDebounceTimer);
    }

    this.localSuggestions = [];
    this.youtubeResults = [];
    this.searchResults = [];
    this.selectedSuggestionIndex = -1;
    this.isLoading = true;
    this.searchPerformed = true;

    this.apiService.buscarVideos(query).subscribe({
      next: (results) => {
        this.youtubeResults = this.normalizeSearchResults(results)
          .slice(0, 10)
          .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
        this.searchResults = this.youtubeResults;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao buscar vídeos:', err);
        this.youtubeResults = [];
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
    const thumbnailUrl = this.getResultThumbnail(video);

    if (!videoId) {
      console.error('Video sem videoId:', video);
      return;
    }

    if (this.canReplaceCurrentSong && this.currentQueuePosition > 1) {
      this.isReplacingCurrentSong = true;
      this.apiService.removeUserSong(telefoneUsuario).subscribe({
        next: () => this.finalizarAdicaoNaFila(videoId, videoTitle, nomeUsuario, telefoneUsuario, thumbnailUrl),
        error: () => this.finalizarAdicaoNaFila(videoId, videoTitle, nomeUsuario, telefoneUsuario, thumbnailUrl),
      });
      return;
    }

    this.finalizarAdicaoNaFila(videoId, videoTitle, nomeUsuario, telefoneUsuario, thumbnailUrl);
  }

  private finalizarAdicaoNaFila(
    videoId: string,
    videoTitle: string,
    nomeUsuario: string,
    telefoneUsuario: string,
    thumbnailUrl: string
  ): void {
    this.apiService
      .adicionarNaFila(videoId, videoTitle, nomeUsuario, telefoneUsuario, thumbnailUrl)
      .subscribe({
        next: (response) => {
          const posicao = response.position || 'na fila';
          this.loginService.salvarPosicao(posicao);
          const posicaoNumerica = Number(response?.position ?? this.currentQueuePosition);
          this.currentQueuePosition = Number.isFinite(posicaoNumerica) ? posicaoNumerica : this.currentQueuePosition;
          this.canReplaceCurrentSong = false;
          this.isReplacingCurrentSong = false;
          this.searchPerformed = false;
          this.searchResults = [];
          this.localSuggestions = [];
          this.youtubeResults = [];
          this.router.navigate(['/fila']);
        },
        error: (err) => {
          console.error('Erro ao adicionar na fila:', err);
          this.isReplacingCurrentSong = false;
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
}

