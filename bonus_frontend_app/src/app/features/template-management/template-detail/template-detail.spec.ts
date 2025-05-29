import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateDetail } from './template-detail';

describe('TemplateDetail', () => {
  let component: TemplateDetail;
  let fixture: ComponentFixture<TemplateDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
