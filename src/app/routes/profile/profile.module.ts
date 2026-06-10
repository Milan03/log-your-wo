import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { ProfileComponent } from './profile.component';
import { SeoData } from '../../core/seo/seo.service';

const PROFILE_SEO: SeoData = {
    title: 'Your Profile',
    description: 'Manage your Log Your Workout profile and preferences.',
    path: '/profile',
    noindex: true
};

const routes: Routes = [
    { path: '', component: ProfileComponent, data: { seo: PROFILE_SEO } }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [ProfileComponent]
})
export class ProfileModule { }
