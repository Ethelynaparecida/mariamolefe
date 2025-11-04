import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validador customizado para CPF.
 */
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  
 
  const cpf = (control.value || '').replace(/[^\d]/g, '');

  if (cpf.length !== 11) {

    return cpf.length === 0 ? null : { cpfInvalido: true };
  }


  if (/^(\d)\1{10}$/.test(cpf)) {
    return { cpfInvalido: true };
  }

  let sum: number = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) {
    remainder = 0;
  }

  if (remainder !== parseInt(cpf.substring(9, 10))) {
    return { cpfInvalido: true }; 
  }

  sum = 0; 
 
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) {
    remainder = 0;
  }

  if (remainder !== parseInt(cpf.substring(10, 11))) {
    return { cpfInvalido: true }; 
  }

  return null;
}