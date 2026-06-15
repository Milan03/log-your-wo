import { Routes } from '@angular/router';

import { SeoData } from '../../core/seo/seo.service';
import { AuthComponent } from './auth.component';

const AUTH_SEO: SeoData = {
    title: 'Sign In or Register',
    description: 'Sign in or create a free Log Your Workout account to sync your workouts across devices.',
    path: '/auth',
    noindex: true
};

export const AUTH_ROUTES: Routes = [
    { path: '', component: AuthComponent, data: { seo: AUTH_SEO } },
    { path: 'callback', component: AuthComponent, data: { callback: true, seo: { ...AUTH_SEO, path: '/auth/callback' } } }
];
