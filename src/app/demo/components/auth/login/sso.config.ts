import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
    issuer: 'https://accounts.enersis10.com',
    // issuer: 'https://enersisidpdev.azurewebsites.net',
    scope: 'openid profile offline_access HrApi.AppHr',
    responseType: 'code',
    clientId: 'it-platform',
    dummyClientSecret : 'b0765561-c7ad-4264-aaea-0f9d50430aae',
    redirectUri: window.location.origin + '/',
    logoutUrl : window.location.origin + '/auth/login',
    requestAccessToken: true,
    postLogoutRedirectUri  : window.location.origin + '/auth/login',
    // useSilentRefresh: true,
    showDebugInformation: true,
    userinfoEndpoint: 'https://accounts.enersis10.com/connect/userinfo',
}