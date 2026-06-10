import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from '../../../shared/services/shared.service';

@Component({
    selector: 'app-home',
    standalone: false,
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

    public readonly features = [
        {
            link: '/features/workout-tracker',
            icon: 'fas fa-dumbbell',
            titleKey: 'home.FeatureTrackerTitle',
            descKey: 'home.FeatureTrackerDesc'
        },
        {
            link: '/features/excel-workout-import',
            icon: 'fas fa-file-excel',
            titleKey: 'home.FeatureImportTitle',
            descKey: 'home.FeatureImportDesc'
        },
        {
            link: '/features/workout-pdf-export',
            icon: 'fas fa-file-pdf',
            titleKey: 'home.FeaturePdfTitle',
            descKey: 'home.FeaturePdfDesc'
        },
        {
            link: '/features/strength-training-log',
            icon: 'fas fa-clipboard-list',
            titleKey: 'home.FeatureStrengthTitle',
            descKey: 'home.FeatureStrengthDesc'
        },
        {
            link: '/features/workout-history-progress',
            icon: 'fas fa-chart-line',
            titleKey: 'home.FeatureHistoryTitle',
            descKey: 'home.FeatureHistoryDesc'
        }
    ];

    constructor(
        private _router: Router,
        private _sharedService: SharedService
    ) { }

    ngOnInit() {
        this._sharedService.emitLogType(undefined);
    }

    public navigateToSimpleLogEntry(): void {
        this._router.navigate(['/log-entry/simple-log']);
    }

    public navigateToImportProgram(): void {
        this._router.navigate(['/log-entry/import-program']);
    }
}
