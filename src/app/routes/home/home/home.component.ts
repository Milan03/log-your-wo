import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { WorkoutHeaderService } from '../../../shared/services/workout-header.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterModule, TranslateModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
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

    private _router = inject(Router);
    private _workoutHeader = inject(WorkoutHeaderService);

    public ngOnInit(): void {
        this._workoutHeader.setLogType(undefined);
    }

    public navigateToSimpleLogEntry(): void {
        this._router.navigate(['/log-entry/simple-log']);
    }

    public navigateToImportProgram(): void {
        this._router.navigate(['/log-entry/import-program']);
    }
}
