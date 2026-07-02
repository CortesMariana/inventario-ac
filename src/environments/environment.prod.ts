export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "AIzaSyCoAIiN-x_MLJkqdvm45V3MSm2Xbeuk3e4",
    authDomain: "inventario-ac-one.firebaseapp.com",
    projectId: "inventario-ac-one",
    storageBucket: "inventario-ac-one.firebasestorage.app",
    messagingSenderId: "51868820734",
    appId: "1:51868820734:web:ed248858667954671cb1af"
  },
  collections: {
    usuarios:       '/usuarios',
    clientes:       '/clientes',
    productos:      '/productos',
    inventario:     '/inventario',
    mermas:         '/mermas',
    pedidos:        '/pedidos',
    entregas:       '/entregas',
    sucursales:     '/sucursales',
    transferencias: '/transferencias',
    almacenMovimientos: '/almacen-movimientos',
    pedidoContadores: '/pedido-contadores'
  },
  "styles": [
    "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
    "src/styles.css"
  ]
};
