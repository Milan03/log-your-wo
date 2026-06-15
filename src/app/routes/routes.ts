import { Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { authGuard } from '../core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadChildren: () => import('./home/home.routes').then(m => m.HOME_ROUTES) },
            { path: 'features', loadChildren: () => import('./features/features.routes').then(m => m.FEATURE_ROUTES) },
            { path: 'about', loadChildren: () => import('./about/about.routes').then(m => m.ABOUT_ROUTES) },
            { path: 'log-entry', loadChildren: () => import('./log-entry/log-entry.module').then(m => m.LogEntryModule) },
            { path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule) }
        ]
    },

    // Not found
    { path: '**', redirectTo: 'home' }

];
