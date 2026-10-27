import { TestBed } from '@angular/core/testing';

import { HistoricService } from './historic.service';

describe('HistoricService', () => {
  let service: HistoricService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistoricService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
