/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { ThemesService } from './themes.service';

describe('Service: Themes', () => {
  beforeEach(() => {
    localStorage.removeItem('logYourWo.darkMode');
    document.documentElement.classList.remove('app-dark-mode');
    document.documentElement.style.colorScheme = '';

    TestBed.configureTestingModule({
      providers: [ThemesService]
    });
  });

  afterEach(() => {
    localStorage.removeItem('logYourWo.darkMode');
    document.documentElement.classList.remove('app-dark-mode');
    document.documentElement.style.colorScheme = '';
  });

  it('should create the service', inject([ThemesService], (service: ThemesService) => {
    expect(service).toBeTruthy();
  }));

  it('applies and persists dark mode', inject([ThemesService], (service: ThemesService) => {
    service.setDarkMode(true);

    expect(service.darkMode()).toBeTrue();
    expect(localStorage.getItem('logYourWo.darkMode')).toBe('true');
    expect(document.documentElement.classList.contains('app-dark-mode')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');

    service.toggleDarkMode();

    expect(service.darkMode()).toBeFalse();
    expect(localStorage.getItem('logYourWo.darkMode')).toBe('false');
    expect(document.documentElement.classList.contains('app-dark-mode')).toBeFalse();
  }));

  it('restores the saved preference when it is created', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('logYourWo.darkMode', 'true');
    TestBed.configureTestingModule({
      providers: [ThemesService]
    });

    const service = TestBed.inject(ThemesService);

    expect(service.darkMode()).toBeTrue();
    expect(document.documentElement.classList.contains('app-dark-mode')).toBeTrue();
  });

  it('exposes dark mode as readonly signal state', inject([ThemesService], (service: ThemesService) => {
    expect(service.darkMode()).toBeFalse();
    service.setDarkMode(true);
    service.setDarkMode(true);
    expect(service.darkMode()).toBeTrue();

    service.toggleDarkMode();

    expect(service.darkMode()).toBeFalse();
  }));
});
