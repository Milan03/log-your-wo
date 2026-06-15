import { Routes } from '@angular/router';

import { SeoData } from '../../core/seo/seo.service';
import { AboutComponent } from './about.component';

const ABOUT_SEO: SeoData = {
    title: 'About & Contact',
    description: 'Log Your Workout is in active development. Report a bug, an error, or an Excel workout '
        + 'program that will not import by emailing the developer.',
    keywords: 'log your workout about, contact, report a bug, excel import help',
    path: '/about'
};

export const ABOUT_ROUTES: Routes = [
    { path: '', component: AboutComponent, data: { seo: ABOUT_SEO } }
];
