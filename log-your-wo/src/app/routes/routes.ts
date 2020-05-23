import { Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';

export const routes: Routes = [

    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
            { path: 'log-entry', loadChildren: () => import('./log-entry/log-entry.module').then(m => m.LogEntryModule) },
            { path: 'material', loadChildren: () => import('./material/material.module').then(m => m.MaterialModule) }
        ]
    },

    // Not found
    { path: '**', redirectTo: 'home' }

];
