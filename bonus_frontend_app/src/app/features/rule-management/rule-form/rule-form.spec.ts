import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleForm } from './rule-form';

describe('RuleForm', () => {
  let component: RuleForm;
  let fixture: ComponentFixture<RuleForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RuleForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
