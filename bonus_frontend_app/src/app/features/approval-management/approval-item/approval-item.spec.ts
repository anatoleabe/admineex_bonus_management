import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalItem } from './approval-item';

describe('ApprovalItem', () => {
  let component: ApprovalItem;
  let fixture: ComponentFixture<ApprovalItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
