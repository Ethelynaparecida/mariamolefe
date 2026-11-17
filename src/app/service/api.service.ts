import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly BASE_URL = 'https://mariamole.onrender.com/api';
   //private readonly BASE_URL = 'http://localhost:8080/api';
  constructor(private http: HttpClient) { }

  login(apelido: string): Observable<any> {
    return this.http.post(`${this.BASE_URL}/login`, { apelido: apelido });
  }

  private buildYoutubeThumbnailUrl(videoId: string | null | undefined): string {
    const normalizedVideoId = (videoId ?? '').toString().trim();
    return normalizedVideoId ? `https://i.ytimg.com/vi/${normalizedVideoId}/hqdefault.jpg` : '';
  }

  private normalizeSongItem(item: any): any {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const normalized = { ...item };
    const thumbnailCandidates = [
      normalized.thumbnailUrl,
      normalized.thumbnail_url,
      normalized.thumbnail,
      normalized.miniatura,
      normalized.imageUrl,
      normalized.image_url,
      normalized.artwork,
      normalized.cover,
      normalized.snippet?.thumbnails?.default?.url,
      normalized.snippet?.thumbnails?.medium?.url,
      normalized.snippet?.thumbnails?.high?.url,
      normalized.defaultThumbnailUrl,
      normalized.urlImagem,
    ];

    const resolvedThumbnail = thumbnailCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)
      ?? this.buildYoutubeThumbnailUrl(
          normalized.videoId || normalized.id?.videoId || normalized.youtubeId || normalized.video_id || normalized.id
        );
    normalized.thumbnailUrl = resolvedThumbnail;

    return normalized;
  }

  private normalizeResultList(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeSongItem(item));
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidates = [
      payload.items,
      payload.results,
      payload.data,
      payload.musicas,
      payload.videos,
      payload.suggestions
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map((item) => this.normalizeSongItem(item));
      }
    }

    return [];
  }

  private buildYoutubeSearchTerm(termo: string): string {
    const query = (termo ?? '').trim();
    if (!query) {
      return '';
    }

    const normalized = query.toLowerCase();
    if (normalized.includes('karaoke') || normalized.includes('karaokê')) {
      return query;
    }

    return `${query} karaoke`;
  }

  buscarVideos(termo: string): Observable<any[]> {
    const query = this.buildYoutubeSearchTerm(termo);

    if (!query) {
      return of([]);
    }

    return this.http.get<any[]>(`${this.BASE_URL}/search`, { params: { q: query } }).pipe(
      map((youtubeResults) => this.normalizeResultList(youtubeResults).slice(0, 10)),
      catchError(() => of([]))
    );
  }

  searchYoutubeVideos(termo: string): Observable<any[]> {
    return this.buscarVideos(termo);
  }

  getLocalSearchSuggestions(termo: string): Observable<any[]> {
    const query = (termo ?? '').trim();

    if (!query) {
      return of([]);
    }

    return this.http.get<any[]>(`${this.BASE_URL}/search/local`, { params: { q: query } });
  }

  getTopSongsLast30Days(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/queue/top-10/last-30-days`);
  }

  adicionarNaFila(videoId: string, titulo: string, nome: string, telefone: string, thumbnailUrl?: string): Observable<any> {
    const body = {
      videoId: videoId,
      titulo: titulo,
      nome: nome,
      telefone: telefone,
      thumbnailUrl: thumbnailUrl || this.buildYoutubeThumbnailUrl(videoId)
    };
    return this.http.post(`${this.BASE_URL}/queue/add`, body);
  }

  verPosicao(telefoneUsuario: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}/queue/position/${telefoneUsuario}`); 
  }

  getCancelStatus(telefoneUsuario: string): Observable<{ cancelada: boolean; mensagem?: string }> {
    return this.http.get<{ cancelada: boolean; mensagem?: string }>(`${this.BASE_URL}/queue/cancel-status/${telefoneUsuario}`);
  }

  getProximaMusica(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/queue/next`);
  }

  musicaTerminada(videoId: string): Observable<any> {
    const body = { videoId: videoId };
    return this.http.post(`${this.BASE_URL}/queue/complete`, body);
  }

  pausePlayer(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/player/pause`, {});
  }

  playPlayer(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/player/play`, {});
  }

  restartPlayer(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/player/restart`, {});
  }

  getPlayerStatus(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/player/status`);
  }

  skipSong(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/player/skip`, {});
  }

  getQueueView(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/queue/view`);
  }

  getQueueSize(): Observable<any>{
    return this.http.get(`${this.BASE_URL}/admin/queue/count`);
  }

  getLogDoDia(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/log/dia`);
  }

  cancelSong(telefone: string, mensagem?: string): Observable<any> {
    return this.http.post(`${this.BASE_URL}/queue/cancel`, {
      telefone,
      mensagem: mensagem || 'Cancelado pelo admin'
    });
  }

  fazerLogin(dadosUsuario: { nome: string; email: string; telefone: string }): Observable<any> { 
    return this.http.post(`${this.BASE_URL}/login`, dadosUsuario);
  }

  getUsuariosRegistados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/users`);
  }

  adminAddSong(nome: string, videoId: string, titulo: string, thumbnailUrl?: string): Observable<any> {
    const body = {
      nome: nome,
      videoId: videoId,
      titulo: titulo,
      thumbnailUrl: thumbnailUrl || this.buildYoutubeThumbnailUrl(videoId)
    };
    return this.http.post(`${this.BASE_URL}/admin/queue/add`, body);
  }

  getQuotaUsage(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/admin/quota`);
  }

  lockQueue(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/queue/lock`, {});
  }

  unlockQueue(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/queue/unlock`, {});
  }
  removeUserSong(userId: string): Observable<any> {
   
    return this.http.post(`${this.BASE_URL}/queue/remove-by-user/${userId}`, {});
  }

  notifyVideoError(payload: { videoId: string, url: string, message: string }): Observable<any> {
    return this.http.post(`${this.BASE_URL}/queue/error/notify`, payload);
  }

  getErrorStatus(): Observable<{
    errorUserName: string , errorVideoId: string, errorVideoUrl: string, errorMessage: string 
}> {
    return this.http.get<any>(`${this.BASE_URL}/queue/error/status`);
  }

  clearVideoError(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/queue/error/clear`, {});
  }
}