import { Component, Input, OnInit } from '@angular/core';
import { MenuService } from '../app.menu.service';
import {
    LayoutService,
    MenuMode,
    ColorScheme,
    TopbarColorScheme,
} from '../service/app.layout.service';

@Component({
    selector: 'app-config',
    templateUrl: './app.config.component.html',
})
export class AppConfigComponent implements OnInit {
    @Input() minimal: boolean = false;

    componentThemes: any[] = [];

    scales: number[] = [12, 13, 14, 15, 16];

    constructor(
        public layoutService: LayoutService,
        public menuService: MenuService
    ) {}

    get visible(): boolean {
        return this.layoutService.state.configSidebarVisible;
    }
    set visible(_val: boolean) {
        this.layoutService.state.configSidebarVisible = _val;
    }

    get scale(): number {
        return this.layoutService.config().scale;
    }
    set scale(_val: number) {
        this.layoutService.config.update((config) => ({
            ...config,
            scale: _val,
        }));
    }

    get menuMode(): MenuMode {
        return this.layoutService.config().menuMode;
    }
    set menuMode(_val: MenuMode) {
        this.layoutService.config.update((config) => ({
            ...config,
            menuMode: _val,
        }));
        if (
            this.layoutService.isSlimPlus() ||
            this.layoutService.isSlim() ||
            this.layoutService.isHorizontal()
        ) {
            this.menuService.reset();
        }
        if (this.layoutService.isHorizontal()) {
            const menuTheme =
                this.layoutService.config().topbarTheme === 'transparent'
                    ? this.layoutService.config().menuTheme
                    : this.layoutService.config().topbarTheme;

            this.layoutService.config.update((config) => ({
                ...config,
                menuTheme,
            }));
        }
    }

    get colorScheme(): ColorScheme {
        return this.layoutService.config().colorScheme;
    }
    set colorScheme(_val: ColorScheme) {
        this.layoutService.config.update((config) => ({
            ...config,
            colorScheme: _val,
        }));
        this.layoutService.config.update((config) => ({
            ...config,
            menuTheme: _val,
        }));
        const tobarTheme =
            this.layoutService.config().topbarTheme === 'transparent'
                ? 'transparent'
                : _val;

        this.layoutService.config.update((config) => ({
            ...config,
            topbarTheme: tobarTheme,
        }));
    }

    get inputStyle(): string {
        return this.layoutService.config().inputStyle;
    }
    set inputStyle(_val: string) {
        this.layoutService.config.update((config) => ({
            ...config,
            inputStyle: _val,
        }));
    }

    get ripple(): boolean {
        return this.layoutService.config().ripple;
    }
    set ripple(_val: boolean) {
        this.layoutService.config.update((config) => ({
            ...config,
            ripple: _val,
        }));
    }

    get menuTheme(): ColorScheme {
        return this.layoutService.config().menuTheme;
    }
    set menuTheme(_val: ColorScheme) {
        if (this.layoutService.isHorizontal()) {
            const theme =
                this.layoutService.config().topbarTheme === 'transparent'
                    ? this.layoutService.config().menuTheme
                    : _val;
            this.layoutService.config.update((config) => ({
                ...config,
                menuTheme: theme,
            }));
        } else {
            this.layoutService.config.update((config) => ({
                ...config,
                menuTheme: _val,
            }));
        }
    }

    get topbarTheme(): TopbarColorScheme {
        return this.layoutService.config().topbarTheme;
    }
    set topbarTheme(_val: TopbarColorScheme) {
        if (this.layoutService.isHorizontal()) {
            this.layoutService.config().menuTheme =
                _val === 'transparent'
                    ? this.layoutService.config().colorScheme
                    : _val;
        }

        this.layoutService.config().topbarTheme = _val;
    }

    get theme(): string {
        return this.layoutService.config().theme;
    }
    set theme(_val: string) {
        this.layoutService.config.update((config) => ({
            ...config,
            theme: _val,
        }));
    }

    ngOnInit() {
        this.componentThemes = [
            { name: 'avocado', color: '#AEC523' },
            { name: 'blue', color: '#5297FF' },
            { name: 'purple', color: '#464DF2' },
            { name: 'teal', color: '#14B8A6' },
            { name: 'green', color: '#34B56F' },
            { name: 'indigo', color: '#6366F1' },
            { name: 'orange', color: '#FF810E' },
            { name: 'red', color: '#FF9B7B' },
            { name: 'turquoise', color: '#58AED3' },
            { name: 'yellow', color: '#FFB340' },
        ];
    }

    onConfigButtonClick() {
        this.layoutService.showConfigSidebar();
    }

    changeColorScheme(colorScheme: ColorScheme) {
        this.colorScheme = colorScheme;
    }

    changeTheme(theme: string) {
        this.theme = theme;
    }

    decrementScale() {
        this.scale--;
    }

    incrementScale() {
        this.scale++;
    }
}
