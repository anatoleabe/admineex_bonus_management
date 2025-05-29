import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceList } from './instance-list';

describe('InstanceList', () => {
  let component: InstanceList;
  let fixture: ComponentFixture<InstanceList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
