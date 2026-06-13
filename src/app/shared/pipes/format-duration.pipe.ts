import { Pipe, PipeTransform } from '@angular/core';
import { Duration } from 'luxon';

@Pipe({
  name: 'formatDuration',
  standalone: false
})
export class FormatDurationPipe implements PipeTransform {
  transform(value: Duration): string {
    return value.shiftTo('hours', 'minutes', 'seconds').toFormat("hh'h' mm'm' ss's'");
  }
}
