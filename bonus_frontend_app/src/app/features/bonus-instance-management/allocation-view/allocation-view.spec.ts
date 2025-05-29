import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllocationView } from './allocation-view';

describe('AllocationView', () => {
  let component: AllocationView;
  let fixture: ComponentFixture<AllocationView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllocationView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllocationView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
