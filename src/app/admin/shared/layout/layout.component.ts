import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.css'],
    standalone: false
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  isMobile = false;

  private readonly mobileBreakpoint = 900;
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.syncViewportState();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.mobileSidebarOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  onSidebarCollapsedChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onMobileSidebarOpenChange(open: boolean): void {
    this.mobileSidebarOpen = open;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  private syncViewportState(): void {
    const mobile = typeof window !== 'undefined' && window.innerWidth <= this.mobileBreakpoint;
    this.isMobile = mobile;

    if (!mobile) {
      this.mobileSidebarOpen = false;
    }
  }
}
