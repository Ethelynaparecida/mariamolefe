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
        this.logData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erro ao carregar log:", err);
        this.error = "Falha ao carregar o histórico.";
        this.isLoading = false;
      }
    });
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