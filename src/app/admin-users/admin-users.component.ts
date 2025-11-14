import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; 
import { RouterLink } from '@angular/router'; 
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.less'],
  providers: [DatePipe] 
})
export class AdminUsersComponent implements OnInit {

  public usersList: any[] = [];
  public isLoading: boolean = true;
  public error: string | null = null;

  constructor(
    private apiService: ApiService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios(): void {
    this.isLoading = true;
    this.apiService.getUsuariosRegistados().subscribe({
      next: (data) => {
        this.usersList = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erro ao carregar utilizadores:", err);
        this.error = "Falha ao carregar a lista de utilizadores.";
        this.isLoading = false;
      }
    });
  }
  
  formatarData(data: string | null): string {
    if (!data) return '---';
    return this.datePipe.transform(data, 'dd/MM/yyyy HH:mm') || '---';
  }
}