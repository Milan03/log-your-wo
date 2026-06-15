import { TestBed } from '@angular/core/testing';

import { CloudSyncStatusService } from './cloud-sync-status.service';

describe('CloudSyncStatusService', () => {
    let service: CloudSyncStatusService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CloudSyncStatusService);
    });

    it('publishes and clears the current synchronization error', () => {
        service.report('Offline');

        expect(service.error()).toBe('Offline');

        service.clear();

        expect(service.error()).toBe('');
    });
});
