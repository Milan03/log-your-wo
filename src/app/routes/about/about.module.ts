import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { AboutComponent } from './about.component';
import { SeoData } from '../../core/seo/seo.service';

const ABOUT_SEO: SeoData = {
    title: 'About & Contact',
    description: 'Log Your Workout is in active development. Report a bug, an error, or an Excel workout '
        + 'program that will not import by emailing the developer.',
    keywords: 'log your workout about, contact, report a bug, excel import help',
    path: '/about'
};

const routes: Routes = [
    { path: '', component: AboutComponent, data: { seo: ABOUT_SEO } }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [AboutComponent],
    exports: [RouterModule]
})
export class AboutModule { }
