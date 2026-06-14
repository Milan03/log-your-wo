import { Injectable } from '@angular/core';

export interface MenuItem {
    text: string;
    heading?: boolean;
    link?: string;
    elink?: string;
    target?: string;
    icon?: string;
    alert?: string;
    label?: string;
    translate?: string;
    submenu?: MenuItem[];
}

@Injectable()
export class MenuService {
    private readonly menuItems: MenuItem[] = [];

    public addMenu(items: MenuItem[]): void {
        this.menuItems.push(...items);
    }

    public getMenu(): MenuItem[] {
        return this.menuItems;
    }
}
