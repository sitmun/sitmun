import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FavitemsPage } from './favitems.page';

describe('FavitemsPage', () => {
  let component: FavitemsPage;
  let fixture: ComponentFixture<FavitemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FavitemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
