import { Injectable } from '@angular/core';

interface UserSettings {
    name: string;
    job: string;
    picture: string;
}

interface AppSettings {
    name: string;
    description: string;
    year: number;
}

interface LayoutSettings {
    isFixed: boolean;
    isCollapsed: boolean;
    isBoxed: boolean;
    isRTL: boolean;
    horizontal: boolean;
    isFloat: boolean;
    asideHover: boolean;
    theme: string | null;
    asideScrollbar: boolean;
    isCollapsedText: boolean;
    useFullLayout: boolean;
    hiddenFooter: boolean;
    offsidebarOpen: boolean;
    asideToggled: boolean;
    viewAnimation: string;
}

type BooleanLayoutSetting = {
    [Key in keyof LayoutSettings]: LayoutSettings[Key] extends boolean ? Key : never
}[keyof LayoutSettings];

@Injectable()
export class SettingsService {
    private readonly user: UserSettings = {
        name: 'John',
        job: 'ng-developer',
        picture: 'assets/img/user/02.jpg'
    };

    private readonly app: AppSettings = {
        name: 'Log Your Workout',
        description: 'Angular Bootstrap Admin Template',
        year: new Date().getFullYear()
    };

    private readonly layout: LayoutSettings = {
        isFixed: true,
        isCollapsed: false,
        isBoxed: false,
        isRTL: false,
        horizontal: false,
        isFloat: false,
        asideHover: false,
        theme: null,
        asideScrollbar: false,
        isCollapsedText: false,
        useFullLayout: false,
        hiddenFooter: false,
        offsidebarOpen: false,
        asideToggled: false,
        viewAnimation: 'ng-fadeInUp'
    };

    public getAppSetting<Key extends keyof AppSettings>(name: Key): AppSettings[Key] {
        return this.app[name];
    }

    public getUserSetting<Key extends keyof UserSettings>(name: Key): UserSettings[Key] {
        return this.user[name];
    }

    public getLayoutSetting<Key extends keyof LayoutSettings>(name: Key): LayoutSettings[Key] {
        return this.layout[name];
    }

    public setAppSetting<Key extends keyof AppSettings>(name: Key, value: AppSettings[Key]): void {
        this.app[name] = value;
    }

    public setUserSetting<Key extends keyof UserSettings>(name: Key, value: UserSettings[Key]): void {
        this.user[name] = value;
    }

    public setLayoutSetting<Key extends keyof LayoutSettings>(name: Key, value: LayoutSettings[Key]): LayoutSettings[Key] {
        this.layout[name] = value;
        return value;
    }

    public toggleLayoutSetting(name: BooleanLayoutSetting): boolean {
        return this.setLayoutSetting(name, !this.getLayoutSetting(name));
    }
}
