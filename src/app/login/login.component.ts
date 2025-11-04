import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { cpfValidator } from '../validators/cpf.validator'; 
import { nomeSobrenomeValidator } from '../validators/name.validator';
import { CommonModule } from '@angular/common'; 
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
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      nome: ['', [
          Validators.required, 
          nomeSobrenomeValidator
        ]
      ],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [
          Validators.required, 
          Validators.minLength(11),
          Validators.maxLength(11), 
          cpfValidator
        ]
      ]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const userData = this.loginForm.value;
      console.log('Dados do formulário (Login):', userData);
      this.loginService.salvarLogin(userData);
      console.log('Formulário válido, navegando para /buscar');
      this.router.navigate(['/buscar']); 
    } else {
      console.log('Formulário inválido. Por favor, verifique os campos.');
    }
  }

  get nome() { return this.loginForm.get('nome'); }
  get email() { return this.loginForm.get('email'); }
  get cpf() { return this.loginForm.get('cpf'); }
}