import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fallback to YouTube search only when local search returns no results', () => {
    const searchTerm = 'believer';
    let result: any[] = [];

    service.buscarVideos(searchTerm).subscribe((response) => {
      result = response;
    });

    const localReq = httpMock.expectOne((req) =>
      req.method === 'GET' && req.url.includes('/search/local') && req.params.get('q') === searchTerm
    );
    expect(localReq.request.method).toBe('GET');
    localReq.flush([]);

    const youtubeReq = httpMock.expectOne((req) =>
      req.method === 'GET' && req.url.includes('/search') && req.params.get('q') === searchTerm
    );
    expect(youtubeReq.request.method).toBe('GET');

    youtubeReq.flush([{ titulo: 'Believer', videoId: 'abc123', score: 10 }]);

    expect(result.length).toBe(1);
    expect(result[0].titulo).toBe('Believer');
  });
});
