import { useEffect, useState } from "react";
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

type invProdRow = {
    id_inventario: number,
    nombre_producto: string,
    cantidad: number,
    unid_medida_id: number,
    fecha_ingreso: string,
    fecha_vencimiento: string,
    lote_id: number,
    valor_unitario: number,
    nombre_lote: string,
    categoria_id: number,
    especie_id: number,
    nombre_categoria: string,
    nombre_especie: string,
    nivel_alerta: string,
    simbolo: string
};

type invProdResponse = {
    total: number;
    total_produccion?: number;
    page: number;
    page_size: number;
    produccion: invProdRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

function isEditDisabled(cantidad: number, alerta: string | undefined): boolean {
    if (alerta?.toLowerCase().includes("vencido")) return true;
    if (cantidad <= 0) return true;
    return false;
}

const TABLE_COLUMNS = 10;

export default function Inv_prod() {
    const [invProd, setInvProd] = useState<invProdRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState<DateRangeState>({fecha_inicio: "", fecha_fin: "",});
    const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);
    const [estadoFiltro, setEstadoFiltro] = useState< "vencido" | "sin_stock" | "critico" | "urgente" | "vigente" | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
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
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [search]);

    // Cuando cambia el término de búsqueda (ya debounced), volvemos a la página 1
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        let isMounted = true;

        const loadInv_prod = async () => {
            setLoading(true);
            setError(null);

            try {
                const queryParams = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });

                // Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    queryParams.set("search", debouncedSearch.trim());
                }

                let endpoint;

                if (activeDateRange) {
                    queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
                    queryParams.set("fecha_fin", activeDateRange.fecha_fin);
                    endpoint = `inv_produccion/rango-fechas?${queryParams.toString()}`;
                } else if (estadoFiltro) {
                    queryParams.set("estado", estadoFiltro);
                    endpoint = `inv_produccion/paginated-production?${queryParams.toString()}`;
                    // ajusta el nombre del endpoint/parámetro al que ya exista en tu backend
                } else {
                    endpoint = `inv_produccion/paginated-production?${queryParams.toString()}`;
                }

                const data = (await apiFetch(endpoint)) as invProdResponse;

                if (!isMounted) {
                    return;
                }

                setInvProd(Array.isArray(data?.produccion) ? data.produccion : []);
                setTotal(Number(data?.total ?? data?.total_produccion ?? 0));
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los datos de producción."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadInv_prod();

        return () => {
            isMounted = false;
        };
    }, [page, pageSize, activeDateRange, estadoFiltro, debouncedSearch]);


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

    const SoloFecha = (fechaString: string | number | Date) => {
        if (!fechaString) return "-";
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
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

    const handleExportarProduccion = async (formato: "pdf" | "excel") => {
        setDescargando(formato);
        try {
            const extension = formato === "pdf" ? "pdf" : "xlsx";
            await apiDownload(
                `inv_produccion/exportar_reporte_general/${formato}`,
                `reporte_general_produccion.${extension}`,
            );
        } catch (err: any) {
            alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
        } finally {
            setDescargando(null);
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Inventario de Producción" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <ConPermiso accion="insertar">
                            <Link
                                to="/invProd/create"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nuevo inventario
                            </Link>
                        </ConPermiso>
                        {/* buscador dinámico */}
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar inventario..."
                            className="rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-100"
                        />
                        {/* botones para exportar */}
                        <button
                            onClick={() => handleExportarProduccion("excel")}
                            disabled={descargando !== null}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            {descargando === "excel" ? "Descargando..." : "Exportar Excel"}
                        </button>
                        <button
                            onClick={() => handleExportarProduccion("pdf")}
                            disabled={descargando !== null}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            {descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
                        </button>
                    </div>
                    {/* filtro por estado */}
                    <div className="flex gap-2">
                        <select
                            value={estadoFiltro ?? ""}
                            onChange={(e) => {
                                const valor = e.target.value;
                                setEstadoFiltro(valor === "" ? null : valor as typeof estadoFiltro);
                                setPage(1);
                            }}
                            className="rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-100"
                        >
                            <option value="">Todos</option>
                            <option value="vencido">Vencidos</option>
                            <option value="sin_stock">Sin stock</option>
                            <option value="critico">Crítico (≤7 días)</option>
                            <option value="urgente">Urgente (≤15 días)</option>
                            <option value="vigente">Vigente</option>
                        </select>
                    </div>

                    {/* filtro por fechas */}
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filtrar por fechas:
                        </label>

                        {/* BOTÓN INTERACTIVO DEL CALENDARIO UNIFICADO */}
                        <div className="relative w-full lg:w-50">
                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                    <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
                        <colgroup>
                            <col className="w-42" />
                            <col className="w-20" />
                            <col className="w-40" />
                            <col className="w-36" />
                            <col className="w-44" />
                            <col className="w-36" />
                            <col className="w-32" />
                            <col className="w-36" />
                            <col className="w-50" />
                            <col className="w-44" />
                        </colgroup>
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>

                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Nombre producto
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Cantidad
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Fecha registro
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Fecha vencimiento
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Categoría / Especie
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Lote
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Costo unitario
                                </th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Costo total
                                </th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Estado
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Accciones
                                </th>
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
                            ) : invProd.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay registros de inventario para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                invProd.map((inv_prod) => (
                                    <tr key={inv_prod.id_inventario} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {inv_prod.nombre_producto}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm text-gray-800 dark:text-gray-400">{inv_prod.cantidad} {inv_prod.simbolo}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            <div>{formatearFecha(inv_prod.fecha_ingreso)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            <div>{SoloFecha(inv_prod.fecha_vencimiento)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="truncate">{inv_prod.nombre_categoria} / {inv_prod.nombre_especie}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="truncate">{inv_prod.nombre_lote}</div>
                                        </td>
                                        <td className="px-4 py-4 text-left text-sm text-gray-600 dark:text-gray-300">
                                            <div>$ {inv_prod.valor_unitario}</div>
                                        </td>
                                        <td className="px-5 py-4 text-left text-xs text-gray-600 dark:text-gray-300">
                                            <div>$ {inv_prod.valor_unitario * inv_prod.cantidad}</div>
                                        </td>
                                        <td className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            <div >{inv_prod.nivel_alerta}</div>
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <ConPermiso accion="actualizar">
                                                    {isEditDisabled(inv_prod.cantidad, inv_prod.nivel_alerta) ? (
                                                        <span className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500">
                                                            Editar
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            to={`/invProd/edit/${inv_prod.id_inventario}`}
                                                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                                            Editar
                                                        </Link>
                                                    )}
                                                </ConPermiso>
                                                <Link
                                                    to={`/invProd/report/${inv_prod.id_inventario}`}
                                                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-600 px-4 text-sm font-medium text-white transition hover:bg-gray-700">
                                                    Informe
                                                </Link>
                                            </div>
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
