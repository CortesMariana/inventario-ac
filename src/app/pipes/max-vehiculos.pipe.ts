import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'maxVehiculos'
})
export class MaxVehiculosPipe implements PipeTransform {
  transform(colaboradores: any[]): any {
    if (!colaboradores || colaboradores.length === 0) {
      return null;
    }
    return colaboradores.reduce((max, current) => {
      return (current.totalVehiculos > max.totalVehiculos) ? current : max;
    }, colaboradores[0]);
  }
}