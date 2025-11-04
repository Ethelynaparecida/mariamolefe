import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly BASE_URL = /* 'http://localhost:8080/api'; */'https://mariamole.onrender.com/api';

  constructor(private http: HttpClient) { }

  login(apelido: string): Observable<any> {
    return this.http.post(`${this.BASE_URL}/login`, { apelido: apelido });
  }

  buscarVideos(termo: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}/search`, { params: { q: termo } });
  }
  
  adicionarNaFila(videoId: string, titulo: string, nome: string, cpf: string): Observable<any> {
    const body = {
      videoId: videoId,
      titulo: titulo,
      nome: nome,
      cpf: cpf
    };
    return this.http.post(`${this.BASE_URL}/queue/add`, body);
  }

  verPosicao(apelido: string): Observable<any> {
     return this.http.get(`${this.BASE_URL}/queue/position/${apelido}`);
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

  getPlayerStatus(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/player/status`);
  }

  /*** Pular a música atual.*/
  skipSong(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/admin/player/skip`, {});
  }

  /*** Buscapróximas músicas na fila.*/
  getQueueView(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/admin/queue/view`);
  }

  getLogDoDia(): Observable<any[]> {
    // Este endpoint chama o GET /api/admin/log/dia
    return this.http.get<any[]>(`${this.BASE_URL}/admin/log/dia`);
  }
}