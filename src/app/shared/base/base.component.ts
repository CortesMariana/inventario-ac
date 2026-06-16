import { Component } from '@angular/core';
// import { ApiService } from 'src/app/Services';
// import { AlertModel } from 'src/app/models/shared/alert.model';
// import { ApiModel } from 'src/app/models/api/api.model';
import { lastValueFrom } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { Message, MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
// import { environment } from 'src/environments/environments';
interface KeyParams {
    [key: string]: any;
}

@Component({
    template: '',
})

export class BaseComponent {
    /** Parámetros del servicio  */
    public alertConfig: Message = {
        severity: 'success',
        summary: 'Ups!',
        detail: 'Algo salió mal al consultar el servicio',
        life: 3000,
        sticky: false,
        closable: true,
        icon: 'pi pi-exclamation-triangle',
        closeIcon: 'pi pi-times',
    }
    private paramsValue: KeyParams = {};
    params = {
        get: this.paramsValue,
        post: this.paramsValue,
    };
    loading = false;
    // alertConfig = new AlertModel.AlertaClass(
    //     false,
    //     'Ha ocurrido un error',
    //     AlertModel.AlertSeverity.ERROR
    // );
    formGroup: FormGroup = new FormGroup({});
    // host = environment.api;
    constructor(
        protected messageService: MessageService,
        // protected apiService: ApiService<GET, POST, PUT, PATCH, DELETE>,
    ) {
    }

    // public getService(payload: ApiModel.ReqParams) {
    //     this.loading = true;
    //     const params = {
    //         url: payload.url,
    //         data: payload.data ? payload.data : {},
    //     };
    //     // return this.apiService.getService(params);
    // }


    // public create(payload: ApiModel.ReqParams) {
    //     return this.createService(payload).subscribe({
    //         next: () => {
    //             this.openAlert();
    //         },

    //         error: (err: any) => {
    //             if (err.status >= 400 && err.status < 499) {
    //                 if (err.status === 401) {
    //                     this.alertConfiguration('WARNING', '');
    //                 } else {
    //                     this.alertConfiguration('WARNING', err);
    //                 }
    //             } else {
    //                 this.alertConfiguration('WARNING', 'Servicio no disponible intente mas tarde.')
    //             }
    //             this.openAlert();
    //             this.loading = false;
    //         },
    //         complete: () => {
    //             this.loading = false;
    //         },
    //     });
    // }

    // public update(payload: ApiModel.ReqParams) {
    //     return this.updateService(payload).subscribe({
    //         next: () => {
    //             this.openAlert();
    //         },

    //         error: (err: any) => {
    //             if (err.status >= 400 && err.status < 499) {
    //                 if (err.status === 401) {
    //                     this.alertConfiguration('WARNING', '');
    //                 } else {
    //                     this.alertConfiguration('WARNING', err);
    //                 }
    //             } else {
    //                 this.alertConfiguration('WARNING', 'Servicio no disponible intente mas tarde.')
    //             }
    //             this.openAlert();
    //             this.loading = false;
    //         },
    //         complete: () => {
    //             this.loading = false;
    //         },
    //     });
    // }

    // public createService(payload: ApiModel.ReqParams) {
    //     this.loading = true;
    //     const params = {
    //         url: payload.url,
    //         data: payload.data,
    //         params: payload.params,
    //     };
    //     // return this.apiService.postService(params);
    // }

    // public updateService(payload: ApiModel.ReqParams) {
    //     this.loading = true;
    //     const params = {
    //         url: payload.url,
    //         data: payload.data,
    //         params: payload.params,
    //     };
    //     // return this.apiService.putService(params);
    // }

    // public read(payload: ApiModel.ReqParams) {
    //     return this.getService(payload).subscribe({
    //         next: () => {
    //         },
    //         error: () => {
    //             this.loading = false;
    //         },
    //         complete: () => {
    //             this.loading = false;
    //         },
    //     });
    // }



    // public delete(payload: ApiModel.ReqParams) {
    //     this.loading = true;
    //     const params = {
    //         url: payload.url,
    //         data: payload.data ? payload.data : {},
    //     };

    //     return this.apiService.deleteService(params).subscribe({
    //         next: () => {
    //             this.openAlert();
    //         },
    //         error: err => {
    //             this.alertConfiguration('WARNING', err);
    //             this.openAlert();
    //             this.loading = false;
    //         },
    //         complete: () => {
    //             this.loading = false;
    //         },
    //     });
    // }


    // public async searchAsync(payload: ApiModel.ReqParams) {
    //     const request = {
    //         params: payload.params,
    //         url: payload.url,
    //     };
    //     return lastValueFrom(this.apiService.getService(request));
    // }

    // public async searchArrAsync(payload: ApiModel.ReqParams) {
    //     const request = {
    //         params: payload.params,
    //         url: payload.url,
    //     };
    //     return lastValueFrom(this.apiService.getListService(request));
    // }


    // public alertConfiguration(severity: 'ERROR' | 'SUCCESS' | 'WARNING', msg: string) {
    //     this.alertConfig.severity = AlertModel.AlertSeverity[severity];
    //     this.alertConfig.singleMessage = msg;
    // }

    // public openAlert() {
    //     this.alertConfig.open = true;
    // }

    // public closeAlert() {
    //     this.alertConfig.open = false;
    // }

    resetForm() {
        this.formGroup.reset();
    }

    public marcarCamposInvalidos(form: FormGroup) {
        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            control?.markAllAsTouched();
            control?.markAsDirty();
            if (control instanceof FormGroup) {
                this.marcarCamposInvalidos(control);
            }
        });
    }

    public handleErrorConsulta(alert?: Message) {
        if (alert) {
            this.alertConfig.severity = alert.severity;
            this.alertConfig.summary = alert.summary;
            this.alertConfig.detail = alert.detail;
        }
        this.messageService.add(this.alertConfig);
    }

    public handleAlertType(type?: 'ERROR' | 'SUCCESS' | 'WARNING' | null, detail?: string, summary?: string) {
        switch (type) {
            case 'ERROR':
                this.alertConfig.severity = 'error';
                this.alertConfig.summary = summary ? summary : 'Error';
                this.alertConfig.icon = 'pi pi-times-circle';
                break;
            case 'SUCCESS':
                this.alertConfig.severity = 'success';
                this.alertConfig.summary = summary ? summary : 'Acción exitosa';
                this.alertConfig.icon = 'pi pi-check';
                break;
            case 'WARNING':
                this.alertConfig.severity = 'warn';
                this.alertConfig.summary = summary ? summary : 'Algo salió mal';
                this.alertConfig.icon = 'pi pi-exclamation-triangle';
                break;
            default:
                this.alertConfig.severity = 'info';
                this.alertConfig.summary = summary ? summary : 'Información';
                break;
        }
        this.alertConfig.detail = detail;
        this.alertConfig.life = 4000;
        this.alertConfig.sticky = false;
        this.alertConfig.closable = true;
        this.messageService.add(this.alertConfig);
    }

    // trackByFn(index: number) {
    //     return index;
    // }

}
