import { useEffect, useState } from "react";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

import {
  ArrowDownIcon,
  DollarLineIcon as DollarIcon,
  TrashBinIcon,
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

type PerdidaOut = {
  id_perdida: number;
  inv_prod_id: number;
  cantidad: number;
  origen: string;
  fecha_reporte: string;
  valor_unitario?: number | null;
};

export default function EcommerceMetrics() {
  const [totalMensual, setTotalMensual] = useState<number>(0);
  const [totalPerdidas, setTotalPerdidas] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mesActual = new Date().toLocaleDateString("es-CO", {
    month: "long",
  });

  useEffect(() => {
    let mounted = true;

    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ventasResult, detallesResult, perdidasResult] = await Promise.allSettled([
          apiFetch("ventas/all/ventas"),
          apiFetch("detalles-venta/all/detalles"),
          apiFetch("inv_perdida/all/perdidas"),
        ]);

        if (!mounted) return;

        const ventasData = ventasResult.status === "fulfilled" ? ventasResult.value : [];
        const detallesData = detallesResult.status === "fulfilled" ? detallesResult.value : [];
        const perdidasData = perdidasResult.status === "fulfilled" ? perdidasResult.value : [];

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

        const ventasConVendido = new Set(
          detalles
            .filter((d) => d.estado_venta === "Vendido")
            .map((d) => d.venta_id)
        );

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

        const perdidas: PerdidaOut[] = Array.isArray(perdidasData?.perdidas)
          ? perdidasData.perdidas
          : Array.isArray(perdidasData)
          ? perdidasData
          : [];

        // Comparar "YYYY-MM" como string evita el desfase UTC vs Colombia (UTC-5)
        const mesAnioActual = `${anioActual}-${String(mesActual + 1).padStart(2, "0")}`;

        const totalPerdidasMes = perdidas
          .filter((p) => p.fecha_reporte?.slice(0, 7) === mesAnioActual && p.origen === "produccion")
          .reduce((acc, p) => acc + p.cantidad * (p.valor_unitario ?? 0), 0);

        if (mounted) {
          setTotalMensual(total);
          setTotalPerdidas(totalPerdidasMes);
        }
      } catch (err) {
        console.error("Error al cargar métricas de ecommerce:", err);
        if (mounted) {
          setError("No se pudieron cargar las métricas.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  const totalFormateado = totalMensual.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const perdidasFormateado = totalPerdidas.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const porcentajePerdida =
    totalMensual > 0
      ? ((totalPerdidas / totalMensual) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Ventas mensuales — sin cambios */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <DollarIcon className="text-green-600 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ventas Mensuales ({mesActual})
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "Cargando..." : `$${totalFormateado}`}
            </h4>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-xs text-error-500">
            {error}
          </p>
        )}
      </div>

      {/* Pérdidas mensuales — funcionalidad nueva */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <TrashBinIcon className="text-red-600 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Pérdidas ({mesActual})
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "Cargando..." : `$${perdidasFormateado}`}
            </h4>
          </div>
          <Badge color="error">
            <ArrowDownIcon />
              {loading ? "..." : `${porcentajePerdida}%`}
            </Badge>
        </div>
      </div>
    </div>
  );
}
