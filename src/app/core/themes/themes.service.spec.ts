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

    expect(service.isDarkMode()).toBeTrue();
    expect(localStorage.getItem('logYourWo.darkMode')).toBe('true');
    expect(document.documentElement.classList.contains('app-dark-mode')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');

    service.toggleDarkMode();

    expect(service.isDarkMode()).toBeFalse();
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

    expect(service.isDarkMode()).toBeTrue();
    expect(document.documentElement.classList.contains('app-dark-mode')).toBeTrue();
  });
});
