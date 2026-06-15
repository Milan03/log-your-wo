import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
    public readonly contactEmail = 'milansobat03@gmail.com';
}
