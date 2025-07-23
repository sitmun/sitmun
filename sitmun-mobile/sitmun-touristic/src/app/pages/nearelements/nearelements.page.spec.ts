import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NearelementsPage } from './nearelements.page';

describe('NearelementsPage', () => {
  let component: NearelementsPage;
  let fixture: ComponentFixture<NearelementsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NearelementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
