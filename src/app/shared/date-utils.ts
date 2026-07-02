export interface FormatDateOptions {
  includeTime?: boolean;
  emptyText?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDate(value?: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return null;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object') {
    const candidate = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    if (typeof candidate.seconds === 'number') {
      const milliseconds = (candidate.seconds * 1000) + Math.floor((candidate.nanoseconds ?? 0) / 1_000_000);
      const date = new Date(milliseconds);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export function formatDateInput(value?: unknown): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

export function formatDate(value?: unknown, options: FormatDateOptions = {}): string {
  const date = toDate(value);
  if (!date) {
    return options.emptyText ?? 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options.includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {})
  }).format(date);
}
