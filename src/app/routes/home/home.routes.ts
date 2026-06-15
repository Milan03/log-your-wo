import { Routes } from '@angular/router';

import { SeoData } from '../../core/seo/seo.service';
import { HomeComponent } from './home/home.component';

const HOME_SEO: SeoData = {
    title: 'Free Workout Tracker, Log & Program Importer',
    description: 'Log Your Workout is a free workout tracker and gym log. Record strength and cardio '
        + 'sessions, import Excel workout programs, track week/day plans, export PDFs, and sync to the '
        + 'cloud — on mobile and desktop, with a free guest mode.',
    keywords: 'workout tracker, workout log, gym workout tracker, strength training log, workout journal, '
        + 'workout program tracker, excel workout importer, workout pdf export',
    path: '/'
};

export const HOME_ROUTES: Routes = [
    { path: '', component: HomeComponent, data: { seo: HOME_SEO } }
];
