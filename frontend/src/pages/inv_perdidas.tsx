import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

type invPerdRow = {
  id_perdida: number;
  inv_prod_id: number;
  cantidad: number;
  motivo: string;
  fecha_reporte: string;
  unid_medida_id: number;
  user_id: number;
  origen: string;
  observaciones: string;
  nombre_user: string;
  nombre_producto: string;
  valor_unitario: number;
  nombre_lote: string;
  simbolo: string;
};

type invPerdResponse = {
  total_perdidas: number;
  page: number;
  page_size: number;
  perdidas: invPerdRow[];
};

type DateRangeState = {
  fecha_inicio: string;
  fecha_fin: string;
};

  const MotivosPerdida: Record<string, string> = {
    vencimiento: "Vencimiento",
    daño_fisico: "Dañado",
    extravio: "Extraviado",
    contaminacion: "Contaminación",
    robo: "Robo"
  };

  function formatearMotivo(value: string): string {
    return MotivosPerdida[value] || value;
  }

export default function InvPerd() {
  const [invPerd, setInvPerd] = useState<invPerdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeState>({ fecha_inicio: "", fecha_fin: "" });
  
  const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(
    null,
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Estado que requiere react-day-picker (usa objetos Date de JS)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: dateRange.fecha_inicio ? new Date(dateRange.fecha_inicio) : undefined,
    to: dateRange.fecha_fin ? new Date(dateRange.fecha_fin) : undefined,
  });

  // 3. Manejador del cambio de fecha en el calendario dual
  const handleSelectRange = (range: DateRange | undefined) => {
    setSelectedRange(range);

    // Convertimos los objetos Date a strings (YYYY-MM-DD) para el Backend
    const inicioStr = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
    const finStr = range?.to ? format(range.to, 'yyyy-MM-dd') : '';

    const newRange = { fecha_inicio: inicioStr, fecha_fin: finStr };
    setDateRange(newRange);

    // Si el usuario ya seleccionó ambas fechas, aplicamos el filtro y cerramos
    if (range?.from && range?.to) {
      setIsOpen(false);
      setError(null);
      setPage(1);
      setActiveDateRange(newRange);
    }
  };


  useEffect(() => {
    let isMounted = true;

    const loadPerdidas = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });

        const endpoint = activeDateRange
          ? (() => {
            queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
            queryParams.set("fecha_fin", activeDateRange.fecha_fin);
            return `inv_perdida/rango-fechas?${queryParams.toString()}`;
          })()
          : `inv_perdida/paginated-perdida?${queryParams.toString()}`;

        const data = (await apiFetch(endpoint)) as invPerdResponse;

        if (!isMounted) {
          return;
        }

        setInvPerd(Array.isArray(data?.perdidas) ? data.perdidas : []);
        setTotal(Number(data?.total_perdidas ?? 0));
      } catch (requestError: any) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError?.detail ||
          requestError?.message ||
          "No se pudieron cargar los datos de las perdidas.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPerdidas();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, activeDateRange]);

  const filteredInvperd = useMemo(() => {

    return invPerd.filter((inv_perd) => {
      return [
        inv_perd.nombre_producto,
        String(inv_perd.cantidad),
        formatearMotivo(inv_perd.motivo),
        inv_perd.nombre_user,
        inv_perd.fecha_reporte,
        inv_perd.observaciones,
        inv_perd.simbolo,
        inv_perd.origen,
        String(inv_perd.valor_unitario),
        inv_perd.nombre_lote,
      ]
        .join(" ")
        .toLowerCase()
    });
  }, [invPerd, activeDateRange]);

  const formatearFecha = (fechaString: string | number | Date) => {
    if (!fechaString) return "-";
    const fecha = new Date(fechaString);
    return fecha.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatearCantidad = (cantidad: number | string, simbolo?: string) => {
    const unidad = simbolo?.trim() || "-";
    return `${cantidad ?? 0} ${unidad}`;
  };

  const clearDateFilter = () => {
    setDateRange({ fecha_inicio: "", fecha_fin: "" });
    setActiveDateRange(null);
    setSelectedRange(undefined);
    setPage(1);
    setError(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

  const handleExportarPerdidas = async (formato: "pdf" | "excel") => {
    setDescargando(formato);
    try {
      const extension = formato === "pdf" ? "pdf" : "xlsx";
      await apiDownload(
        `inv_perdida/exportar/${formato}`,
        `reporte_perdidas.${extension}`,
      );
    } catch (err: any) {
      alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Inventario de perdidas" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ConPermiso accion="insertar">
              <Link
                to="/invPerd/create"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
              >
                Registrar pérdida
              </Link>
            </ConPermiso>
            <button
              onClick={() => handleExportarPerdidas("excel")}
              disabled={descargando !== null}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {descargando === "excel" ? "Descargando..." : "Exportar Excel"}
            </button>
            <button
              onClick={() => handleExportarPerdidas("pdf")}
              disabled={descargando !== null}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
            </button>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtrar por fechas:
            </label>

            {/* BOTÓN INTERACTIVO DEL CALENDARIO UNIFICADO */}
            <div className="relative w-full lg:w-64">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:gray-brand-800"
                aria-label="Seleccionar rango de fechas"
              >
                <span className="truncate">
                  {selectedRange?.from ? (
                    selectedRange.to ? (
                      <>
                        {format(selectedRange.from, 'dd LLL yyyy', { locale: es })} -{' '}
                        {format(selectedRange.to, 'dd LLL yyyy', { locale: es })}
                      </>
                    ) : (
                      format(selectedRange.from, 'dd LLL yyyy', { locale: es })
                    )
                  ) : (
                    <span className="text-gray-400">Seleccionar rango</span>
                  )}
                </span>
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </button>

              {/* POPOVER / POPUP DEL CALENDARIO DUAL (Se muestra al hacer clic) */}
              {isOpen && (
                <>
                  {/* Overlay para cerrar al hacer clic fuera */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                  />
                  <div className="absolute top-12 right-0 z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DayPicker
                      mode="range"
                      defaultMonth={selectedRange?.from || new Date()}
                      selected={selectedRange}
                      onSelect={handleSelectRange}
                      locale={es}
                      className="text-gray-800 dark:text-white/90"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Botón limpiar — visible solo cuando hay filtro activo */}
            {activeDateRange && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nombre producto
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Cantidad
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Valor unitario / Total
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Detalles de origen
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Lugar
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Observaciones
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Fecha reporte
                </th>
                <ConPermiso accion="actualizar">
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Acciones
                  </th>
                </ConPermiso>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-error-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredInvperd.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No hay registros de perdida para mostrar.
                  </td>
                </tr>
              ) : (
                filteredInvperd.map((inv_perd) => (
                  <tr
                    key={inv_perd.id_perdida}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {inv_perd.nombre_producto}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div
                        className="text-sm text-center text-gray-800 dark:text-gray-400"
                        title={formatearCantidad(
                          inv_perd.cantidad,
                          inv_perd.simbolo,
                        )}
                      >
                        {inv_perd.cantidad} {inv_perd.simbolo || "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>$ {inv_perd.valor_unitario} /</div>
                      <div>$ {inv_perd.valor_unitario * inv_perd.cantidad}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>Motivo: {formatearMotivo(inv_perd.motivo)}</div>
                      <div>Origen: {inv_perd.origen}</div>
                      <div>Registró: {inv_perd.nombre_user || "Sistema"}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-center text-gray-600 dark:text-gray-300">
                      <div>
                        {inv_perd.nombre_lote ? inv_perd.nombre_lote : "Otro"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>{inv_perd.observaciones || "Sin observaciones"}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-center text-gray-600 dark:text-gray-300">
                      <div> {formatearFecha(inv_perd.fecha_reporte)} </div>
                    </td>
                    <td className="px-5 py-4">
                      <ConPermiso accion="actualizar">
                        {inv_perd.motivo?.toLowerCase() === "vencimiento" ? (
                          <span className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500">
                            Vencido
                          </span>
                        ) : (
                          <Link
                            to={`/invPerd/edit/${inv_perd.id_perdida}`}
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                          >
                            Editar
                          </Link>
                        )}
                      </ConPermiso>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              disabled={page <= 1 || loading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.min(totalPages, currentPage + 1))
              }
              disabled={page >= totalPages || loading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
