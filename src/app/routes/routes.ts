import { Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';

export const routes: Routes = [

    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'log-entry/simple-log', pathMatch: 'full' },
            /*{ path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },*/
            { path: 'log-entry', loadChildren: () => import('./log-entry/log-entry.module').then(m => m.LogEntryModule) }
        ]
    },

    // Not found
    { path: '**', redirectTo: 'log-entry/simple-log' }

];
