/* tslint:disable:no-unused-variable */

import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HomeComponent } from './home.component';

describe('Component: Home', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([])
      ]
    });
  });

  it('should create an instance', () => {
    let component = new HomeComponent(TestBed.inject(Router));
    expect(component).toBeTruthy();
  });
});
