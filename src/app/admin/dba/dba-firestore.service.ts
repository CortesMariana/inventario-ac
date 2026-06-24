import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  doc,
  deleteDoc,
  where,
  writeBatch
} from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

export type DbaCollectionKey = keyof typeof environment.collections;
export type DbaQueryOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains';

export interface DbaCollectionConfig {
  key: DbaCollectionKey;
  label: string;
  description: string;
  path: string;
  defaultQueryField?: string;
}

export interface DbaDocumentEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface DbaQuerySpec {
  field: string;
  operator: DbaQueryOperator;
  value: string;
  limit: number;
}

export interface DbaImportResult {
  processed: number;
  written: number;
  skipped: number;
}

const COLLECTIONS: DbaCollectionConfig[] = [
  {
    key: 'usuarios',
    label: 'Usuarios',
    description: 'Acceso a usuarios, roles y estado de cuenta.',
    path: environment.collections.usuarios,
    defaultQueryField: 'nombre'
  },
  {
    key: 'clientes',
    label: 'Clientes',
    description: 'Catálogo principal de clientes.',
    path: environment.collections.clientes,
    defaultQueryField: 'nombre'
  },
  {
    key: 'productos',
    label: 'Productos',
    description: 'Catálogo base de productos.',
    path: environment.collections.productos,
    defaultQueryField: 'nombre'
  },
  {
    key: 'inventario',
    label: 'Inventario',
    description: 'Existencias y stock por sucursal.',
    path: environment.collections.inventario,
    defaultQueryField: 'nombreProducto'
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    description: 'Documentos de pedidos y su estado.',
    path: environment.collections.pedidos,
    defaultQueryField: 'clienteNombre'
  },
  {
    key: 'entregas',
    label: 'Entregas',
    description: 'Seguimiento de entregas.',
    path: environment.collections.entregas,
    defaultQueryField: 'estado'
  },
  {
    key: 'sucursales',
    label: 'Sucursales',
    description: 'Catálogo de sucursales.',
    path: environment.collections.sucursales,
    defaultQueryField: 'nombre'
  },
  {
    key: 'transferencias',
    label: 'Transferencias',
    description: 'Movimientos entre sucursales.',
    path: environment.collections.transferencias,
    defaultQueryField: 'estado'
  }
];

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

function coerceQueryValue(raw: string): string | number | boolean | Date {
  const value = raw.trim();

  if (value === 'true') return true;
  if (value === 'false') return false;

  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (/\d{4}-\d{2}-\d{2}/.test(value) || value.includes('T') || value.includes('/')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return value;
}

function normalizeDocId(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim().replace(/\//g, '_');
  return normalized.length > 0 ? normalized : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

@Injectable({ providedIn: 'root' })
export class DbaFirestoreService {

  constructor(private firestore: Firestore) {}

  getCollections(): DbaCollectionConfig[] {
    return COLLECTIONS;
  }

  getCollection(key: DbaCollectionKey): DbaCollectionConfig {
    const config = COLLECTIONS.find(item => item.key === key);
    if (!config) {
      throw new Error(`Colección no soportada: ${String(key)}`);
    }
    return config;
  }

  async listDocuments(collectionKey: DbaCollectionKey, maxResults: number): Promise<DbaDocumentEntry[]> {
    const config = this.getCollection(collectionKey);
    const ref = collection(this.firestore, config.path);
    const snapshot = await getDocs(query(ref, limit(maxResults)));

    return snapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        data: (docSnap.data() ?? {}) as Record<string, unknown>
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async runQuery(collectionKey: DbaCollectionKey, spec: DbaQuerySpec): Promise<DbaDocumentEntry[]> {
    const config = this.getCollection(collectionKey);
    const ref = collection(this.firestore, config.path);

    if (!spec.field.trim() || !spec.value.trim()) {
      return this.listDocuments(collectionKey, spec.limit);
    }

    const queryValue = coerceQueryValue(spec.value);
    const fieldRef = spec.field === '__id__' ? documentId() : spec.field;
    const q = query(ref, where(fieldRef, spec.operator, queryValue), limit(spec.limit));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        data: (docSnap.data() ?? {}) as Record<string, unknown>
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async getDocument(collectionKey: DbaCollectionKey, id: string): Promise<DbaDocumentEntry | null> {
    const config = this.getCollection(collectionKey);
    const ref = doc(this.firestore, `${config.path}/${id}`);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      data: (snapshot.data() ?? {}) as Record<string, unknown>
    };
  }

  async saveDocument(collectionKey: DbaCollectionKey, id: string | null, data: Record<string, unknown>): Promise<string> {
    const config = this.getCollection(collectionKey);
    const cleanData = stripUndefined(data);
    const ref = id?.trim()
      ? doc(this.firestore, `${config.path}/${id.trim().replace(/\//g, '_')}`)
      : doc(collection(this.firestore, config.path));

    await setDoc(ref, cleanData);
    return ref.id;
  }

  async deleteDocument(collectionKey: DbaCollectionKey, id: string): Promise<void> {
    const config = this.getCollection(collectionKey);
    const ref = doc(this.firestore, `${config.path}/${id}`);
    await deleteDoc(ref);
  }

  async importDocuments(
    collectionKey: DbaCollectionKey,
    rows: Record<string, unknown>[],
    keyField: string
  ): Promise<DbaImportResult> {
    const config = this.getCollection(collectionKey);
    const batches = chunk(rows, 400);
    let processed = 0;
    let written = 0;
    let skipped = 0;

    for (const batchRows of batches) {
      const batch = writeBatch(this.firestore);
      const collectionRef = collection(this.firestore, config.path);
      let batchWrites = 0;

      for (const row of batchRows) {
        processed += 1;
        const docId = normalizeDocId(row[keyField]);
        if (!docId) {
          skipped += 1;
          continue;
        }

        const payload = stripUndefined({ ...row });
        batch.set(doc(collectionRef, docId), payload);
        written += 1;
        batchWrites += 1;
      }

      if (batchWrites > 0) {
        await batch.commit();
      }
    }

    return { processed, written, skipped };
  }
}
