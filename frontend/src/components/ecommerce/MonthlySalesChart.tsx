import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Esta gráfica muestra una gráfica de barras con el número de ventas por mes del año actual, 
// considerando solo las ventas que tienen al menos un detalle con estado "Vendido".
//Segunda gráfica que aparece en el dashboard, pero solo de produccion.

type VentaOut = {
  id_venta: number;
  fecha_venta: string;
};

type DetalleVentaOut = {
  venta_id: number;
  estado_venta: "Vendido" | "Separado" | "Anulado";
};

// Componente principal para mostrar la gráfica de ventas mensuales
export default function MonthlySalesChart() {
  const [ventasPorMes, setVentasPorMes] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadVentas = async () => {
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

        // IDs de ventas que tienen AL MENOS UN detalle con estado "Vendido"
        const ventasConVendido = new Set(
          detalles
            .filter((d) => d.estado_venta === "Vendido")
            .map((d) => d.venta_id)
        );

        // Contar solo esas ventas por mes del año actual
        const anioActual = new Date().getFullYear();
        const conteo = Array(12).fill(0);

        ventas.forEach((venta) => {
          if (!ventasConVendido.has(venta.id_venta)) return;

          const fecha = new Date(venta.fecha_venta);
          if (fecha.getFullYear() === anioActual) {
            conteo[fecha.getMonth()] += 1;
          }
        });

        if (mounted) setVentasPorMes(conteo);
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

  // Configuración de la gráfica de barras usando ApexCharts
  const options: ApexOptions = {
    colors: ["#007832"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: { text: undefined },
      labels: {
        formatter: (val: number) => Math.floor(val).toString(),
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: false },
      y: {
        formatter: (val: number) => `${val} ventas`,
      },
    },
  };

  // Definir la serie de datos para la gráfica, que representa las ventas por mes
  const series = [{ name: "Ventas", data: ventasPorMes }];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Ventas Mensuales
        </h3>
      </div>

      {loading && (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Cargando ventas...
        </p>
      )}

      {error && (
        <p className="py-4 text-center text-sm text-error-500">{error}</p>
      )}

      {!loading && !error && (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
            <Chart options={options} series={series} type="bar" height={180} />
          </div>
        </div>
      )}
    </div>
  );
}