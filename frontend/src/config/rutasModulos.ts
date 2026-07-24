// Este archivo contiene la configuración de rutas y módulos para la aplicación. 
// Se define un objeto `rutasModulos` que mapea las rutas de la aplicación a sus nombres de módulo correspondientes. 
// Además, se proporciona una función `getModuloPorRuta` que permite obtener el nombre del módulo basado en la ruta actual.
export const rutasModulos: Record<string, string> = {
  "/users": "Usuarios",
  "/permisos": "Permisos",
  "/modulos": "Módulos",
  "/roles": "Roles",
  "/categorias": "Categorias",
  "/especies": "Especies",
  "/unidades": "Unidades de medida",
  "/tipos-insumos": "Tipo insumos",
  "/alimentos": "Alimento producción",
  "/lotesGranja": "Lotes granja",
  "/lotesProd": "Lotes de producción",
  "/mortalidad": "Mortalidad producción",
  "/tratamientos": "Tratamiento médico",
  "/maquinaria": "Maquinaria",
  "/invInsumo": "Insumos",
  "/invPerd": "Pérdidas",
  "/invProd": "Inventario de producción",
  "/comercializaciones": "Comercializacion",
  "/movimientos-comercio": "Movimientos comercialización",
  "/solicitud": "Solicitudes",
  "/solicitud-maq": "Solicitud de maquinaria",
  "/platos": "Platos",
  "/ingredientes": "Ingredientes",
  "/calendar": "Programacion",
  "/ventas": "Ventas",
  "/venta_platos": "Ventas de platos",
  "/detalle-ventas": "Detalle ventas",
};

// Función que recibe una ruta y devuelve el nombre del módulo correspondiente.
export function getModuloPorRuta(pathname: string): string | null {
  const match = Object.keys(rutasModulos)
    .filter((prefix) => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return match ? rutasModulos[match] : null;
}