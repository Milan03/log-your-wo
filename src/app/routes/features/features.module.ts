import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { FeaturePageComponent } from './feature-page.component';
import { FEATURE_CONTENT } from './feature-content';

// SEO data lives next to the page content so a new feature page only needs an
// entry in feature-content.ts and a route here (plus a sitemap.xml line).
const routes: Routes = [
    {
        path: 'workout-tracker',
        component: FeaturePageComponent,
        data: { featureKey: 'workout-tracker', seo: FEATURE_CONTENT['workout-tracker'].seo }
    },
    {
        path: 'excel-workout-import',
        component: FeaturePageComponent,
        data: { featureKey: 'excel-workout-import', seo: FEATURE_CONTENT['excel-workout-import'].seo }
    },
    {
        path: 'workout-pdf-export',
        component: FeaturePageComponent,
        data: { featureKey: 'workout-pdf-export', seo: FEATURE_CONTENT['workout-pdf-export'].seo }
    },
    {
        path: 'strength-training-log',
        component: FeaturePageComponent,
        data: { featureKey: 'strength-training-log', seo: FEATURE_CONTENT['strength-training-log'].seo }
    },
    {
        path: 'workout-history-progress',
        component: FeaturePageComponent,
        data: { featureKey: 'workout-history-progress', seo: FEATURE_CONTENT['workout-history-progress'].seo }
    },
    { path: '', redirectTo: 'workout-tracker', pathMatch: 'full' }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [FeaturePageComponent],
    exports: [RouterModule]
})
export class FeaturesModule { }
