import { AppInstallService } from './app-install.service';

describe('AppInstallService', () => {
    let service: AppInstallService;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        spyOn(window, 'matchMedia').and.returnValue({
            matches: false
        } as MediaQueryList);
    });

    afterEach(() => {
        service?.ngOnDestroy();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('shows iOS instructions starting on the second visit', () => {
        localStorage.setItem('logYourWo.installNoticeVisits', '1');
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone)');

        createService();

        expect(service.notice()).toEqual({ visible: true, device: 'ios' });
    });

    it('captures and runs the Android install prompt', async () => {
        localStorage.setItem('logYourWo.installNoticeVisits', '1');
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (Linux; Android 15)');
        const prompt = jasmine.createSpy('prompt').and.resolveTo();
        const installEvent = new Event('beforeinstallprompt', { cancelable: true });
        Object.defineProperties(installEvent, {
            prompt: { value: prompt },
            userChoice: { value: Promise.resolve({ outcome: 'accepted', platform: 'web' }) }
        });

        createService();
        window.dispatchEvent(installEvent);

        expect(service.notice()).toEqual({ visible: true, device: 'android' });
        expect(installEvent.defaultPrevented).toBeTrue();

        await service.install();

        expect(prompt).toHaveBeenCalled();
        expect(service.notice()).toEqual({ visible: false, device: 'android' });
    });

    it('remembers when the notice is dismissed', () => {
        localStorage.setItem('logYourWo.installNoticeVisits', '1');
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone)');
        createService();

        service.dismiss();

        expect(localStorage.getItem('logYourWo.installNoticeDismissed')).toBe('true');
        expect(service.notice().visible).toBeFalse();
    });

    it('does not offer installation when running as an installed app', () => {
        (window.matchMedia as jasmine.Spy).and.returnValue({
            matches: true
        } as MediaQueryList);
        localStorage.setItem('logYourWo.installNoticeVisits', '1');
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone)');

        createService();

        expect(service.notice()).toEqual({ visible: false, device: null });
    });

    function createService(): void {
        service = new AppInstallService(document);
    }
});
