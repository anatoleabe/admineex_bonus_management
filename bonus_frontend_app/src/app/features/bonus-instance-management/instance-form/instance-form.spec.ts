import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceForm } from './instance-form';

describe('InstanceForm', () => {
  let component: InstanceForm;
  let fixture: ComponentFixture<InstanceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
