import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { FEATURE_CONTENT, FeatureContent } from './feature-content';

@Component({
    selector: 'app-feature-page',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './feature-page.component.html',
    styleUrls: ['./feature-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturePageComponent implements OnInit {
    public content: FeatureContent;

    private route = inject(ActivatedRoute);

    ngOnInit(): void {
        const key = this.route.snapshot.data['featureKey'] as string;
        this.content = FEATURE_CONTENT[key];
    }
}
