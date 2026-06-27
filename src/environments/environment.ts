export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyCoAIiN-x_MLJkqdvm45V3MSm2Xbeuk3e4",
    authDomain: "inventario-ac-one.firebaseapp.com",
    projectId: "inventario-ac-one",
    storageBucket: "inventario-ac-one.firebasestorage.app",
    messagingSenderId: "51868820734",
    appId: "1:51868820734:web:ed248858667954671cb1af"
  },
  collections: {
    usuarios:   '/usuarios-dev',
    clientes:   '/clientes-dev',
    productos:  '/productos-dev',
    inventario: '/inventario-dev',
    pedidos:    '/pedidos-dev',
    entregas:   '/entregas-dev',
    sucursales: '/sucursales-dev',
    transferencias: '/transferencias-dev',
    almacenMovimientos: '/almacen-movimientos-dev'
  },
  "styles": [
    "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
    "src/styles.css"
  ]
};
