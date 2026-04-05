import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  etapaConfirmacao: boolean = false; 
  mostrarAvisoEmail: boolean = false;
  estaCarregando: boolean = false; 

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      nome: ['', [Validators.required, nomeSobrenomeValidator]],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', [
          Validators.required, 
          Validators.minLength(10), 
          Validators.maxLength(15),
          Validators.pattern(/^(\(?\d{2}\)?\s?)?(9\d{4}-?\d{4}|\d{4}-?\d{4})$/)
        ]
      ],
      token: [''] 
    });
  }

  ngOnInit(): void {
    console.log('[Login] Tela de login carregada.');
  }

  voltarEtapa() {
    console.log('[Login] Voltando para a etapa de edicao de dados.');
    this.etapaConfirmacao = false;
    this.loginForm.get('token')?.setValue('');
    this.loginForm.get('token')?.clearValidators();
    this.loginForm.get('token')?.updateValueAndValidity();
  }

  onSubmit(): void {
    const nomeAtual = this.loginForm.get('nome')?.value;
    
    if (nomeAtual) {
      const nomeLimpo = nomeAtual.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
      this.loginForm.patchValue({ nome: nomeLimpo }, { emitEvent: false });
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (!this.etapaConfirmacao) {
      this.solicitarCodigo(false); 
    } else {
      this.validarCodigo();
    }
  }

  solicitarCodigo(forcar: boolean = false) {
    this.estaCarregando = true;
    const dadosBasicos = {
      nome: this.loginForm.value.nome,
      email: this.loginForm.value.email,
      telefone: this.loginForm.value.telefone,
      forcar: forcar 
    };

    this.apiService.solicitarToken(dadosBasicos).subscribe({
      next: (response: any) => {
        this.estaCarregando = false;
        console.log('[Login] SUCESSO:', response);
        
        if (response.reutilizado) {
          alert(response.mensagem);
        }
        
        this.etapaConfirmacao = true; 
        this.loginForm.get('token')?.setValidators([Validators.required, Validators.minLength(4)]);
        this.loginForm.get('token')?.updateValueAndValidity();
      },
      error: (err) => {
        this.estaCarregando = false;
        if (err.status === 409 && err.error?.requerConfirmacao) {
          const desejaForcar = window.confirm(err.error.erro);
          if (desejaForcar) {
            this.solicitarCodigo(true);
          }
        } else {
          console.error('[Login] ERRO: Falha ao solicitar token.', err);
          const mensagemErro = err.error?.erro || 'Erro inesperado ao solicitar o codigo.';
          alert(mensagemErro); 
        }
      }
    });
  }

  validarCodigo() {
    this.estaCarregando = true;
    const dadosValidacao = {
      email: this.loginForm.value.email,
      token: this.loginForm.value.token
    };

    this.apiService.validarToken(dadosValidacao).subscribe({
      next: (response: any) => {
        this.estaCarregando = false;
        console.log('[Login] SUCESSO: Token validado!', response);
        
        this.loginService.salvarLogin(this.loginForm.value); 
        this.router.navigate(['/buscar']);
      },
      error: (err) => {
        this.estaCarregando = false;
        console.error('[Login] ERRO: Falha ao validar token.', err);
        const mensagemErro = err.error?.erro || 'Erro ao validar o codigo.';
        alert(mensagemErro); 
      }
    });
  }

  get nome() { return this.loginForm.get('nome'); }
  get email() { return this.loginForm.get('email'); }
  get telefone() { return this.loginForm.get('telefone'); }
  get token() { return this.loginForm.get('token'); }
}