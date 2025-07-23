import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 50, completeWords: boolean = false): string {
    if (!value) return '';

    if (value.length <= limit) return value;

    if (completeWords) {
      let lastSpace = value.lastIndexOf(' ', limit);
      return value.substring(0, lastSpace) + '...';
    }

    return value.substring(0, limit) + '...';
  }
}
