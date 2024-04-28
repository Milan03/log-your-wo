import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExerciseDirectoryService {

  constructor(private http: HttpClient) { }

  getExercises(): Observable<any> {
    return this.http.get('/assets/exercises.json');
  }
}
