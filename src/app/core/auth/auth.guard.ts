import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';

import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private auth: AuthService,
        private userData: UserDataSyncService
    ) { }

    public async canActivate(
        _route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Promise<boolean> {
        const session = await this.auth.getSession();
        await this.userData.initialize(session ? session.user.id : undefined);
        return true;
    }
}
