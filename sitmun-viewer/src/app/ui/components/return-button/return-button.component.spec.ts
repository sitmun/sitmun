import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService, provideTranslateService } from '@ngx-translate/core';

import { ReturnButtonComponent } from './return-button.component';

describe('ReturnButtonComponent', () => {
  let component: ReturnButtonComponent;
  let fixture: ComponentFixture<ReturnButtonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReturnButtonComponent],
      imports: [
        TranslatePipe,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
      ],
      providers: [
      provideTranslateService(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Location,
          useValue: {
            back: jest.fn(),
            forward: jest.fn()
          }
        },
        TranslateService
      ]
    });
    fixture = TestBed.createComponent(ReturnButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to profile.back label key', () => {
    expect(component.labelKey).toBe('profile.back');
  });

  it('accepts a custom label key', () => {
    component.labelKey = 'territory.back';
    expect(component.labelKey).toBe('territory.back');
  });
});
