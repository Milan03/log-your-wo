/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { WorkoutHeaderService } from '../../../shared/services/workout-header.service';

describe('Component: Home', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        WorkoutHeaderService
      ]
    });
  });

  it('should create an instance', () => {
    let component = TestBed.runInInjectionContext(() => new HomeComponent());
    expect(component).toBeTruthy();
  });
});
