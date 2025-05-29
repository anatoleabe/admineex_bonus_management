import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceDetail } from './instance-detail';

describe('InstanceDetail', () => {
  let component: InstanceDetail;
  let fixture: ComponentFixture<InstanceDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
