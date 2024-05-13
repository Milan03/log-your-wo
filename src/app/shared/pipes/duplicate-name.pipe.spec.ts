import { DuplicateNamePipe } from './duplicate-name.pipe';

describe('DuplicateNamePipe', () => {
  let pipe: DuplicateNamePipe;

  beforeEach(() => {
    pipe = new DuplicateNamePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the exercise name if it is the first occurrence', () => {
    const exercises = [{ exerciseName: 'Squat' }, { exerciseName: 'Bench Press' }];
    const result = pipe.transform(exercises, exercises[0], 0);
    expect(result).toBe('Squat');
  });

  it('should return quotes if the exercise name is a duplicate', () => {
    const exercises = [{ exerciseName: 'Squat' }, { exerciseName: 'Squat' }];
    const result = pipe.transform(exercises, exercises[1], 1);
    expect(result).toBe('"');
  });

  it('should return the exercise name if it is not a duplicate', () => {
    const exercises = [{ exerciseName: 'Squat' }, { exerciseName: 'Bench Press' }];
    const result = pipe.transform(exercises, exercises[1], 1);
    expect(result).toBe('Bench Press');
  });

  it('should handle multiple duplicates correctly', () => {
    const exercises = [{ exerciseName: 'Squat' }, { exerciseName: 'Squat' }, { exerciseName: 'Squat' }];
    const result1 = pipe.transform(exercises, exercises[1], 1);
    const result2 = pipe.transform(exercises, exercises[2], 2);
    expect(result1).toBe('"');
    expect(result2).toBe('"');
  });

  it('should return the exercise name if it is a different name after a duplicate', () => {
    const exercises = [{ exerciseName: 'Squat' }, { exerciseName: 'Squat' }, { exerciseName: 'Bench Press' }];
    const result = pipe.transform(exercises, exercises[2], 2);
    expect(result).toBe('Bench Press');
  });
});
