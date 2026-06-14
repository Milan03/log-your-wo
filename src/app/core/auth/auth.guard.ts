import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const userData = inject(UserDataSyncService);

    const session = await auth.getSession();
    await userData.initialize(session ? session.user.id : undefined);
    return true;
};
