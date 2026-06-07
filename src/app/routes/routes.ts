import { Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { AuthGuard } from '../core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
            { path: 'log-entry', loadChildren: () => import('./log-entry/log-entry.module').then(m => m.LogEntryModule) },
            { path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule) }
        ]
    },

    // Not found
    { path: '**', redirectTo: 'home' }

];
