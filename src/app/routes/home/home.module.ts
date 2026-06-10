import { NgModule } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { Routes, RouterModule } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { SeoData } from '../../core/seo/seo.service';

const HOME_SEO: SeoData = {
    title: 'Free Workout Tracker, Log & Program Importer',
    description: 'Log Your Workout is a free workout tracker and gym log. Record strength and cardio '
        + 'sessions, import Excel workout programs, track week/day plans, export PDFs, and sync to the '
        + 'cloud — on mobile and desktop, with a free guest mode.',
    keywords: 'workout tracker, workout log, gym workout tracker, strength training log, workout journal, '
        + 'workout program tracker, excel workout importer, workout pdf export',
    path: '/'
};

const routes: Routes = [
    { path: '', component: HomeComponent, data: { seo: HOME_SEO } },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [HomeComponent],
    exports: [
        RouterModule
    ]
})
export class HomeModule { }