import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

export const PLAYER_AUTH_KEY = 'player-auth-token';

@Component({
  selector: 'app-player-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './player-login.component.html',
  styleUrls: ['./player-login.component.less']
})
export class PlayerLoginComponent {
  
  private readonly ADMIN_PIN = 'MariaMole2025'; 

  loginForm: FormGroup;
  loginError: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      pin: ['', Validators.required]
    });
  }

  onSubmit(): void {
    const pinDigitado = this.loginForm.get('pin')?.value;

    if (pinDigitado === this.ADMIN_PIN) {
      this.loginError = false;
      localStorage.setItem(PLAYER_AUTH_KEY, 'true'); 
      
     this.router.navigate(['/admin/dashboard']);

    } else {
      this.loginError = true;
      this.loginForm.reset();
    }
  }
}