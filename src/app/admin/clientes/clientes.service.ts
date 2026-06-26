import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DireccionCliente {
  calle: string;
  numeroExterior: string;
  colonia: string;
  ciudad: string;
  codigoPostal: string;
}

export interface Cliente {
  id?: string;
  nombre: string;
  rfc: string;
  email?: string;
  direccion: string;
  direccionFisica?: DireccionCliente;
  domicilioFiscal?: DireccionCliente;
  domicilioFiscalIgualFisica?: boolean;
  telefono: string;
  personaCargo?: string;
  telefonoContacto?: string;
  descuento: number;
  activo: boolean;
  fechaCreacion?: Date;
}

function clean(value?: string | number | null): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function hasDireccion(direccion?: Partial<DireccionCliente> | null): boolean {
  return !!clean(direccion?.calle)
    || !!clean(direccion?.numeroExterior)
    || !!clean(direccion?.colonia)
    || !!clean(direccion?.ciudad)
    || !!clean(direccion?.codigoPostal);
}

function cloneDireccion(direccion?: Partial<DireccionCliente> | null): DireccionCliente | undefined {
  if (!hasDireccion(direccion)) {
    return undefined;
  }

  return {
    calle: clean(direccion?.calle),
    numeroExterior: clean(direccion?.numeroExterior),
    colonia: clean(direccion?.colonia),
    ciudad: clean(direccion?.ciudad),
    codigoPostal: clean(direccion?.codigoPostal)
  };
}

export function formatDireccion(direccion?: Partial<DireccionCliente> | null): string {
  if (!hasDireccion(direccion)) {
    return '';
  }

  return [
    clean(direccion?.calle),
    clean(direccion?.numeroExterior),
    clean(direccion?.colonia),
    clean(direccion?.ciudad),
    clean(direccion?.codigoPostal)
  ].filter(Boolean).join(', ');
}

export function parseDireccionTexto(texto?: string | null): Partial<DireccionCliente> {
  const partes = clean(texto)
    .split(',')
    .map(parte => parte.trim())
    .filter(Boolean);

  const [calle = '', numeroExterior = '', colonia = '', ciudad = '', codigoPostal = ''] = partes;

  return {
    calle,
    numeroExterior,
    colonia,
    ciudad,
    codigoPostal
  };
}

function hydrateCliente(cliente: Partial<Cliente>): Cliente {
  const direccionFisica = cloneDireccion(cliente.direccionFisica) ?? cloneDireccion(parseDireccionTexto(cliente.direccion));
  const domicilioFiscalIgualFisica = cliente.domicilioFiscalIgualFisica ?? (!cliente.domicilioFiscal && !!direccionFisica);
  const domicilioFiscal = cloneDireccion(cliente.domicilioFiscal)
    ?? (domicilioFiscalIgualFisica && direccionFisica ? { ...direccionFisica } : undefined);

  return {
    id: cliente.id,
    nombre: clean(cliente.nombre),
    rfc: clean(cliente.rfc).toUpperCase(),
    direccionFisica,
    domicilioFiscal,
    domicilioFiscalIgualFisica,
    direccion: clean(cliente.direccion) || formatDireccion(direccionFisica) || formatDireccion(domicilioFiscal),
    telefono: clean(cliente.telefono),
    personaCargo: clean(cliente.personaCargo),
    telefonoContacto: clean(cliente.telefonoContacto),
    descuento: Number(cliente.descuento ?? 0),
    activo: cliente.activo ?? true,
    fechaCreacion: cliente.fechaCreacion
  };
}

function normalizeCliente(cliente: Partial<Cliente>): Partial<Cliente> {
  const hydrated = hydrateCliente(cliente);
  const domicilioFiscal = hydrated.domicilioFiscalIgualFisica && hydrated.direccionFisica
    ? { ...hydrated.direccionFisica }
    : hydrated.domicilioFiscal;

  return {
    ...hydrated,
    rfc: clean(hydrated.rfc).toUpperCase(),
    direccion: hydrated.direccion || formatDireccion(hydrated.direccionFisica) || formatDireccion(domicilioFiscal),
    direccionFisica: hydrated.direccionFisica,
    domicilioFiscal,
    domicilioFiscalIgualFisica: hydrated.domicilioFiscalIgualFisica,
    personaCargo: clean(hydrated.personaCargo),
    telefonoContacto: clean(hydrated.telefonoContacto),
    descuento: Number(hydrated.descuento ?? 0)
  };
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item)) as T;
  }

  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  ) as T;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {

  private col = environment.collections.clientes;

  constructor(private firestore: Firestore) {}

  getAll$(): Observable<Cliente[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(ref, orderBy('nombre', 'asc'));
    return (collectionData(q as any, { idField: 'id' }) as Observable<Partial<Cliente>[]>)
      .pipe(map(clientes => clientes.map(cliente => hydrateCliente(cliente))));
  }

  getById$(id: string): Observable<Cliente> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return (docData(ref as any, { idField: 'id' }) as Observable<Partial<Cliente>>)
      .pipe(map(cliente => hydrateCliente(cliente)));
  }

  create(cliente: Partial<Cliente>): Promise<any> {
    const ref = doc(collection(this.firestore, this.col));
    return setDoc(ref, stripUndefined({
      ...normalizeCliente(cliente),
      id: ref.id,
      fechaCreacion: new Date()
    }));
  }

  update(id: string, cliente: Partial<Cliente>): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, stripUndefined(normalizeCliente(cliente)));
  }

  delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return deleteDoc(ref);
  }
}
