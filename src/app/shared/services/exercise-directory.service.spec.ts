import { TestBed } from '@angular/core/testing';

import { ExerciseDirectoryService } from './exercise-directory.service';

describe('ExerciseDirectoryService', () => {
  let service: ExerciseDirectoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExerciseDirectoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
