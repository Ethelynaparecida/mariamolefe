import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { cpfValidator } from '../validators/cpf.validator'; 
import { nomeSobrenomeValidator } from '../validators/name.validator';
import { CommonModule } from '@angular/common'; 
import { ApiService } from '../service/api.service';
import { LoginService } from '../service/login.service';

@Component({
  selector: 'app-login', 
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule 
  ],
  templateUrl: './login.component.html', 
  styleUrls: ['./login.component.less'] 
})
export class LoginComponent implements OnInit { 

  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      nome: ['', [
          Validators.required, 
          nomeSobrenomeValidator
        ]
      ],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', [
              Validators.required, 
              Validators.minLength(10), 
              Validators.maxLength(15)  
            ]
          ]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const userData = this.loginForm.value;
      
      this.apiService.fazerLogin(userData).subscribe({
        
        next: (response) => {
          console.log('Backend confirmou o login:', response);
          this.loginService.salvarLogin(userData); 
          this.router.navigate(['/buscar']);
        },
        error: (err) => {
          console.error('ERRO ao contactar o backend para o login:', err);
          this.loginService.salvarLogin(userData); 
          this.router.navigate(['/buscar']);
        }
      });
      
    } else {
      console.log('Formulário inválido, a marcar campos.');
      this.loginForm.markAllAsTouched();
    }
  }

  get nome() { return this.loginForm.get('nome'); }
  get email() { return this.loginForm.get('email'); }
  get telefone() { return this.loginForm.get('telefone'); }
}