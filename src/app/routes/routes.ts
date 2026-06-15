import { Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { userDataResolver } from '../core/auth/user-data.resolver';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: '',
        component: LayoutComponent,
        resolve: { userData: userDataResolver },
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadChildren: () => import('./home/home.routes').then(m => m.HOME_ROUTES) },
            { path: 'features', loadChildren: () => import('./features/features.routes').then(m => m.FEATURE_ROUTES) },
            { path: 'about', loadChildren: () => import('./about/about.routes').then(m => m.ABOUT_ROUTES) },
            { path: 'log-entry', loadChildren: () => import('./log-entry/log-entry.routes').then(m => m.LOG_ENTRY_ROUTES) },
            { path: 'profile', loadChildren: () => import('./profile/profile.routes').then(m => m.PROFILE_ROUTES) }
        ]
    },

    // Not found
    { path: '**', redirectTo: 'home' }

];
