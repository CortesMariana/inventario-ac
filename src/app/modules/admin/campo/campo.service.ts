import { Injectable } from '@angular/core';
import { collection, Firestore, getDocs, query, orderBy } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { Observable, from, map } from 'rxjs';
import { Recorrido } from './models/recorrido.model';

@Injectable({
  providedIn: 'root'
})
export class CampoService {

  constructor(private firestore: Firestore) { }

  async getAllRecorridos(): Promise<Recorrido[]> {
    try {
        const collectionRef = collection(this.firestore, `${environment.collections.recorridos}`);
        const q = query(collectionRef, orderBy('fechaInicio', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const data: Recorrido[] = [];
        querySnapshot.forEach((doc) => {
        const recorridoData = doc.data() as any;
      
        const fechaInicio = this.getFecha(recorridoData.fechaInicio);
        const fechaFin = this.getFecha(recorridoData.fechaFin);
        
        const puntos = (recorridoData.puntos || []).map((punto: any) => ({
            latitud: punto?.latitud || 0,
            longitud: punto?.longitud || 0,
            timestamp: this.getFecha(punto?.timestamp),
            precision: punto?.precision || null,
            velocidad: punto?.velocidad || null
        }));
        
        const contratiempos = (recorridoData.contratiempos || []).map((ct: any) => ({
            tipo: ct?.tipo || '',
            descripcion: ct?.descripcion || '',
            timestamp: this.getFecha(ct?.timestamp),
            duracion: ct?.duracion || 0
        }));
        
        data.push({ 
            id: doc.id,
            usuarioId: recorridoData.usuarioId || '',
            usuarioNombre: recorridoData.usuarioNombre || 'Usuario Desconocido',
            estado: recorridoData.estado || 'Desconocido',
            distancia: recorridoData.distancia || 0,
            duracionSegundos: recorridoData.duracionSegundos || 0,
            fechaInicio,
            fechaFin,
            puntos,
            contratiempos
        });
        });
        
        return data;
    } catch (error) {
        console.error('Error en getAllRecorridos:', error);
        throw error;
    }
  }

  private getFecha(fecha: any): Date {
    if (!fecha) return new Date();
    
    try {
        if (fecha.toDate) {
        return fecha.toDate();
        } else if (fecha instanceof Date) {
        return fecha;
        } else if (typeof fecha === 'string') {
        return new Date(fecha);
        } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000);
        }
        return new Date();
    } catch (error) {
        console.error('Error al convertir fecha:', error);
        return new Date();
    }
  }

  async getRecorridosPorUsuario(usuarioId: string): Promise<Recorrido[]> {
    const todosRecorridos = await this.getAllRecorridos();
    return todosRecorridos.filter(recorrido => recorrido.usuarioId === usuarioId);
  }

  async getEstadisticasRecorridos(): Promise<any> {
    try {
      const recorridos = await this.getAllRecorridos();
      
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const recorridosMes = recorridos.filter(r => r.fechaInicio >= inicioMes);
      
      const estadisticas = {
        total: recorridos.length,
        esteMes: recorridosMes.length,
        enCurso: recorridos.filter(r => r.estado === 'en curso').length,
        finalizados: recorridos.filter(r => r.estado === 'finalizado').length,
        totalDistancia: recorridos.reduce((sum, r) => sum + (r.distancia || 0), 0),
        totalTiempo: recorridos.reduce((sum, r) => sum + (r.duracionSegundos || 0), 0),
        porUsuario: this.calcularEstadisticasPorUsuario(recorridos),
        tendenciaSemanal: this.calcularTendenciaSemanal(recorridos)
      };
      
      return estadisticas;
    } catch (error) {
      console.error('Error en getEstadisticasRecorridos:', error);
      throw error;
    }
  }

  private calcularEstadisticasPorUsuario(recorridos: Recorrido[]): any[] {
    const porUsuario: { [key: string]: any } = {};
    
    recorridos.forEach(recorrido => {
      const usuarioId = recorrido.usuarioId;
      
      if (!porUsuario[usuarioId]) {
        porUsuario[usuarioId] = {
          usuarioId,
          usuarioNombre: recorrido.usuarioNombre,
          totalRecorridos: 0,
          totalDistancia: 0,
          totalTiempo: 0,
          recorridosFinalizados: 0
        };
      }
      
      porUsuario[usuarioId].totalRecorridos++;
      porUsuario[usuarioId].totalDistancia += recorrido.distancia || 0;
      porUsuario[usuarioId].totalTiempo += recorrido.duracionSegundos || 0;
      
      if (recorrido.estado === 'finalizado') {
        porUsuario[usuarioId].recorridosFinalizados++;
      }
    });
    
    return Object.values(porUsuario).sort((a, b) => b.totalRecorridos - a.totalRecorridos);
  }

  private calcularTendenciaSemanal(recorridos: Recorrido[]): any[] {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const tendencia: { [key: string]: { recorridos: number, distancia: number } } = {};
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(0, 0, 0, 0);
      
      const key = `${diasSemana[fecha.getDay()]} ${fecha.getDate()}`;
      tendencia[key] = { recorridos: 0, distancia: 0 };
    }
    
    recorridos.forEach(recorrido => {
      const fechaRecorrido = recorrido.fechaInicio;
      fechaRecorrido.setHours(0, 0, 0, 0);
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const diffDias = Math.floor((hoy.getTime() - fechaRecorrido.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDias >= 0 && diffDias <= 6) {
        const key = `${diasSemana[fechaRecorrido.getDay()]} ${fechaRecorrido.getDate()}`;
        
        if (tendencia[key]) {
          tendencia[key].recorridos++;
          tendencia[key].distancia += recorrido.distancia || 0;
        }
      }
    });
    
    return Object.entries(tendencia).map(([dia, datos]) => ({
      dia,
      recorridos: datos.recorridos,
      distancia: datos.distancia
    }));
  }

  formatDuracion(segundos: number): string {
    if (!segundos) return '0 min';
    
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    
    return `${minutos} min`;
  }

  formatDistancia(metros: number): string {
    if (!metros) return '0 Km';
    
    if (metros < 1000) {
      return `${Math.round(metros)} Km`;
    }
    
    return `${(metros / 1000).toFixed(2)} km`;
  }

  formatFecha(fecha: Date): string {
    if (!fecha) return 'Sin fecha';
    
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatHora(fecha: Date): string {
    if (!fecha) return 'Sin hora';
    
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}