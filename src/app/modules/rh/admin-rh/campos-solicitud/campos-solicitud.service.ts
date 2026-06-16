import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { CampoConfiguracion, GrupoCampos } from './models/campo-solicitud.model';
import { UserService } from 'src/app/shared/service/user.service';

@Injectable({
  providedIn: 'root'
})
export class CamposSolicitudService {
  
  private collectionName = environment.collections.configuracion_campos_rh;
  private tiposCollectionName = environment.collections.tipos_solicitud_rh; 

  constructor(
    private firestore: Firestore,
    private userSrv: UserService
  ) {}

  async getCampos(tipoSolicitud?: string): Promise<CampoConfiguracion[]> {
    try {
      console.log('getCampos - tipoSolicitud recibido:', tipoSolicitud);
      
      const collectionRef = collection(this.firestore, this.collectionName);
      console.log('Buscando en colección:', this.collectionName);
      
      let q = query(collectionRef, orderBy('orden', 'asc'));
      
      if (tipoSolicitud && tipoSolicitud !== 'todos') {
        console.log('Aplicando filtro por tipoSolicitud:', tipoSolicitud);
        q = query(q, where('tipoSolicitud', 'in', [tipoSolicitud, 'todos']));
      }
      
      const querySnapshot = await getDocs(q);
      console.log('Documentos encontrados:', querySnapshot.size);
      
      const campos: CampoConfiguracion[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data() as CampoConfiguracion;
        console.log('Documento encontrado:', doc.id, data);
        campos.push({
          firestoreId: doc.id,
          ...data
        });
      });
      
      console.log('Total campos procesados:', campos.length);
      return campos;
    } catch (error) {
      console.error('Error al cargar campos:', error);
      throw error;
    }
  }

  async getCamposAgrupados(tipoSolicitud: string): Promise<GrupoCampos[]> {
    const campos = await this.getCampos(tipoSolicitud);
    
    const grupos: { [key: string]: GrupoCampos } = {
      'basico': { categoria: 'basico', titulo: 'Información Básica', campos: [], orden: 1, icono: 'pi-info-circle' },
      'contacto': { categoria: 'contacto', titulo: 'Contacto', campos: [], orden: 2, icono: 'pi-phone' },
      'fechas': { categoria: 'fechas', titulo: 'Fechas', campos: [], orden: 3, icono: 'pi-calendar' },
      'economico': { categoria: 'economico', titulo: 'Información Económica', campos: [], orden: 4, icono: 'pi-credit-card' },
      'documentos': { categoria: 'documentos', titulo: 'Documentos', campos: [], orden: 5, icono: 'pi-paperclip' },
      'otro': { categoria: 'otro', titulo: 'Otros', campos: [], orden: 6, icono: 'pi-tag' }
    };
    
    campos.forEach(campo => {
      if (grupos[campo.categoria]) {
        grupos[campo.categoria].campos.push(campo);
      }
    });
    
    return Object.values(grupos)
      .filter(g => g.campos.length > 0)
      .sort((a, b) => a.orden - b.orden);
  }

  async guardarCampo(campo: Partial<CampoConfiguracion>): Promise<string> {
    try {
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      
      const campoData = {
        ...campo,
        fechaCreacion: new Date(),
        creadoPor: usuario ? {
          id: usuario.id,
          nombre: usuario.nombreCompleto || usuario.nombre
        } : null
      };
      
      const collectionRef = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(collectionRef, campoData);
      return docRef.id;
    } catch (error) {
      console.error('Error al guardar campo:', error);
      throw error;
    }
  }

  async actualizarCampo(firestoreId: string, campo: Partial<CampoConfiguracion>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, firestoreId);
      await updateDoc(docRef, {
        ...campo,
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al actualizar campo:', error);
      throw error;
    }
  }

  async eliminarCampo(firestoreId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, firestoreId);
      await updateDoc(docRef, { activo: false });
    } catch (error) {
      console.error('Error al eliminar campo:', error);
      throw error;
    }
  }

  async duplicarCampo(campo: CampoConfiguracion): Promise<string> {
    const { firestoreId, ...campoData } = campo;
    const nuevoCampo = {
      ...campoData,
      nombre: `${campo.nombre}_copia`,
      etiqueta: `${campo.etiqueta} (copia)`,
      activo: true,
      fechaCreacion: new Date()
    };
    return this.guardarCampo(nuevoCampo);
  }

  getTiposCampo() {
    return [
      { label: 'Texto corto', value: 'texto', icon: 'pi pi-pencil' },
      { label: 'Área de texto', value: 'textarea', icon: 'pi pi-align-left' },
      { label: 'Número', value: 'numero', icon: 'pi pi-sort-numeric' },
      { label: 'Fecha', value: 'fecha', icon: 'pi pi-calendar' },
      { label: 'Lista desplegable', value: 'select', icon: 'pi pi-caret-down' },
      { label: 'Opciones (Radio)', value: 'radio', icon: 'pi pi-circle' },
      { label: 'Casillas (Checkbox)', value: 'checkbox', icon: 'pi pi-check-square' },
      { label: 'Archivo', value: 'archivo', icon: 'pi pi-file' }
    ];
  }

  getCategorias() {
    return [
      { label: 'Información Básica', value: 'basico', icon: 'pi-info-circle', order: 1 },
      { label: 'Contacto', value: 'contacto', icon: 'pi-phone', order: 2 },
      { label: 'Fechas', value: 'fechas', icon: 'pi-calendar', order: 3 },
      { label: 'Económico', value: 'economico', icon: 'pi-credit-card', order: 4 },
      { label: 'Documentos', value: 'documentos', icon: 'pi-paperclip', order: 5 },
      { label: 'Otro', value: 'otro', icon: 'pi-tag', order: 6 }
    ];
  }

  async getTiposSolicitudParaDropdown() {
    try {
      console.log('=== INICIANDO CARGA DE TIPOS ===');
      console.log('Usando colección:', this.tiposCollectionName);
      
      const collectionRef = collection(this.firestore, this.tiposCollectionName);
      
      const q = query(collectionRef, orderBy('orden', 'asc'));
      
      const querySnapshot = await getDocs(q);
      
      console.log('Total documentos encontrados:', querySnapshot.size);
      
      const tipos: any[] = [{ label: 'Todos los tipos', value: 'todos', icon: 'pi pi-globe' }];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Procesando documento:', data);
        
        if (data['activo'] === true) {
          console.log('Tipo ACTIVO encontrado:', data['etiqueta']);
          tipos.push({
            label: data['etiqueta'] || 'Sin etiqueta',
            value: data['valor'] || doc.id,
            icon: data['icono'] || 'pi pi-tag',
            color: data['color'] || '#667eea'
          });
        } else {
          console.log('Tipo INACTIVO ignorado:', data['etiqueta']);
        }
      });
      
      console.log('Tipos finales para dropdown:', tipos);
      return tipos;
      
    } catch (error) {
      console.error('ERROR al cargar tipos:', error);
      return [
        { label: 'Todos los tipos', value: 'todos', icon: 'pi pi-globe' }
      ];
    }
  }

  async getTiposSolicitud() {
    return this.getTiposSolicitudParaDropdown();
  }

  async validarNombreUnico(nombre: string, excludeId?: string): Promise<boolean> {
    const campos = await this.getCampos();
    return !campos.some(c => 
      c.nombre === nombre && 
      c.firestoreId !== excludeId &&
      c.activo
    );
  }
}