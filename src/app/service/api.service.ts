import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly BASE_URL ='https://mariamole.onrender.com/api';
 /*//private readonly BASE_URL = 'http://localhost:8080/api'; */
  constructor(private http: HttpClient) { }

  login(apelido: string): Observable<any> {
    return this.http.post(`${this.BASE_URL}/login`, { apelido: apelido });
  }

  buscarVideos(termo: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}/search`, { params: { q: termo } });
  }

  adicionarNaFila(videoId: string, titulo: string, nome: string, telefone: string): Observable<any> {
    const body = {
      videoId: videoId,
      titulo: titulo,
      nome: nome,
      telefone: telefone
    };
    return this.http.post(`${this.BASE_URL}/queue/add`, body);
  }

  verPosicao(telefoneUsuario: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}/queue/position/${telefoneUsuario}`); 
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

  getLogDoDia(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/log/dia`);
  }
  fazerLogin(dadosUsuario: { nome: string; email: string; telefone: string }): Observable<any> { 
    return this.http.post(`${this.BASE_URL}/login`, dadosUsuario);
  }

  getUsuariosRegistados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/users`);
  }

  adminAddSong(nome: string, videoId: string, titulo: string): Observable<any> {
    const body = {
      nome: nome,
      videoId: videoId,
      titulo: titulo
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
}