/*!
 *
 * Log Your Workout
 *
 * Version: 1.0.0
 * Author: Milan Sobat
 * Website: https://logyourworkout.app
 * License: https://wrapbootstrap.com/help/licenses
 *
 */

import './vendor';
import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
} else if ('serviceWorker' in navigator) {
    // A production worker previously registered on localhost can serve stale
    // development chunks even though registration is disabled in dev mode.
    navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
        .then(() => 'caches' in window ? caches.keys() : [])
        .then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.delete(cacheName))))
        .catch(() => undefined);
}

let p = platformBrowserDynamic().bootstrapModule(AppModule, {
    applicationProviders: [
        provideZoneChangeDetection()
    ]
});
p.then(() => { (<any>window).appBootstrap && (<any>window).appBootstrap(); })
// .catch(err => console.error(err));
