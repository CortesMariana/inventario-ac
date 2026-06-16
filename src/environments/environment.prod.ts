export const environment = {
  api: 'https://enersishr.azurewebsites.net/api/',
  production: true,
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
    permisos: '/permisos',
    tickets: '/tickets',
    recorridos: '/recorridos',
    tecnicos: '/tecnicos',
    contadores: '/contadores',
    activos: '/activos',
    categorias_activos: '/categorias_activos',
    subalmacenes:'/subalmacenes',
    insumos: '/insumos',
    permisos_rh: '/permisos_rh',
    solicitudes_rh: '/solicitudes_rh',
    configuracion_campos_rh: '/configuracion_campos_rh',
    tipos_solicitud_rh: 'tipos_solicitud_rh',
    permisos_logistica: '/permisos_logistica',
    vehiculos: '/vehiculos',
    tipos_vehiculos: '/tipos_vehiculos',
    marcas_vehiculos:'/marcas_vehiculos',
    tickets_logistica: '/tickets-logistica',
    cartas_responsiva_vehiculos: '/cartas_responsiva_vehiculos',
    insumos_logistica: '/insumos_logistica',
    contadores_folios: '/contadores_folios'
  },
  "styles": [
  "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
  "src/styles.css"
]
};
