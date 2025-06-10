import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NearmePage } from './nearme.page';

describe('NearmePage', () => {
  let component: NearmePage;
  let fixture: ComponentFixture<NearmePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NearmePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
