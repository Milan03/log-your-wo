import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { AuthService } from './auth.service';

/**
 * Ensures the signed-in (or guest) user's data is initialized before the
 * shell route activates. This is a data bootstrap rather than an access gate:
 * the app is intentionally usable as a guest, so it never blocks navigation.
 */
export const userDataResolver: ResolveFn<void> = async () => {
    const auth = inject(AuthService);
    const userData = inject(UserDataSyncService);

    const session = await auth.getSession();
    await userData.initialize(session ? session.user.id : undefined);
};
