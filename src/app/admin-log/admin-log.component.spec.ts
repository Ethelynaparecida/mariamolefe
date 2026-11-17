import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ApiService } from '../service/api.service';
import { AdminLogComponent } from './admin-log.component';

describe('AdminLogComponent', () => {
  let component: AdminLogComponent;
  let fixture: ComponentFixture<AdminLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLogComponent, HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect a pending song and the cancel reason from history data', () => {
    const item = {
      nomeUsuario: 'Maria',
      telefoneUsuario: '5511999999999',
      ipUsuario: '10.0.0.3',
      titulo: 'Minha Música',
      horarioExibicao: null,
      motivoCancelamento: null,
    };

    expect(component.isPending(item)).toBeTrue();
    expect(component.getMotivoCancelamento(item)).toBe('Pendente');
    expect(component.getIpUsuario(item)).toBe('10.0.0.3');
  });

  it('should ask for a reason before cancelling and call the API with it', () => {
    const apiService = TestBed.inject(ApiService);
    spyOn(window, 'prompt').and.returnValue('Vídeo indisponível');
    spyOn(apiService, 'cancelSong').and.returnValue(of({ ok: true }));

    component.cancelarMusica({
      telefoneUsuario: '5511999999999',
      nomeUsuario: 'Maria',
      titulo: 'Minha Música'
    });

    expect(window.prompt).toHaveBeenCalled();
    expect(apiService.cancelSong).toHaveBeenCalledWith('5511999999999', 'Vídeo indisponível');
  });

  it('should format a cancelled history row with the stored reason', () => {
    const item = {
      motivoCancelamento: 'Usuário saiu da fila',
      horarioExibicao: '2024-01-02T12:00:00',
    };

    expect(component.getMotivoCancelamento(item)).toBe('Usuário saiu da fila');
    expect(component.formatarData(item.horarioExibicao)).toBe('02/01 12:00:00');
  });
});
