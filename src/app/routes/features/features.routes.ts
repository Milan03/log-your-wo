import { Routes } from '@angular/router';

import { FEATURE_CONTENT } from './feature-content';
import { FeaturePageComponent } from './feature-page.component';

export const FEATURE_ROUTES: Routes = [
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
