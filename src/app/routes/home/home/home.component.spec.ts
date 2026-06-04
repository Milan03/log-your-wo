/* tslint:disable:no-unused-variable */

import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HomeComponent } from './home.component';
import { SharedService } from '../../../shared/services/shared.service';

describe('Component: Home', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        SharedService
      ]
    });
  });

  it('should create an instance', () => {
    let component = new HomeComponent(TestBed.inject(Router), TestBed.inject(SharedService));
    expect(component).toBeTruthy();
  });
});
