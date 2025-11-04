import { AbstractControl, ValidationErrors } from '@angular/forms';

export function nomeSobrenomeValidator(control: AbstractControl): ValidationErrors | null {
  
  const nome = (control.value || '').trim();

  if (!nome) {
    return null;
  }

  const temEspaco = nome.includes(' ');

  return !temEspaco ? { nomeIncompleto: true } : null;
}