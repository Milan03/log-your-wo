import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'formatDuration',
  standalone: false
})
export class FormatDurationPipe implements PipeTransform {
  transform(value: any): any {
    return moment.utc(value.asMilliseconds()).format("HH[h] mm[m] ss[s]");
  }
}
