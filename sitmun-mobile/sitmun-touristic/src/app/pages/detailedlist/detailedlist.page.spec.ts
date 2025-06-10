import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailedlistPage } from './detailedlist.page';

describe('DetailedlistPage', () => {
  let component: DetailedlistPage;
  let fixture: ComponentFixture<DetailedlistPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailedlistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
