import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Describes the SEO metadata for a single public route. Attach this to a route
 * via its `data.seo` property and the {@link SeoService} applies it on
 * navigation. Keeping the shape small makes new pages easy to maintain.
 */
export interface SeoData {
    /** Full <title>. Brand suffix is added automatically unless `rawTitle` is set. */
    title: string;
    /** Meta description (~150-160 chars reads best in search results). */
    description: string;
    /** Absolute path for the canonical URL, e.g. '/features/workout-tracker'. */
    path: string;
    /** Optional comma-separated keywords for this page. */
    keywords?: string;
    /** Absolute or site-relative OG/Twitter image. Falls back to the app logo. */
    image?: string;
    /** When true, the page is excluded from search indexes (e.g. auth pages). */
    noindex?: boolean;
    /** Optional JSON-LD structured data injected for this page only. */
    jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
    /** Use `title` verbatim without appending the brand suffix. */
    rawTitle?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
    private static readonly BASE_URL = 'https://logyourworkout.app';
    private static readonly BRAND = 'Log Your Workout';
    private static readonly DEFAULT_IMAGE = '/assets/img/log-your-wo-logo-single.png';
    private static readonly JSON_LD_ID = 'seo-page-jsonld';

    constructor(
        private readonly title: Title,
        private readonly meta: Meta,
        @Inject(DOCUMENT) private readonly document: Document
    ) { }

    /** Apply a full set of metadata for the current page. */
    public update(data: SeoData): void {
        const pageTitle = data.rawTitle ? data.title : `${data.title} | ${SeoService.BRAND}`;
        const url = this.absolute(data.path);
        const image = this.absolute(data.image || SeoService.DEFAULT_IMAGE);

        this.title.setTitle(pageTitle);
        this.setName('description', data.description);
        this.setName('robots', data.noindex ? 'noindex, nofollow' : 'index, follow');

        if (data.keywords) {
            this.setName('keywords', data.keywords);
        }

        // Open Graph
        this.setProperty('og:title', pageTitle);
        this.setProperty('og:description', data.description);
        this.setProperty('og:url', url);
        this.setProperty('og:image', image);
        this.setProperty('og:type', 'website');
        this.setProperty('og:site_name', SeoService.BRAND);

        // Twitter / X
        this.setName('twitter:card', 'summary_large_image');
        this.setName('twitter:title', pageTitle);
        this.setName('twitter:description', data.description);
        this.setName('twitter:image', image);

        this.setCanonical(data.noindex ? null : url);
        this.setJsonLd(data.jsonLd);
    }

    private absolute(path: string): string {
        if (!path) {
            return SeoService.BASE_URL + '/';
        }
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        return SeoService.BASE_URL + (path.startsWith('/') ? path : `/${path}`);
    }

    private setName(name: string, content: string): void {
        this.meta.updateTag({ name, content });
    }

    private setProperty(property: string, content: string): void {
        this.meta.updateTag({ property, content });
    }

    private setCanonical(url: string | null): void {
        const head = this.document.head;
        let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

        if (!url) {
            if (link) {
                head.removeChild(link);
            }
            return;
        }

        if (!link) {
            link = this.document.createElement('link');
            link.setAttribute('rel', 'canonical');
            head.appendChild(link);
        }
        link.setAttribute('href', url);
    }

    private setJsonLd(data: SeoData['jsonLd']): void {
        const head = this.document.head;
        const existing = this.document.getElementById(SeoService.JSON_LD_ID);
        if (existing) {
            head.removeChild(existing);
        }
        if (!data) {
            return;
        }

        const script = this.document.createElement('script');
        script.id = SeoService.JSON_LD_ID;
        script.type = 'application/ld+json';
        script.text = JSON.stringify(data);
        head.appendChild(script);
    }
}
