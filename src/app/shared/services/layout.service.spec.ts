import { TestBed } from '@angular/core/testing';

import { LayoutService } from './layout.service';

describe('LayoutService', () => {
    let service: LayoutService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LayoutService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('broadcasts the sidebar collapsed state', () => {
        let received: boolean | undefined;
        service.sidebarCollapsed$.subscribe(collapsed => received = collapsed);

        service.setSidebarCollapsed(true);

        expect(received).toBeTrue();
    });
});
