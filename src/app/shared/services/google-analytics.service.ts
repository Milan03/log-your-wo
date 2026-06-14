import { Injectable } from '@angular/core';

type GoogleAnalyticsCommand = 'config' | 'event';
type GoogleAnalyticsParameters = Record<string, string | number | null>;
type GoogleAnalyticsFunction = (
    command: GoogleAnalyticsCommand,
    target: string,
    parameters: GoogleAnalyticsParameters
) => void;

declare const gtag: GoogleAnalyticsFunction;

@Injectable({
    providedIn: 'root'
})
export class GoogleAnalyticsService {

    public pageView(path: string): void {
        gtag('config', 'UA-100428382-2', { page_path: path });
    }

    public eventEmitter(
        eventName: string,
        eventCategory: string,
        eventAction: string,
        eventLabel: string = null,
        eventValue: number = null
    ): void {
        gtag('event', eventName, {
            eventCategory,
            eventLabel,
            eventAction,
            eventValue
        });
    }
}
