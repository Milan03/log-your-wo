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
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

let p = platformBrowserDynamic().bootstrapModule(AppModule);
p.then(() => { (<any>window).appBootstrap && (<any>window).appBootstrap(); })
// .catch(err => console.error(err));
