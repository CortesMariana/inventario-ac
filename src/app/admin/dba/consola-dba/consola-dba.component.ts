import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { formatDate, toDate } from 'src/app/shared/date-utils';
import {
  DbaCollectionConfig,
  DbaDocumentEntry,
  DbaFirestoreService,
  DbaQueryOperator,
  DbaQuerySpec
} from '../dba-firestore.service';

type EditorMode = 'new' | 'edit';

@Component({
  selector: 'app-consola-dba',
  templateUrl: './consola-dba.component.html',
  styleUrls: ['./consola-dba.component.css'],
  standalone: false
})
export class ConsolaDbaComponent implements OnInit {

  collections: DbaCollectionConfig[] = [];
  selectedCollectionKey: DbaCollectionConfig['key'] = 'clientes';

  queryOperators: { label: string; value: DbaQueryOperator }[] = [
    { label: 'Igual a', value: '==' },
    { label: 'Distinto de', value: '!=' },
    { label: 'Mayor que', value: '>' },
    { label: 'Mayor o igual', value: '>=' },
    { label: 'Menor que', value: '<' },
    { label: 'Menor o igual', value: '<=' },
    { label: 'Contiene en arreglo', value: 'array-contains' }
  ];

  limitCount = 100;
  queryField = '';
  queryOperator: DbaQueryOperator = '==';
  queryValue = '';
  searchText = '';

  loading = false;
  rows: DbaDocumentEntry[] = [];
  filteredRows: DbaDocumentEntry[] = [];
  currentQuery: DbaQuerySpec | null = null;
  currentView: 'list' | 'query' = 'list';

  editorMode: EditorMode = 'new';
  editorDocId = '';
  editorJson = '{\n\n}';
  selectedDocument: DbaDocumentEntry | null = null;

  confirmVisible = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: 'danger' | 'warning' | 'info' = 'danger';
  confirmAction: (() => void) | null = null;

  importFileName = '';
  importRows: Record<string, unknown>[] = [];
  importHeaders: string[] = [];
  importKeyField = '';
  importLoading = false;
  importPreviewRows = 5;
  importReady = false;

  constructor(
    private dbaSrv: DbaFirestoreService,
    private messageSrv: MessageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.collections = this.dbaSrv.getCollections();
    this.selectedCollectionKey = this.collections[0].key;
    this.queryField = this.currentCollection.defaultQueryField ?? '';
    await this.reloadList();
  }

  get currentCollection(): DbaCollectionConfig {
    return this.dbaSrv.getCollection(this.selectedCollectionKey);
  }

  get availableFields(): string[] {
    const fields = new Set<string>();
    for (const row of this.rows) {
      for (const key of Object.keys(row.data)) {
        fields.add(key);
      }
    }
    return Array.from(fields).sort((a, b) => a.localeCompare(b));
  }

  get queryFieldOptions(): { label: string; value: string }[] {
    const options = [
      { label: 'Documento ID', value: '__id__' },
      ...(this.queryField ? [{ label: this.queryField, value: this.queryField }] : []),
      ...this.availableFields.map(field => ({ label: field, value: field }))
    ];

    return options.filter((option, index, self) => self.findIndex(item => item.value === option.value) === index);
  }

  get previewFields(): string[] {
    return this.availableFields.slice(0, 5);
  }

  get hasRows(): boolean {
    return this.filteredRows.length > 0;
  }

  get viewLabel(): string {
    return this.currentView === 'query' && this.currentQuery
      ? `Consulta: ${this.currentQuery.field} ${this.currentQuery.operator} ${this.currentQuery.value}`
      : 'Vista general';
  }

  async reloadList(): Promise<void> {
    this.currentView = 'list';
    this.currentQuery = null;
    await this.fetchRows(async () => this.dbaSrv.listDocuments(this.selectedCollectionKey, this.limitCount));
  }

  async executeQuery(): Promise<void> {
    const field = this.queryField.trim();
    const value = this.queryValue.trim();

    if (!field || !value) {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Consulta incompleta',
        detail: 'Selecciona campo y valor antes de ejecutar la consulta'
      });
      return;
    }

    if (field === '__id__' && this.queryOperator !== '==') {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Operador no válido',
        detail: 'El documento ID solo acepta igualdad'
      });
      return;
    }

    const querySpec: DbaQuerySpec = {
      field,
      operator: this.queryOperator,
      value,
      limit: this.limitCount
    };

    this.currentView = 'query';
    this.currentQuery = querySpec;
    await this.fetchRows(() => this.dbaSrv.runQuery(this.selectedCollectionKey, querySpec));
  }

  async onCollectionChange(): Promise<void> {
    this.queryField = this.currentCollection.defaultQueryField ?? '';
    this.queryValue = '';
    this.searchText = '';
    this.editorMode = 'new';
    this.selectedDocument = null;
    this.editorDocId = '';
    this.editorJson = '{\n\n}';
    await this.reloadList();
  }

  onSearchChange(): void {
    this.applyLocalFilter();
  }

  openDocument(row: DbaDocumentEntry): void {
    this.selectedDocument = row;
    this.editorMode = 'edit';
    this.editorDocId = row.id;
    this.editorJson = JSON.stringify(row.data, null, 2);
  }

  startNewDocument(): void {
    this.selectedDocument = null;
    this.editorMode = 'new';
    this.editorDocId = '';
    this.editorJson = '{\n\n}';
  }

  async saveDocument(): Promise<void> {
    try {
      const parsed = JSON.parse(this.editorJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un objeto');
      }

      const savedId = await this.dbaSrv.saveDocument(
        this.selectedCollectionKey,
        this.editorDocId,
        parsed as Record<string, unknown>
      );

      this.messageSrv.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `Documento ${savedId} actualizado correctamente`
      });

      await this.reloadCurrentView();
      const savedRow = this.rows.find(row => row.id === savedId);
      if (savedRow) {
        this.openDocument(savedRow);
      } else {
        this.selectedDocument = { id: savedId, data: parsed as Record<string, unknown> };
        this.editorMode = 'edit';
        this.editorDocId = savedId;
        this.editorJson = JSON.stringify(parsed, null, 2);
      }
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'No se pudo guardar el documento'
      });
    }
  }

  confirmDelete(row: DbaDocumentEntry): void {
    this.confirmTitle = 'Eliminar documento';
    this.confirmMessage = `Vas a eliminar el documento ${row.id} de ${this.currentCollection.label}. Esta acción no se puede deshacer.`;
    this.confirmType = 'danger';
    this.confirmAction = () => {
      void this.deleteDocument(row.id);
    };
    this.confirmVisible = true;
  }

  confirmImport(): void {
    if (!this.importRows.length || !this.importKeyField) {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Importación incompleta',
        detail: 'Carga un archivo y selecciona la columna clave'
      });
      return;
    }

    this.confirmTitle = 'Importar documentos';
    this.confirmMessage = `Se importarán ${this.importRows.length} registros en ${this.currentCollection.label} usando la columna ${this.importKeyField}. Los documentos con el mismo ID se sobrescribirán.`;
    this.confirmType = 'warning';
    this.confirmAction = () => {
      void this.runImport();
    };
    this.confirmVisible = true;
  }

  onConfirm(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.importLoading = true;
    this.importReady = false;
    this.importRows = [];
    this.importHeaders = [];
    this.importFileName = file.name;
    this.importKeyField = '';

    try {
      const rows = await this.parseImportFile(file);
      this.importRows = rows;
      this.importHeaders = this.collectHeaders(rows);
      this.importKeyField = this.pickDefaultImportKeyField(rows);
      this.importReady = rows.length > 0;
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Importación',
        detail: err?.message ?? 'No se pudo leer el archivo'
      });
    } finally {
      this.importLoading = false;
      input.value = '';
    }
  }

  clearImport(): void {
    this.importFileName = '';
    this.importRows = [];
    this.importHeaders = [];
    this.importKeyField = '';
    this.importReady = false;
  }

  async runImport(): Promise<void> {
    if (!this.importRows.length || !this.importKeyField) {
      return;
    }

    this.importLoading = true;
    try {
      const result = await this.dbaSrv.importDocuments(
        this.selectedCollectionKey,
        this.importRows,
        this.importKeyField
      );

      this.messageSrv.add({
        severity: 'success',
        summary: 'Importación completa',
        detail: `${result.written} documentos escritos, ${result.skipped} omitidos`
      });

      await this.reloadCurrentView();
      this.clearImport();
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Importación',
        detail: err?.message ?? 'No se pudo importar el archivo'
      });
    } finally {
      this.importLoading = false;
    }
  }

  async refreshVisibleData(): Promise<void> {
    await this.reloadCurrentView();
  }

  trackById(_: number, row: DbaDocumentEntry): string {
    return row.id;
  }

  renderValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return '';
    const date = toDate(value);
    if (date) return formatDate(date, { includeTime: true, emptyText: '' });
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return '[no serializable]';
    }
  }

  renderCell(value: unknown): string {
    const text = this.renderValue(value);
    if (!text) {
      return '—';
    }
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  }

  private async deleteDocument(id: string): Promise<void> {
    try {
      await this.dbaSrv.deleteDocument(this.selectedCollectionKey, id);
      this.messageSrv.add({
        severity: 'success',
        summary: 'Eliminado',
        detail: `Documento ${id} eliminado`
      });
      if (this.selectedDocument?.id === id) {
        this.startNewDocument();
      }
      await this.reloadCurrentView();
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'No se pudo eliminar el documento'
      });
    }
  }

  private async reloadCurrentView(): Promise<void> {
    if (this.currentView === 'query' && this.currentQuery) {
      const querySpec: DbaQuerySpec = {
        ...this.currentQuery,
        limit: this.limitCount
      };
      this.currentQuery = querySpec;
      await this.fetchRows(() => this.dbaSrv.runQuery(this.selectedCollectionKey, querySpec));
      return;
    }

    await this.fetchRows(async () => this.dbaSrv.listDocuments(this.selectedCollectionKey, this.limitCount));
  }

  private async fetchRows(loader: () => Promise<DbaDocumentEntry[]>): Promise<void> {
    this.loading = true;
    try {
      this.rows = await loader();
      this.applyLocalFilter();
      this.syncEditorSelection();
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Firestore',
        detail: err?.message ?? 'No se pudieron cargar los documentos'
      });
    } finally {
      this.loading = false;
    }
  }

  private applyLocalFilter(): void {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter(row => {
      const haystack = `${row.id} ${JSON.stringify(row.data)}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  private syncEditorSelection(): void {
    if (!this.selectedDocument) {
      return;
    }

    const refreshed = this.rows.find(row => row.id === this.selectedDocument?.id);
    if (refreshed) {
      this.selectedDocument = refreshed;
      if (this.editorMode === 'edit') {
        this.editorDocId = refreshed.id;
        this.editorJson = JSON.stringify(refreshed.data, null, 2);
      }
    }
  }

  private collectHeaders(rows: Record<string, unknown>[]): string[] {
    const headers = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        headers.add(key);
      }
    }
    return Array.from(headers).sort((a, b) => a.localeCompare(b));
  }

  private pickDefaultImportKeyField(rows: Record<string, unknown>[]): string {
    if (!rows.length) {
      return '';
    }

    const row = rows[0];
    const headers = new Set(Object.keys(row));
    const preferred = this.currentCollection.preferredImportKeyFields ?? [];

    for (const field of preferred) {
      if (headers.has(field)) {
        return field;
      }
    }

    if (headers.has('id')) {
      return 'id';
    }

    return Object.keys(row)[0] ?? '';
  }

  private async parseImportFile(file: File): Promise<Record<string, unknown>[]> {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.json') || file.type.includes('json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as Record<string, unknown>[];
      }

      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rows?: unknown[] }).rows)) {
        return (parsed as { rows: Record<string, unknown>[] }).rows;
      }

      throw new Error('El JSON debe ser un arreglo de objetos o tener la propiedad rows');
    }

    const workbook = lowerName.endsWith('.csv') || file.type.includes('csv')
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error('El archivo no contiene hojas válidas');
    }

    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true
    });
  }
}
