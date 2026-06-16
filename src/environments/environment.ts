import cli from "@angular/cli";

export const environment = {
  //api:'http://localhost:5000/api/',
  //api: 'https://enersishrdev.azurewebsites.net/api/',
  api: 'https://enersishr.azurewebsites.net/api/',
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyA_kqJePZnxeNW6CKv8SXea9zE_kHf_Kbw",
    authDomain: "tickets-management-web-edb8d.firebaseapp.com",
    projectId: "tickets-management-web-edb8d",
    storageBucket: "tickets-management-web-edb8d.firebasestorage.app",
    messagingSenderId: "62863622122",
    appId: "1:62863622122:web:bda500a49b9739ad733c93"
  },
  googleMapsApiKey: 'AIzaSyA_kqJePZnxeNW6CKv8SXea9zE_kHf_Kbw',
  userinfoUri: 'https://accounts.enersis10.com/connect/userinfo',
  IDPConfig: {
    issuer: 'https://accounts.enersis10.com',
    scope: 'openid profile offline_access HrApi.AppHr',
    responseType: 'code',
    clientId: 'it-platform',
    dummyClientSecret: 'b0765561-c7ad-4264-aaea-0f9d50430aae',
    redirectUri: window.location.origin + '/',
    requestAccessToken: true,
    logoutUrl : window.location.origin + '/auth/login',
    postLogoutRedirectUri: window.location.origin + '/auth/login',
    useSilentRefresh: true,
  },
  collections: {
    permisos: '/permisos-dev',
    tickets: '/tickets-dev',
    recorridos: '/recorridos-dev',
    tecnicos: '/tecnicos-dev',
    contadores: '/contadores-dev',
    activos: '/activos-dev',
    categorias_activos: '/categorias_activos-dev',
    subalmacenes:'/subalmacenes-dev',
    insumos: '/insumos-dev',
    permisos_rh: '/permisos_rh-dev',
    solicitudes_rh: '/solicitudes_rh-dev',
    configuracion_campos_rh: '/configuracion_campos_rh-dev',
    tipos_solicitud_rh: 'tipos_solicitud_rh-dev',
    permisos_logistica: '/permisos_logistica-dev',
    vehiculos: '/vehiculos-dev',
    tipos_vehiculos: '/tipos_vehiculos',
    marcas_vehiculos:'/marcas_vehiculos',
    tickets_logistica: '/tickets-logistica-dev',
    cartas_responsiva_vehiculos: '/cartas_responsiva_vehiculos-dev',
    insumos_logistica: '/insumos_logistica-dev',
    contadores_folios: '/contadores_folios-dev'
  },
  "styles": [
  "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
  "src/styles.css"
]
};
