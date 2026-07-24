import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';


type VentasLocationState = {
    refresh?: boolean;
    newVentaId?: number;
    selectVentaId?: number;
    newDetalleId?: number;
};

type VentaRow = {
    id_venta: number;
    nombre_comprador: string;
    id_comprador?: string | null;
    fecha_venta?: string;
    user_id?: number;
    nombre_user?: string;
    total_venta?: number | null;
};

type DetalleRow = {
    id_detalle_venta: number;
    cantidad: number;
    unid_medida_id: number;
    precio_venta: number;
    inv_prod_id: number;
    venta_id: number;
    estado_venta: string;
    cant_convertida?: number;
    nombre_producto?: string;
    nombre_comprador?: string;
    simbolo?: string;
};

type VentasResponse = {
    total: number;
    total_ventas?: number;
    page: number;
    page_size: number;
    ventas: VentaRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

const TABLE_COLUMNS = 10;

export default function VentasPage() {
    // se usa useLocation para obtener el estado de la ubicación, que puede contener información sobre la venta seleccionada o nueva
    const location = useLocation();
    const locationState = (location.state as VentasLocationState | null) ?? null;
    const [ventas, setVentas] = useState<VentaRow[]>([]);
    const [detalles, setDetalles] = useState<DetalleRow[]>([]);
    const [expandedVenta, setExpandedVenta] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [dateRange, setDateRange] = useState<DateRangeState>({ fecha_inicio: "", fecha_fin: ""});
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);

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

    // Debounce: espera 400ms después de que el usuario deja de escribir
    useEffect(() => {
        const timeoutId = setTimeout(() => { setDebouncedSearch(search); }, 400);
        return () => clearTimeout(timeoutId);
    }, [search]);

    // Cuando cambia el término de búsqueda (ya debounced), volvemos a la página 1
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construimos los parámetros de la URL para la paginación y búsqueda
                const queryParams = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });

                // Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    queryParams.set("search", debouncedSearch.trim());
                }

                const endpoint = activeDateRange
                    ? (() => {
                        queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
                        queryParams.set("fecha_fin", activeDateRange.fecha_fin);
                        return `ventas/rango-fechas?${queryParams.toString()}`;
                    })()
                    : `ventas/paginated-ventas?${queryParams.toString()}`;

                const data = (await apiFetch(endpoint)) as VentasResponse;

                const detallesData = await apiFetch("detalles-venta/all/detalles");

                if (!mounted) return;

                // Si hay filtro activo, `data` ya trae las ventas filtradas
                // Si no, `data` es el resultado paginado que también incluye `ventas`
                const ventasList = Array.isArray(data?.ventas)
                    ? data.ventas
                    : Array.isArray(data)
                        ? data
                        : [];

                const detallesList = Array.isArray(detallesData?.detalles)
                    ? detallesData.detalles
                    : Array.isArray(detallesData)
                        ? detallesData
                        : [];

                setVentas(ventasList);
                setDetalles(detallesList);
                setTotal(Number(data?.total ?? data?.total_ventas ?? 0));

                const ventaIdFromState = locationState?.newVentaId ?? locationState?.selectVentaId ?? null;
                if (ventaIdFromState) {
                    setExpandedVenta(ventaIdFromState);
                }
            } catch (err: any) {
                if (!mounted) return;
                setError(err?.detail || err?.message || "No se pudieron cargar las ventas");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [location.key, locationState?.refresh, locationState?.newVentaId, locationState?.selectVentaId, locationState?.newDetalleId, page, pageSize, activeDateRange, debouncedSearch]);

    // Función para obtener los detalles de una venta específica
    const getDetalles = (ventaId: number) =>
        detalles.filter((d) => d.venta_id === ventaId);

    // Función para alternar la expansión de los detalles de una venta
    const toggleExpanded = (ventaId: number) => {
        setExpandedVenta((prev) => (prev === ventaId ? null : ventaId));
    };

    // Función para limpiar el filtro de fechas
    const clearDateFilter = () => {
        setDateRange({ fecha_inicio: "", fecha_fin: "" });
        setActiveDateRange(null);
        setSelectedRange(undefined);
        setPage(1);
        setError(null);
    };

    // Calculamos el total de páginas basado en el total de ventas y el tamaño de página
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

    // Función para exportar ventas en PDF o Excel
    const handleExportarVentas = async (formato: "pdf" | "excel") => {
        setDescargando(formato);
        try {
            const extension = formato === "pdf" ? "pdf" : "xlsx";
            const filtro = activeDateRange
                ? `?fecha_inicio=${activeDateRange.fecha_inicio}&fecha_fin=${activeDateRange.fecha_fin}`
                : "";
            await apiDownload(
                `ventas/exportar/${formato}${filtro}`,
                `reporte_ventas.${extension}`,
            );
        } catch (err: any) {
            alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
        } finally {
            setDescargando(null);
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Historial de Ventas" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar ventas..."
                        className="h-10 w-60 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-500"
                    />
                    <button
                        onClick={() => handleExportarVentas("excel")}
                        disabled={descargando !== null}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        {descargando === "excel" ? "Descargando..." : "Exportar Excel"}
                    </button>
                    <button
                        onClick={() => handleExportarVentas("pdf")}
                        disabled={descargando !== null}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        {descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
                    </button>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filtrar por fechas:
                        </label>

                        {/* BOTÓN INTERACTIVO DEL CALENDARIO UNIFICADO */}
                        <div className="relative w-full lg:w-64">
                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm focus:ring-gray-500 text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:gray-brand-800"
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


                {/* Tabla de ventas */}
                <div className="overflow-x-auto px-5 pb-3">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando ventas...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Comprador</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Identificación</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    Array.from({ length: 10 }).map((_, index) => (
                                        <tr key={index}>
                                            <td colSpan={TABLE_COLUMNS} className="px-5 py-4">
                                                <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                                            </td>
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS} className="px-5 py-10 text-center text-sm text-error-500">
                                            {error}
                                        </td>
                                    </tr>
                                ) : ventas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay ventas registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    ventas.map((venta) => (
                                        <>
                                            <tr key={venta.id_venta} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">{venta.nombre_comprador}</td>
                                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{venta.id_comprador ?? "-"}</td>
                                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {venta.fecha_venta ? new Date(venta.fecha_venta).toLocaleDateString() : "-"}
                                                </td>
                                                <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                                    {venta.total_venta ? `$ ${venta.total_venta}` : "-"}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleExpanded(venta.id_venta)}
                                                        title="Ver detalles"
                                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${expandedVenta === venta.id_venta
                                                            ? "border-green-500 bg-brand-50 text-green-600 dark:border-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                                            }`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Fila expandible de detalles */}
                                            {expandedVenta === venta.id_venta && (
                                                <tr key={`detalles-${venta.id_venta}`}>
                                                    <td colSpan={5} className="bg-gray-50 px-6 py-4 dark:bg-white/[0.02]">
                                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                            Detalles de venta
                                                        </p>
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                            <thead>
                                                                <tr>
                                                                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</th>
                                                                    <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad</th>
                                                                    <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unidad</th>
                                                                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Precio</th>
                                                                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</th>
                                                                    <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                {getDetalles(venta.id_venta).length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={6} className="py-4 text-center text-sm text-gray-400">
                                                                            No hay detalles para esta venta.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    getDetalles(venta.id_venta).map((det) => (
                                                                        <tr key={det.id_detalle_venta}>
                                                                            <td className="py-3 text-sm text-gray-800 dark:text-white/90">{det.nombre_producto}</td>
                                                                            <td className="py-3 text-center text-sm text-gray-600 dark:text-gray-300">{det.cantidad}</td>
                                                                            <td className="py-3 text-center text-sm text-gray-600 dark:text-gray-300">{det.simbolo}</td>
                                                                            <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-300">$ {det.precio_venta}</td>
                                                                            <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-300">$ {det.precio_venta * det.cantidad}</td>
                                                                            <td className="py-3 text-center text-sm text-gray-600 dark:text-gray-300">{det.estado_venta}</td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-center">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
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
                            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
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
