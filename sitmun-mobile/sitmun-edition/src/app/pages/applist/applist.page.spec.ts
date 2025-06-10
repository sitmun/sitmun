import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplistPage } from './applist.page';

describe('ApplistPage', () => {
  let component: ApplistPage;
  let fixture: ComponentFixture<ApplistPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ApplistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
