import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedService } from '../services/shared.service';

@Pipe({
    name: 'convertMeasureValue',
    pure: false
})
export class ConvertMeasureValuePipe implements PipeTransform {
    private latestMeasure: string;
    private subscription: Subscription;

    constructor(private _sharedService: SharedService, private ref: ChangeDetectorRef) {
        this.subscription = this._sharedService.measureToggleSource$.subscribe(value => {
            this.latestMeasure = value;
            this.ref.markForCheck(); // Notify Angular to re-evaluate this pipe
        });
    }

    transform(value: number, ...args: unknown[]): number {
        switch (this.latestMeasure) {
            case 'kgs':
                return Math.round(value / 2.205);  // Converting lbs to kgs
            case 'lbs':
                return Math.round(value * 2.205);  // Converting kgs to lbs
            case 'miles':
                return Math.round(value / 1.609);  // Converting kms to miles
            case 'kms':
                return Math.round(value * 1.609);  // Converting miles to kms
            default:
                return value; // Return the original value if no conditions match
        }
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
