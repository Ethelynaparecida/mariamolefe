import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../service/api.service';
import { Subscription, interval, forkJoin } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { LoginService } from '../service/login.service';
import { takeUntil } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.less']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // --- Variáveis de Estado da UI ---
  public feedbackMessage: string = '';

  // --- Variáveis de Polling (Fila e Pausa) ---
  public isPaused: boolean = false;
  public queueView: any[] = [];
  public currentSong: any = null;
  public upcomingSongs: any[] = [];
  public isQueueLocked: boolean = false;
  private adminPoll: Subscription | null = null;
  private readonly POLLING_INTERVAL_MS = 3000; 

  // --- Variáveis do Formulário de Admin ---
  public adminSearchForm: FormGroup;
  public adminSearchResults: any[] = [];
  public isSearching: boolean = false;
  public isAddingByUrl: boolean = false;

  public quotaUsage: any = null;


  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private loginService: LoginService
  ) {
    this.adminSearchForm = this.fb.group({
      nome: ['', Validators.required], 
      query: [''], 
      
      videoUrl: ['', [Validators.pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/)]]
    });
  }

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
            quota: this.apiService.getQuotaUsage()
          })
        ),
        takeUntil(this.loginService.logout$) 
      )
      .subscribe(response => {
        this.isPaused = response.status.isPaused;
        this.isQueueLocked = response.status.isQueueLocked;
        this.queueView = response.queue;
        this.currentSong = this.queueView.length > 0 ? this.queueView[0] : null;
        this.upcomingSongs = this.queueView.length > 1 ? this.queueView.slice(1) : [];
        this.quotaUsage = response.quota;
      });
  }

  pause(): void {
    this.apiService.pausePlayer().subscribe({
        next: (response) => {
            console.log("Comando de Pausa enviado com sucesso.", response);  
            this.isPaused = true; 
        },
        error: (error) => {
            console.error("Erro ao enviar comando de Pausa.", error);
            
        }
    });
}

  play(): void {
    this.apiService.playPlayer().subscribe({
        next: (response) => {
            console.log("Comando de Play enviado com sucesso.", response);
            this.isPaused = false; 
        },
        error: (error) => {
            console.error("Erro ao enviar comando de Play.", error);
        }
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
        }
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

  onDisabledClick(): void {
    if (this.adminSearchForm.get('nome')?.invalid) {
      this.adminSearchForm.get('nome')?.markAsTouched();
    }
  }

  onAdminSearch($event: Event): void {
    if (this.adminSearchForm.get('nome')?.valid) {
      $event.stopPropagation(); 
    }
    
    const queryValue = this.adminSearchForm.get('query')?.value;
    if (!queryValue) return;

    this.isSearching = true;
    this.adminSearchResults = [];

    let searchTerm: string = queryValue;
    const searchTermLower = searchTerm.toLowerCase();
    if (!searchTermLower.includes('karaoke') && !searchTermLower.includes('karaokê')) {
      searchTerm += ' karaoke';
    }

    this.apiService.buscarVideos(searchTerm).subscribe({
      next: (results) => {
        this.adminSearchResults = results.items || []; 
        this.isSearching = false;
      },
      error: (err) => {
        console.error('Erro ao buscar vídeos (Admin):', err);
        this.isSearching = false;
      }
    });
  }
  

  onAdminAddByUrl($event: Event): void {
    if (this.adminSearchForm.get('nome')?.valid) {
      $event.stopPropagation(); 
    }

    if (this.adminSearchForm.get('nome')?.invalid || this.adminSearchForm.get('videoUrl')?.invalid) {
      return;
    }
    
    this.isAddingByUrl = true;
    
    const nome = this.adminSearchForm.get('nome')?.value;
    const url = this.adminSearchForm.get('videoUrl')?.value;
    const videoId = this.parseAndValidateVideoId(url);;

    if (!videoId) {
      this.mostrarFeedback("URL do YouTube inválida.");
      this.isAddingByUrl = false;
      return;
    }

    const titulo = "Karaoke"; 

    this.apiService.adminAddSong(nome, videoId, titulo).subscribe({
      next: () => {
        this.mostrarFeedback(`Música adicionada para ${nome}!`);
        this.adminSearchForm.get('videoUrl')?.reset(); 
        this.forceRefresh();
        this.isAddingByUrl = false;
      },
      error: (err) => {
        this.mostrarFeedback("Erro ao adicionar a música.");
        console.error(err);
        this.isAddingByUrl = false;
      }
    });
  }

  onAdminAddSong(video: any): void { 
    const nome = this.adminSearchForm.get('nome')?.value;
    if (!nome) {
        this.mostrarFeedback("Erro: O nome do utilizador desapareceu.");
        return;
    }
    
    const videoId = video.id.videoId;
    const titulo = video.snippet.title;
    
    this.apiService.adminAddSong(nome, videoId, titulo).subscribe({
        next: () => {
            this.mostrarFeedback(`'${titulo}' adicionado para ${nome}!`);
            this.adminSearchResults = []; 
            this.adminSearchForm.get('query')?.reset(); 
            this.forceRefresh();
        },
        error: (err) => {
            this.mostrarFeedback("Erro ao adicionar a música.");
            console.error(err);
        }
    });
  }

  private parseVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  forceRefresh(): void {
    if (this.adminPoll) {
      this.adminPoll.unsubscribe();
    }
    this.startAdminPolling();
  }


  mostrarFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => this.feedbackMessage = '', 2000);
  }

  lockQueue(): void {
    this.apiService.lockQueue().subscribe(() => {
      this.mostrarFeedback('Fila BLOQUEADA');
      this.isQueueLocked = true; 
    });
  }

  unlockQueue(): void {
    this.apiService.unlockQueue().subscribe(() => {
      this.mostrarFeedback('Fila DESBLOQUEADA');
      this.isQueueLocked = false; 
    });
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
}