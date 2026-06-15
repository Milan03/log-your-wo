/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    let component = TestBed.runInInjectionContext(() => new HomeComponent());
    expect(component).toBeTruthy();
  });
});
