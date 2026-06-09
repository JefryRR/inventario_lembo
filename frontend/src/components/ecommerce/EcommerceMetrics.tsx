import { useEffect, useState } from "react";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  DollarLineIcon as DollarIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";

type VentaOut = {
  id_venta: number;
  fecha_venta: string;
  total_venta: number | null;
};

type DetalleVentaOut = {
  venta_id: number;
  estado_venta: "Vendido" | "Separado" | "Anulado";
};

export default function EcommerceMetrics() {
  const [totalMensual, setTotalMensual] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadMetrics = async () => {
      setLoading(true);
      try {
        const [ventasData, detallesData] = await Promise.all([
          apiFetch("ventas/all/ventas"),
          apiFetch("detalles-venta/all/detalles"),
        ]);

        if (!mounted) return;

        const ventas: VentaOut[] = Array.isArray(ventasData?.ventas)
          ? ventasData.ventas
          : Array.isArray(ventasData)
          ? ventasData
          : [];

        const detalles: DetalleVentaOut[] = Array.isArray(detallesData?.detalles)
          ? detallesData.detalles
          : Array.isArray(detallesData)
          ? detallesData
          : [];

        // IDs de ventas con al menos un detalle "Vendido"
        const ventasConVendido = new Set(
          detalles
            .filter((d) => d.estado_venta === "Vendido")
            .map((d) => d.venta_id)
        );

        // Filtrar ventas del mes y año actual con estado Vendido
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anioActual = ahora.getFullYear();

        const total = ventas
          .filter((venta) => {
            if (!ventasConVendido.has(venta.id_venta)) return false;
            const fecha = new Date(venta.fecha_venta);
            return (
              fecha.getMonth() === mesActual &&
              fecha.getFullYear() === anioActual
            );
          })
          .reduce((acc, venta) => acc + (venta.total_venta ?? 0), 0);

        if (mounted) setTotalMensual(total);
      } catch (err) {
        console.error("Error al cargar métricas:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  // Formatea el número con separadores de miles y 2 decimales
  const totalFormateado = totalMensual.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <DollarIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ventas Mensuales
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "Cargando..." : `$${totalFormateado}`}
            </h4>
          </div>
        </div>
      </div>
      {/* <!-- Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Pérdidas
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                5,359
              </h4>
            </div>

            <Badge color="error">
              <ArrowDownIcon />
              9.05%
            </Badge>
          </div>
        </div>
        {/* <!-- Metric Item End --> */}
    </div>
  );
}
