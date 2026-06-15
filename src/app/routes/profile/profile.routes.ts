import { Routes } from '@angular/router';

import { SeoData } from '../../core/seo/seo.service';
import { ProfileComponent } from './profile.component';

const PROFILE_SEO: SeoData = {
    title: 'Your Profile',
    description: 'Manage your Log Your Workout profile and preferences.',
    path: '/profile',
    noindex: true
};

export const PROFILE_ROUTES: Routes = [
    { path: '', component: ProfileComponent, data: { seo: PROFILE_SEO } }
];
