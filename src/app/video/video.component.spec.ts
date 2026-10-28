import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { VideoComponent } from './video.component';
import { ApiService } from '../service/api.service';
import { LoginService } from '../service/login.service';

describe('VideoComponent', () => {
  let component: VideoComponent;
  let fixture: ComponentFixture<VideoComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let loginService: jasmine.SpyObj<LoginService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'buscarVideos',
      'getLocalSearchSuggestions',
      'getTopSongsLast30Days',
      'adicionarNaFila',
      'getQueueView'
    ]);
    loginService = jasmine.createSpyObj<LoginService>('LoginService', [
      'estaLogado',
      'getUsuarioLogado',
      'fazerLogout',
      'salvarPosicao'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    loginService.estaLogado.and.returnValue(true);
    loginService.getUsuarioLogado.and.returnValue({
      nome: 'Teste',
      email: 'teste@email.com',
      telefone: '11999999999'
    });

    apiService.getLocalSearchSuggestions.and.returnValue(of([
      { titulo: 'Believer', videoId: 'abc123', score: 90 },
      { titulo: 'Believer - Live Version', videoId: 'def456', score: 70 }
    ]));
    apiService.getTopSongsLast30Days.and.returnValue(of([
      { titulo: 'Someone Like You', totalPedidos: 3, videoId: 'xyz789' }
    ]));

    await TestBed.configureTestingModule({
      imports: [VideoComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: LoginService, useValue: loginService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear suggestions when query is empty', () => {
    component.searchResults = [{ titulo: 'Believer', score: 90 } as any];
    component.searchForm.patchValue({ query: '' });

    component.onQueryInput();

    expect(component.searchResults).toEqual([]);
    expect(apiService.getLocalSearchSuggestions).not.toHaveBeenCalled();
  });

  it('should call local backend suggestions when typing a query', () => {
    jasmine.clock().install();
    component.searchForm.patchValue({ query: 'bel' });

    component.onQueryInput();
    jasmine.clock().tick(400);
    jasmine.clock().uninstall();

    expect(apiService.getLocalSearchSuggestions).toHaveBeenCalledWith('bel');
    expect(component.searchResults.length).toBeGreaterThan(0);
  });

  it('should not treat same title with different artist as duplicate in queue', () => {
    apiService.getQueueView.and.returnValue(of([
      { titulo: 'Caju', artista: 'Liniker', videoId: 'queued-1' }
    ]));

    const addSpy = spyOn(component as any, 'adicionarMusica');

    component.onSuggestionSelect({
      titulo: 'Caju',
      artista: 'Tião Carreiro',
      videoId: 'new-1'
    });

    expect(component.duplicateQueueModal.visible).toBeFalse();
    expect(addSpy).toHaveBeenCalled();
  });
});
