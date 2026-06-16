import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ChartModule } from 'primeng/chart';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ChipsModule } from 'primeng/chips';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DataViewModule } from 'primeng/dataview';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { EditorModule } from 'primeng/editor';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';
import { InplaceModule } from 'primeng/inplace';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { KeyFilterModule } from 'primeng/keyfilter';
import { KnobModule } from 'primeng/knob';
import { ListboxModule } from 'primeng/listbox';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MessagesModule } from 'primeng/messages';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PanelModule } from 'primeng/panel';
import { PanelMenuModule } from 'primeng/panelmenu';
import { PasswordModule } from 'primeng/password';
import { ProgressBarModule } from 'primeng/progressbar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ScrollTopModule } from 'primeng/scrolltop';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { SliderModule } from 'primeng/slider';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SplitterModule } from 'primeng/splitter';
import { StepsModule } from 'primeng/steps';
import { StyleClassModule } from 'primeng/styleclass';
import { TableModule } from 'primeng/table';
import { TabMenuModule } from 'primeng/tabmenu';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ChipsModule,
    SidebarModule,
    ConfirmPopupModule,
    TreeTableModule,
    TreeModule,
    FieldsetModule,
    SplitterModule,
    SplitButtonModule,
    PanelModule,
    ScrollPanelModule,
    SkeletonModule,
    BreadcrumbModule,
    MenubarModule,
    StepsModule,
    ContextMenuModule,
    TieredMenuModule,
    TabMenuModule,
    MegaMenuModule,
    PanelMenuModule,
    ImageModule,
    GalleriaModule,
    ListboxModule,
    SelectButtonModule,
    ColorPickerModule,
    CascadeSelectModule,
    SliderModule,
    MultiSelectModule,
    ToggleButtonModule,
    DividerModule,
    AccordionModule,
    InputGroupAddonModule,
    InputGroupModule,
    ToolbarModule,
    RadioButtonModule,
    InputTextareaModule,
    DynamicDialogModule,
    ScrollTopModule,
    StyleClassModule,
    FormsModule,
    InputSwitchModule,
    KnobModule,
    InputNumberModule,
    TooltipModule,
    ConfirmDialogModule,
    CarouselModule,
    InputMaskModule,
    ProgressBarModule,
    TabViewModule,
    RatingModule,
    MessagesModule,
    TagModule,
    AvatarModule,
    DataViewModule,
    DropdownModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    RippleModule,
    ChipModule,
    FullCalendarModule,
    DialogModule,
    CalendarModule,
    ToastModule,
    EditorModule,
    OverlayPanelModule,
    BadgeModule,
    TableModule,
    MenuModule,
    ChartModule,
    CheckboxModule,
    AutoCompleteModule,
    AvatarGroupModule,
    PasswordModule,
    KeyFilterModule,
    ProgressSpinnerModule,
    BlockUIModule,
    FileUploadModule,
    ReactiveFormsModule,
    CardModule,
    InplaceModule,
    DragDropModule,
    TimelineModule
  ],
  exports : [
    ChipsModule,
    SidebarModule,
    ConfirmPopupModule,
    TreeTableModule,
    TreeModule,
    FieldsetModule,
    SplitterModule,
    SplitButtonModule,
    PanelModule,
    ScrollPanelModule,
    SkeletonModule,
    BreadcrumbModule,
    MenubarModule,
    StepsModule,
    ContextMenuModule,
    TieredMenuModule,
    TabMenuModule,
    MegaMenuModule,
    PanelMenuModule,
    ImageModule,
    GalleriaModule,
    ListboxModule,
    SelectButtonModule,
    ColorPickerModule,
    CascadeSelectModule,
    SliderModule,
    MultiSelectModule,
    ToggleButtonModule,
    DividerModule,
    AccordionModule,
    InputGroupAddonModule,
    InputGroupModule,
    ToolbarModule,
    RadioButtonModule,
    InputTextareaModule,
    DynamicDialogModule,
    ScrollTopModule,
    StyleClassModule,
    FormsModule,
    InputSwitchModule,
    KnobModule,
    InputNumberModule,
    TooltipModule,
    ConfirmDialogModule,
    CarouselModule,
    InputMaskModule,
    ProgressBarModule,
    TabViewModule,
    RatingModule,
    MessagesModule,
    TagModule,
    AvatarModule,
    DataViewModule,
    DropdownModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    RippleModule,
    ChipModule,
    FullCalendarModule,
    DialogModule,
    CalendarModule,
    ToastModule,
    EditorModule,
    OverlayPanelModule,
    BadgeModule,
    TableModule,
    MenuModule,
    ChartModule,
    CheckboxModule,
    AutoCompleteModule,
    AvatarGroupModule,
    PasswordModule,
    KeyFilterModule,
    ProgressSpinnerModule,
    BlockUIModule,
    FileUploadModule,
    ReactiveFormsModule,
    CardModule,
    InplaceModule,
    DragDropModule,
    TimelineModule,
  ]
})
export class PrimengModule { }
