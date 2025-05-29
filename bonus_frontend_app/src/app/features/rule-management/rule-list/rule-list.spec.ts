import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleList } from './rule-list';

describe('RuleList', () => {
  let component: RuleList;
  let fixture: ComponentFixture<RuleList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RuleList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
