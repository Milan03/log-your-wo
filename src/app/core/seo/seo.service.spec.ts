import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { SeoService } from './seo.service';

describe('SeoService', () => {
    let service: SeoService;
    let meta: Meta;
    let title: Title;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SeoService, Meta, Title]
        });
        service = TestBed.inject(SeoService);
        meta = TestBed.inject(Meta);
        title = TestBed.inject(Title);
    });

    afterEach(() => {
        document.querySelectorAll('link[rel="canonical"], #seo-page-jsonld').forEach(node => node.remove());
    });

    it('sets the title with the brand suffix', () => {
        service.update({ title: 'Workout Tracker', description: 'desc', path: '/features/workout-tracker' });
        expect(title.getTitle()).toBe('Workout Tracker | Log Your Workout');
    });

    it('keeps the raw title when rawTitle is set', () => {
        service.update({ title: 'Exact Title', description: 'desc', path: '/', rawTitle: true });
        expect(title.getTitle()).toBe('Exact Title');
    });

    it('writes description, Open Graph and Twitter tags', () => {
        service.update({ title: 'T', description: 'A clear description', path: '/page' });
        expect(meta.getTag('name="description"')?.content).toBe('A clear description');
        expect(meta.getTag('property="og:description"')?.content).toBe('A clear description');
        expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
        expect(meta.getTag('property="og:url"')?.content).toBe('https://logyourworkout.app/page');
    });

    it('adds an indexable canonical link by default', () => {
        service.update({ title: 'T', description: 'd', path: '/page' });
        const canonical = document.head.querySelector('link[rel="canonical"]');
        expect(canonical?.getAttribute('href')).toBe('https://logyourworkout.app/page');
        expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
    });

    it('marks pages noindex and drops the canonical link', () => {
        service.update({ title: 'T', description: 'd', path: '/auth', noindex: true });
        expect(meta.getTag('name="robots"')?.content).toBe('noindex, nofollow');
        expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    });

    it('injects page-specific JSON-LD and replaces it on the next update', () => {
        service.update({ title: 'T', description: 'd', path: '/a', jsonLd: { '@type': 'WebPage', name: 'A' } });
        let script = document.getElementById('seo-page-jsonld');
        expect(script).not.toBeNull();
        expect(script!.textContent).toContain('"name":"A"');

        service.update({ title: 'T', description: 'd', path: '/b' });
        script = document.getElementById('seo-page-jsonld');
        expect(script).toBeNull();
    });
});
