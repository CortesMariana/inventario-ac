import { Component, EventEmitter, Input, Output } from '@angular/core';

interface Theme {
  accent: string;
  accentLight: string;
  accentLightText: string;
}

interface SidebarTheme {
  name: string;
  bg: string;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  themeVisible = false;

  accents: (Theme & { name: string })[] = [
    { name: 'Azul',    accent: '#3B82F6', accentLight: '#EEF4FF', accentLightText: '#1E40AF' },
    { name: 'Violeta', accent: '#7C3AED', accentLight: '#F5F0FF', accentLightText: '#5B21B6' },
    { name: 'Teal',    accent: '#0D9488', accentLight: '#F0FDFA', accentLightText: '#0F6E56' },
    { name: 'Rosa',    accent: '#DB2777', accentLight: '#FDF2F8', accentLightText: '#9D174D' },
    { name: 'Naranja', accent: '#EA580C', accentLight: '#FFF7ED', accentLightText: '#9A3412' },
    { name: 'Verde',   accent: '#16A34A', accentLight: '#F0FDF4', accentLightText: '#14532D' },
    { name: 'Índigo',  accent: '#4338CA', accentLight: '#EEF2FF', accentLightText: '#3730A3' },
    { name: 'Rojo',    accent: '#DC2626', accentLight: '#FEF2F2', accentLightText: '#991B1B' },
  ];

  sidebarThemes: SidebarTheme[] = [
    { name: 'Marino', bg: '#1E2A3A' },
    { name: 'Negro',  bg: '#111827' },
    { name: 'Gris',   bg: '#374151' },
    { name: 'Blanco', bg: '#FFFFFF' },
  ];

  selectedAccent = this.accents[0];
  selectedSidebar = this.sidebarThemes[0];

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  toggleThemePanel(): void {
    this.themeVisible = !this.themeVisible;
  }

  applyAccent(accent: Theme & { name: string }): void {
    this.selectedAccent = accent;
    document.documentElement.style.setProperty('--accent', accent.accent);
    document.documentElement.style.setProperty('--accent-light', accent.accentLight);
    document.documentElement.style.setProperty('--accent-light-text', accent.accentLightText);
    this.saveTheme();
  }

  applySidebar(theme: SidebarTheme): void {
    this.selectedSidebar = theme;
    document.documentElement.style.setProperty('--sidebar-bg', theme.bg);
    this.saveTheme();
  }

  saveTheme(): void {
    localStorage.setItem('ac-theme', JSON.stringify({
      accent: this.selectedAccent,
      sidebar: this.selectedSidebar
    }));
  }

  loadTheme(): void {
    const saved = localStorage.getItem('ac-theme');
    if (!saved) return;
    try {
      const { accent, sidebar } = JSON.parse(saved);
      if (accent) this.applyAccent(accent);
      if (sidebar) this.applySidebar(sidebar);
    } catch {}
  }

  ngOnInit(): void {
    this.loadTheme();
  }
}