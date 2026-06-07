import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseClientService {
    private static sharedClient: SupabaseClient;

    public readonly client: SupabaseClient;

    constructor() {
        if (!SupabaseClientService.sharedClient) {
            SupabaseClientService.sharedClient = createClient(
                environment.supabase.url,
                environment.supabase.publishableKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        persistSession: true,
                        flowType: 'pkce'
                    }
                }
            );
        }

        this.client = SupabaseClientService.sharedClient;
    }
}
