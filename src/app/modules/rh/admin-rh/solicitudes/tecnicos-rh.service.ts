import { Injectable } from '@angular/core';
import { collection, Firestore, getDocs, query, where } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

export interface TecnicoRH {
  id: string;
  empleadoId: string;
  nombre: string;
  email?: string;
  activo: boolean;
  tipo: 'tecnico-rh';
  fechaRegistro: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TecnicosRhService {

  constructor(private firestore: Firestore) {}

  async getTecnicos(): Promise<TecnicoRH[]> {
    try {
      const permisosRef = collection(this.firestore, environment.collections.permisos_rh);
      const querySnapshot = await getDocs(permisosRef);
      
      const tecnicos: TecnicoRH[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        
        const tecnicosArray = data['idsAutorizadosTec'] || data['idsAutorizadosRh'] || [];
        
        tecnicosArray.forEach((tecnico: any) => {
          tecnicos.push({
            id: tecnico.id,
            empleadoId: tecnico.id,
            nombre: tecnico.usuario || tecnico.nombre || 'Técnico',
            activo: true,
            tipo: 'tecnico-rh',
            fechaRegistro: new Date()
          });
        });
      });
      
      const tecnicosUnicos = tecnicos.filter((tecnico, index, self) =>
        index === self.findIndex(t => t.id === tecnico.id)
      );
      
      return tecnicosUnicos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
    } catch (error) {
      console.error('Error al cargar técnicos:', error);
      throw error;
    }
  }

  async getTecnicosActivos(): Promise<TecnicoRH[]> {
    const tecnicos = await this.getTecnicos();
    return tecnicos.filter(t => t.activo);
  }

  async getTecnicoById(id: string): Promise<TecnicoRH | null> {
    const tecnicos = await this.getTecnicos();
    return tecnicos.find(t => t.id === id) || null;
  }
}