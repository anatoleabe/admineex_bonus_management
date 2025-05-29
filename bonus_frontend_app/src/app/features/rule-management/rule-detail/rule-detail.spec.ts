import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleDetail } from './rule-detail';

describe('RuleDetail', () => {
  let component: RuleDetail;
  let fixture: ComponentFixture<RuleDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RuleDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
