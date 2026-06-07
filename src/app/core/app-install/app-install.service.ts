import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, Subscription } from 'rxjs';

export type AppInstallDevice = 'android' | 'ios';

export interface AppInstallNotice {
    visible: boolean;
    device: AppInstallDevice | null;
}

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({
    providedIn: 'root'
})
export class AppInstallService implements OnDestroy {
    private readonly dismissedKey = 'logYourWo.installNoticeDismissed';
    private readonly visitCountKey = 'logYourWo.installNoticeVisits';
    private readonly visitRecordedKey = 'logYourWo.installNoticeVisitRecorded';
    private readonly noticeSource = new BehaviorSubject<AppInstallNotice>({
        visible: false,
        device: null
    });
    private readonly subscriptions = new Subscription();
    private readonly browserWindow: Window | null;
    private installPrompt: BeforeInstallPromptEvent | null = null;
    private eligible = false;

    public readonly notice$ = this.noticeSource.asObservable();

    constructor(@Inject(DOCUMENT) document: Document) {
        this.browserWindow = document.defaultView;
        if (!this.browserWindow) {
            return;
        }

        this.prepareNotice();
        this.subscriptions.add(
            fromEvent(this.browserWindow, 'beforeinstallprompt')
                .subscribe(event => this.captureInstallPrompt(event))
        );
        this.subscriptions.add(
            fromEvent(this.browserWindow, 'appinstalled')
                .subscribe(() => this.hideNotice())
        );
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public dismiss(): void {
        this.browserWindow?.localStorage.setItem(this.dismissedKey, 'true');
        this.hideNotice();
    }

    public async install(): Promise<void> {
        if (!this.installPrompt) {
            return;
        }

        const prompt = this.installPrompt;
        this.installPrompt = null;
        await prompt.prompt();
        await prompt.userChoice;
        this.hideNotice();
    }

    private prepareNotice(): void {
        if (this.isInstalled() || this.browserWindow.localStorage.getItem(this.dismissedKey) === 'true') {
            return;
        }

        this.eligible = this.recordVisit() >= 2;
        if (!this.eligible) {
            return;
        }

        if (this.isIos()) {
            this.noticeSource.next({ visible: true, device: 'ios' });
            return;
        }

        if (/Android/i.test(this.browserWindow.navigator.userAgent)) {
            this.noticeSource.next({ visible: false, device: 'android' });
        }
    }

    private captureInstallPrompt(event: Event): void {
        if (!this.eligible || this.noticeSource.value.device !== 'android') {
            return;
        }

        event.preventDefault();
        this.installPrompt = event as BeforeInstallPromptEvent;
        this.noticeSource.next({ visible: true, device: 'android' });
    }

    private recordVisit(): number {
        const localStorage = this.browserWindow.localStorage;
        const sessionStorage = this.browserWindow.sessionStorage;
        let visits = Number(localStorage.getItem(this.visitCountKey)) || 0;

        if (sessionStorage.getItem(this.visitRecordedKey) !== 'true') {
            visits++;
            localStorage.setItem(this.visitCountKey, visits.toString());
            sessionStorage.setItem(this.visitRecordedKey, 'true');
        }

        return visits;
    }

    private isInstalled(): boolean {
        const navigator = this.browserWindow.navigator as Navigator & { standalone?: boolean };
        return this.browserWindow.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    }

    private isIos(): boolean {
        const navigator = this.browserWindow.navigator;
        const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return isAppleMobile || isTouchMac;
    }

    private hideNotice(): void {
        this.installPrompt = null;
        this.noticeSource.next({
            visible: false,
            device: this.noticeSource.value.device
        });
    }
}
