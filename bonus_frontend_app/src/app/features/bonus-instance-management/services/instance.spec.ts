import { TestBed } from '@angular/core/testing';

import { Instance } from './instance';

describe('Instance', () => {
  let service: Instance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Instance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
