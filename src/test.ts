// This file is required by karma.conf.js and loads recursively all the .spec and framework files
// The app runs zoneless; the test target loads zone.js + zone.js/testing via its
// `polyfills` array (before Jasmine) so the zone-based TestBed keeps working.

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: true },
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
}
);
