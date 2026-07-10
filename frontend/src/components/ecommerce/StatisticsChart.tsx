"use client";

import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

interface ProduccionItem {
  fecha_ingreso: string;
  cantidad: number;
  valor_unitario: number;
}

interface PerdidaItem {
  fecha_reporte: string;
  cantidad: number;
  valor_unitario?: number | null;
}

interface PaginatedResponse {
  page: number;
  page_size: number;
  total_pages: number;
  [key: string]: any;
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

async function fetchTodasLasPaginas<T>(
  endpoint: string,
  itemsKey: string
): Promise<T[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const items: T[] = [];

  do {
    const data: PaginatedResponse = await apiFetch(
      `${endpoint}&page=${page}&page_size=${pageSize}`
    );
    items.push(...(data[itemsKey] || []));
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

function agruparValorPorMes(
  items: { fecha: string; cantidad: number; valor_unitario?: number | null }[]
): number[] {
  const totales = new Array(12).fill(0);
  items.forEach(({ fecha, cantidad, valor_unitario }) => {
    const mes = new Date(fecha).getMonth();
    const valorTotal = (valor_unitario ?? 0) * cantidad;
    totales[mes] += valorTotal;
  });
  return totales;
}

export default function StatisticsChart() {
  const [seriesData, setSeriesData] = useState<{ name: string; data: number[] }[]>([
    { name: "Valor producción", data: new Array(12).fill(0) },
    { name: "Valor pérdidas", data: new Array(12).fill(0) },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);

      const anioActual = new Date().getFullYear();
      const fechaInicio = `${anioActual}-01-01`;
      const fechaFin = `${anioActual}-12-31`;

      try {
        const [produccion, perdidas] = await Promise.all([
          fetchTodasLasPaginas<ProduccionItem>(
            `inv_produccion/rango-fechas?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            "produccion"
          ).catch((err: any) => {
            if (err?.status === 404) return [];
            throw err;
          }),
          fetchTodasLasPaginas<PerdidaItem>(
            `inv_perdida/rango-fechas?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&origen=produccion`,
            "perdidas"
          ).catch((err: any) => {
            if (err?.status === 404) return [];
            throw err;
          }),
        ]);

        const valorProduccionPorMes = agruparValorPorMes(
          produccion.map((p) => ({
            fecha: p.fecha_ingreso,
            cantidad: p.cantidad,
            valor_unitario: p.valor_unitario,
          }))
        );
        const valorPerdidasPorMes = agruparValorPorMes(
          perdidas.map((p) => ({
            fecha: p.fecha_reporte,
            cantidad: p.cantidad,
            valor_unitario: p.valor_unitario,
          }))
        );

        setSeriesData([
          { name: "Valor producción", data: valorProduccionPorMes },
          { name: "Valor pérdidas", data: valorPerdidasPorMes },
        ]);
      } catch (err: any) {
        setError(err?.detail || "Error al cargar los datos de la gráfica");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#007832", "#F04438"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.55, opacityTo: 0 },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => formatoCOP.format(value),
      },
    },
    xaxis: {
      type: "category",
      categories: MESES,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (value: number) => formatoCOP.format(value),
      },
      title: { text: "", style: { fontSize: "0px" } },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Valor de Producción vs Pérdidas
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Comparativo mensual en pesos (COP) del año {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {loading ? (
            <div className="flex h-[310px] items-center justify-center text-gray-400">
              Cargando datos...
            </div>
          ) : error ? (
            <div className="flex h-[310px] items-center justify-center text-red-500">
              {error}
            </div>
          ) : (
            <Chart options={options} series={seriesData} type="area" height={310} />
          )}
        </div>
      </div>
    </div>
  );
}