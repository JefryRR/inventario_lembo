import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// En esta tabla se muestran las últimas 5 ventas registradas en el sistema, con información del producto, 
// comprador, cantidad, precio unitario y estado de la venta (La tercera gráfica del dashboard).

// Definición de la interfaz para representar los detalles de venta
interface DetalleVenta {
  id_detalle_venta: number;
  nombre_producto: string;
  nombre_comprador: string;
  cantidad: number;
  simbolo: string;
  precio_venta: number;
  estado_venta: "Vendido" | "Separado" | "Anulado";
}

// Componente principal para mostrar las ventas recientes
export default function RecentOrders() {
  const [ventas, setVentas] = useState<DetalleVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadVentas = async () => {
      setLoading(true);
      try {
        const data = await apiFetch("detalles-venta/all/detalles");

        if (!mounted) return;

        const lista = Array.isArray(data?.detalles)
          ? data.detalles
          : Array.isArray(data)
          ? data
          : [];

        // Toma solo las últimas 5
        const ultimas5 = lista
          .sort((a: DetalleVenta, b: DetalleVenta) => b.id_detalle_venta - a.id_detalle_venta)
          .slice(0, 5);
        setVentas(ultimas5);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Error al cargar las ventas");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadVentas();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Ventas Recientes
          </h3>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        {loading && (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Cargando ventas...
          </p>
        )}

        {error && (
          <p className="py-4 text-center text-sm text-error-500">{error}</p>
        )}

        {!loading && !error && (
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Producto
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Comprador
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Cantidad
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Precio unitario
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Estado
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ventas.map((venta) => (
                <TableRow key={venta.id_detalle_venta}>
                  <TableCell className="py-3">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {venta.nombre_producto}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {venta.nombre_comprador}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {venta.cantidad ?? venta.cantidad} {venta.simbolo}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    ${venta.precio_venta.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      size="sm"
                      color={
                        venta.estado_venta === "Vendido"
                          ? "success"
                          : venta.estado_venta === "Separado"
                          ? "warning"
                          : "error"
                      }
                    >
                      {venta.estado_venta}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {ventas.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay ventas registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}