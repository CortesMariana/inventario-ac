import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat'
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currencySymbol: string = '$'): string {
    if (value === null || value === undefined || value === '') {
      return 'Sin precio';
    }

    let numericValue: number;
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/[^0-9.-]/g, '');
      numericValue = parseFloat(cleanedValue);
    } else {
      numericValue = value;
    }

    if (isNaN(numericValue)) {
      return 'Precio inválido';
    }

    const formattedValue = numericValue.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${currencySymbol} ${formattedValue}`;
  }
}