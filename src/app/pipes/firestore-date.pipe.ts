import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'firestoreDate'
})
export class FirestoreDatePipe implements PipeTransform {
  
  transform(value: any, format: string = 'dd/MM/yyyy'): string {
    if (!value) return '';
    
    try {
      let date: Date;
      
      if (value && typeof value === 'object' && 'seconds' in value) {
        date = new Date(value.seconds * 1000);
      }
      else if (value && typeof value.toDate === 'function') {
        date = value.toDate();
      }
      else if (value instanceof Date) {
        date = value;
      }
      else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
      }
      else {
        return 'Fecha inválida';
      }
      
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return this.formatDate(date, format);
      
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error fecha';
    }
  }
  
  private formatDate(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    switch(format) {
      case 'dd/MM/yyyy':
        return `${day}/${month}/${year}`;
      case 'dd/MM/yyyy HH:mm':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case 'HH:mm':
        return `${hours}:${minutes}`;
      case 'full':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }
}