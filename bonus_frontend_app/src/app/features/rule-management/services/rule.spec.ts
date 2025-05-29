import { TestBed } from '@angular/core/testing';

import { Rule } from './rule';

describe('Rule', () => {
  let service: Rule;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rule);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
