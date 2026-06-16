import { ErrorHandler, NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppLayoutModule } from './layout/app.layout.module';
import { PrimengModule } from './primeng/primeng.module';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CookieService } from 'ngx-cookie-service';
import { PipesModule } from './pipes/pipes.module';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { environment } from 'src/environments/environment';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ErrorsService } from './shared/service/errors.service';
import { GlobalErrorHandler } from './shared/service/global-error.service';
import { OAuthModule } from 'angular-oauth2-oidc';
import { FirestoreConnectionService } from './shared/service/firestore-connection.service';
import { FullCalendarModule } from '@fullcalendar/angular';

@NgModule({
    declarations: [AppComponent],
    imports: [
        OAuthModule.forRoot({
            resourceServer: {
                allowedUrls: ['https://accounts.enersis10.com'],
                sendAccessToken: true
            }
        }),
        AppRoutingModule,
        AppLayoutModule,
        PrimengModule,
        PipesModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FullCalendarModule
    ],
    providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        MessageService,
        ConfirmationService,
        CookieService,
        provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
        provideFirestore(() => getFirestore()),
        // provideDatabase(() => getDatabase()),
        // provideAuth(() => getAuth()),
        // provideMessaging(() => getMessaging()),
        provideStorage(() => getStorage()),
        { provide: HTTP_INTERCEPTORS, useClass: ErrorsService, multi: true },
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        FirestoreConnectionService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }