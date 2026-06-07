import { Injectable } from '@angular/core';

import { ImportedProgram, ImportedWorkoutState } from '../models/imported-program.model';
import { SavedSimpleLog } from '../models/simple-log.model';
import { UserProfile } from '../models/profile.model';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';

export interface UserPreferences {
    activeProgramId?: string;
    completionColor?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseDataService {
    constructor(private supabase: SupabaseClientService) { }

    public async getSimpleLogs(userId: string): Promise<SavedSimpleLog[]> {
        const { data, error } = await this.supabase.client
            .from('workout_logs')
            .select('data')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        this.throwIfError(error);
        return (data || []).map(row => row.data as SavedSimpleLog);
    }

    public async saveSimpleLogs(userId: string, logs: SavedSimpleLog[]): Promise<void> {
        if (!logs.length) {
            return;
        }

        const { error } = await this.supabase.client
            .from('workout_logs')
            .upsert(logs.map(log => ({
                id: log.id,
                user_id: userId,
                workout_date: log.workoutDate,
                created_at: log.createdAt,
                updated_at: log.updatedAt,
                data: log
            })), {
                onConflict: 'user_id,id'
            });

        this.throwIfError(error);
    }

    public async deleteSimpleLog(userId: string, logId: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('workout_logs')
            .delete()
            .eq('user_id', userId)
            .eq('id', logId);

        this.throwIfError(error);
    }

    public async getPrograms(userId: string): Promise<ImportedProgram[]> {
        const { data, error } = await this.supabase.client
            .from('imported_programs')
            .select('data')
            .eq('user_id', userId)
            .order('imported_at', { ascending: false });

        this.throwIfError(error);
        return (data || []).map(row => row.data as ImportedProgram);
    }

    public async savePrograms(userId: string, programs: ImportedProgram[]): Promise<void> {
        if (!programs.length) {
            return;
        }

        const { error } = await this.supabase.client
            .from('imported_programs')
            .upsert(programs.map(program => ({
                id: program.id,
                user_id: userId,
                name: program.name,
                imported_at: program.importedAt,
                data: program
            })), {
                onConflict: 'user_id,id'
            });

        this.throwIfError(error);
    }

    public async deleteProgram(userId: string, programId: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('imported_programs')
            .delete()
            .eq('user_id', userId)
            .eq('id', programId);

        this.throwIfError(error);
    }

    public async getWorkoutStates(userId: string): Promise<ImportedWorkoutState[]> {
        const { data, error } = await this.supabase.client
            .from('imported_workout_states')
            .select('data,updated_at')
            .eq('user_id', userId);

        this.throwIfError(error);
        return (data || []).map(row => ({
            ...(row.data as ImportedWorkoutState),
            updatedAt: (row.data as ImportedWorkoutState).updatedAt || row.updated_at
        }));
    }

    public async saveWorkoutStates(userId: string, states: ImportedWorkoutState[]): Promise<void> {
        if (!states.length) {
            return;
        }

        const { error } = await this.supabase.client
            .from('imported_workout_states')
            .upsert(states.map(state => ({
                user_id: userId,
                program_id: state.programId,
                week_id: state.weekId,
                day_id: state.dayId,
                updated_at: state.updatedAt || new Date().toISOString(),
                data: state
            })), {
                onConflict: 'user_id,program_id,week_id,day_id'
            });

        this.throwIfError(error);
    }

    public async deleteWorkoutStates(userId: string, programId: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('imported_workout_states')
            .delete()
            .eq('user_id', userId)
            .eq('program_id', programId);

        this.throwIfError(error);
    }

    public async getPreferences(userId: string): Promise<UserPreferences> {
        const { data, error } = await this.supabase.client
            .from('user_preferences')
            .select('active_program_id,completion_color')
            .eq('user_id', userId)
            .maybeSingle();

        this.throwIfError(error);
        return data ? {
            activeProgramId: data.active_program_id,
            completionColor: data.completion_color
        } : {};
    }

    public async savePreferences(userId: string, preferences: UserPreferences): Promise<void> {
        const { error } = await this.supabase.client
            .from('user_preferences')
            .upsert({
                user_id: userId,
                active_program_id: preferences.activeProgramId || null,
                completion_color: preferences.completionColor || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        this.throwIfError(error);
    }

    public async getProfile(userId: string): Promise<UserProfile> {
        const { data, error } = await this.supabase.client
            .from('profiles')
            .select('data')
            .eq('user_id', userId)
            .maybeSingle();

        this.throwIfError(error);
        return data ? data.data as UserProfile : undefined;
    }

    public async saveProfile(userId: string, profile: UserProfile): Promise<void> {
        const { error } = await this.supabase.client
            .from('profiles')
            .upsert({
                user_id: userId,
                display_name: profile.firstName || profile.username || null,
                updated_at: profile.updatedAt || new Date().toISOString(),
                data: profile
            }, {
                onConflict: 'user_id'
            });

        this.throwIfError(error);
    }

    private throwIfError(error: { message: string }): void {
        if (error) {
            throw new Error(error.message);
        }
    }
}
