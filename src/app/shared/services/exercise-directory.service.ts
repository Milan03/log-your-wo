import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExerciseDirectoryEntry {
    name: string;
    force?: string;
    level?: string;
    mechanic?: string;
    equipment?: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
}

export interface ExerciseDirectory {
    exercises: ExerciseDirectoryEntry[];
}

@Injectable({
    providedIn: 'root'
})
export class ExerciseDirectoryService {

    constructor(private http: HttpClient) { }

    public getExercises(): Observable<ExerciseDirectory> {
        return this.http.get<ExerciseDirectory>('/assets/exercises.json');
    }

    public getCardioExercises(): Observable<ExerciseDirectory> {
        return this.http.get<ExerciseDirectory>('/assets/cardio-exercises.json');
    }
}
