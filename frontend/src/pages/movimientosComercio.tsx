import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type MovimientosLocationState = {
    refresh?: boolean;
    newComercializacionId?: number;
};

type ComercializacionRow = {
    id_comercializacion: number;
    producto_id: number;
    nombre_producto?: string;
    lote_id?: number | null;
    sublote?: string | null;
    fecha_comercializacion?: string;
    fecha_vencimiento?: string | null;
    cantidad: number;
    unid_medida_id: number;
    simbolo?: string;
    cant_convertida?: number;
    cant_no_vendida?: number | null;
    lugar_comercializacion?: string;
    observacion?: string | null;
    user_id?: number;
    nombre_user?: string;
    vendio_todo: boolean;
};

type ComercializacionesResponse = {
    total: number;
    total_comercializaciones: number;
    page: number;
    page_size: number;
    comercializaciones: ComercializacionRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

const TABLE_COLUMNS = 6;

export default function MovimientosComercioPage() {
    const location = useLocation();
    const locationState = (location.state as MovimientosLocationState | null) ?? null;

    const [movimientos, setMovimientos] = useState<ComercializacionRow[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [soloDisponibles, setSoloDisponibles] = useState(false);

    const [dateRange, setDateRange] = useState<DateRangeState>({
        fecha_inicio: "",
        fecha_fin: "",
    });
    const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    // Estado que requiere react-day-picker (usa objetos Date de JS)
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
        from: dateRange.fecha_inicio ? new Date(dateRange.fecha_inicio) : undefined,
        to: dateRange.fecha_fin ? new Date(dateRange.fecha_fin) : undefined,
    });

    const handleSelectRange = (range: DateRange | undefined) => {
        setSelectedRange(range);

        const inicioStr = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
        const finStr = range?.to ? format(range.to, 'yyyy-MM-dd') : '';

        const newRange = { fecha_inicio: inicioStr, fecha_fin: finStr };
        setDateRange(newRange);

        if (range?.from && range?.to) {
            setIsOpen(false);
            setError(null);
            setPage(1);
            setActiveDateRange(newRange);
        }
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                let data: ComercializacionesResponse | ComercializacionRow[];

                if (soloDisponibles) {
                    // Endpoint sin paginación: trae solo productos con stock disponible
                    data = await apiFetch("comercio/disponibles");
                } else if (activeDateRange) {
                    const queryParams = new URLSearchParams({
                        fecha_inicio: activeDateRange.fecha_inicio,
                        fecha_fin: activeDateRange.fecha_fin,
                    });
                    data = await apiFetch(`comercio/rango-fechas?${queryParams.toString()}`);
                } else {
                    const queryParams = new URLSearchParams({
                        skip: String((page - 1) * pageSize),
                        limit: String(pageSize),
                    });
                    data = await apiFetch(`comercio/paginated-comercializaciones?${queryParams.toString()}`);
                }

                if (!mounted) return;

                const movimientosList = Array.isArray(data)
                    ? data
                    : Array.isArray((data as ComercializacionesResponse)?.comercializaciones)
                        ? (data as ComercializacionesResponse).comercializaciones
                        : [];

                setMovimientos(movimientosList);
                setTotal(
                    Array.isArray(data)
                        ? movimientosList.length
                        : Number((data as ComercializacionesResponse)?.total_comercializaciones ?? movimientosList.length)
                );

                if (locationState?.newComercializacionId) {
                    setExpandedId(locationState.newComercializacionId);
                }
            } catch (err: any) {
                if (!mounted) return;
                setError(err?.detail || err?.message || "No se pudieron cargar los movimientos de comercialización");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [location.key, locationState?.refresh, locationState?.newComercializacionId, page, pageSize, activeDateRange, soloDisponibles]);

    const filteredMovimientos = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return movimientos;
        return movimientos.filter((m) =>
            [
                String(m.id_comercializacion),
                m.nombre_producto || "",
                m.lugar_comercializacion || "",
                m.nombre_user || "",
                m.sublote || "",
                m.fecha_comercializacion || "",
            ]
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [movimientos, search]);

    const toggleExpanded = (id: number) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const applyDateFilter = () => {
        if (!dateRange.fecha_inicio || !dateRange.fecha_fin) {
            setError("Debes seleccionar fecha inicial y fecha final para filtrar.");
            return;
        }

        if (dateRange.fecha_inicio > dateRange.fecha_fin) {
            setError("La fecha inicial no puede ser mayor que la fecha final.");
            return;
        }

        setError(null);
        setPage(1);
        setActiveDateRange({ ...dateRange });
    };

    const clearDateFilter = () => {
        setDateRange({ fecha_inicio: "", fecha_fin: "" });
        setActiveDateRange(null);
        setSelectedRange(undefined);
        setPage(1);
        setError(null);
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const [actualizandoId, setActualizandoId] = useState<number | null>(null);

    const handleToggleVendioTodo = async (mov: ComercializacionRow) => {
        setActualizandoId(mov.id_comercializacion);
        const nuevoEstado = !mov.vendio_todo;
        try {
            await apiFetch(`comercio/${mov.id_comercializacion}/vendio-todo`, {
                method: "PATCH",
                body: JSON.stringify({ vendio_todo: nuevoEstado }),
            });
            setMovimientos((prev) =>
                prev.map((m) =>
                    m.id_comercializacion === mov.id_comercializacion
                        ? { ...m, vendio_todo: nuevoEstado }
                        : m
                )
            );
        } catch (err: any) {
            alert(err?.detail || err?.message || "No se pudo actualizar el estado de venta.");
        } finally {
            setActualizandoId(null);
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Movimientos de Comercialización" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar movimientos..."
                        className="h-10 w-60 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-500"
                    />

                    <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={soloDisponibles}
                            onChange={(e) => {
                                setSoloDisponibles(e.target.checked);
                                setPage(1);
                                setActiveDateRange(null);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Solo con producto disponible
                    </label>

                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filtrar por fechas:
                        </label>

                        <div className="relative w-full lg:w-64">
                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                disabled={soloDisponibles}
                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm focus:ring-gray-500 text-gray-800 outline-none focus:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white/90 dark:focus:gray-brand-800"
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

                            {isOpen && (
                                <>
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

                {/* Tabla de movimientos */}
                <div className="overflow-x-auto px-5 pb-3">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando movimientos...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha comercialización</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lugar</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vendió todo</th>
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
                                ) : filteredMovimientos.length === 0 ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay movimientos de comercialización registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMovimientos.map((mov) => (
                                        <>
                                            <tr key={mov.id_comercializacion} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                                                    {mov.nombre_producto}
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                    {mov.fecha_comercializacion ? new Date(mov.fecha_comercializacion).toLocaleDateString() : "-"}
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                    {mov.cantidad} {mov.simbolo}
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                    {mov.lugar_comercializacion || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleVendioTodo(mov)}
                                                        disabled={actualizandoId === mov.id_comercializacion}
                                                        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${mov.vendio_todo
                                                            ? "border-green-500 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                            : "border-amber-400 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                                            }`}
                                                        title="Cambiar estado de venta"
                                                    >
                                                        {actualizandoId === mov.id_comercializacion
                                                            ? "..."
                                                            : mov.vendio_todo ? "Sí" : "No"}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleExpanded(mov.id_comercializacion)}
                                                        title="Ver detalles"
                                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${expandedId === mov.id_comercializacion
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
                                            {expandedId === mov.id_comercializacion && (
                                                <tr key={`detalles-${mov.id_comercializacion}`}>
                                                    <td colSpan={TABLE_COLUMNS} className="bg-gray-50 px-6 py-4 dark:bg-white/[0.02]">
                                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                            Detalle del movimiento
                                                        </p>
                                                        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                                                            <div>
                                                                <dt className="text-xs text-gray-400">Cantidad Inicial</dt>
                                                                <dd className="text-sm text-gray-700 dark:text-gray-200">
                                                                    {mov.cant_convertida ?? "-"}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-400">Cantidad no vendida</dt>
                                                                <dd className="text-sm text-gray-700 dark:text-gray-200">
                                                                    {mov.cant_no_vendida ?? "-"}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-400">Fecha de vencimiento</dt>
                                                                <dd className="text-sm text-gray-700 dark:text-gray-200">
                                                                    {mov.fecha_vencimiento ? new Date(mov.fecha_vencimiento).toLocaleDateString() : "-"}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-400">Registrado por</dt>
                                                                <dd className="text-sm text-gray-700 dark:text-gray-200">
                                                                    {mov.nombre_user || "-"}
                                                                </dd>
                                                            </div>
                                                            <div className="sm:col-span-2 lg:col-span-3">
                                                                <dt className="text-xs text-gray-400">Observación</dt>
                                                                <dd className="text-sm text-gray-700 dark:text-gray-200">
                                                                    {mov.observacion || "-"}
                                                                </dd>
                                                            </div>
                                                        </dl>
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

                {!soloDisponibles && !activeDateRange && (
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
                )}
            </div>
        </>
    );
}
