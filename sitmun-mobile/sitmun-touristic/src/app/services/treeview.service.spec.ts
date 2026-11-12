import { TestBed } from '@angular/core/testing';

import { TreeviewService } from './treeview.service';

describe('TreeviewService', () => {
  let service: TreeviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TreeviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
