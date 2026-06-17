import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore
import { apiFetch } from "@/services/api";
import FacturaModal from "@/components/inv_insumos/factura_insumo";

type invInsumoRow = {
    id_insumo: number;
    nombre_producto: string;
    cantidad: number;
    unid_medida_id: number;
    min_stock: number;
    fecha_ingreso: string;
    fecha_vencimiento: string;
    tipo_id: number;
    nombre_tipo: string;
    precio_unitario: number;
    nivel_alerta: string;
    simbolo: string;
};

type invInsumoResponse = {
    total: number;
    total_insumos?: number;
    page: number;
    page_size: number;
    insumos: invInsumoRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

function isEditDisabled(cantidad: number, alerta: string): boolean {
    if (alerta.toLowerCase().includes("vencido")) return true;
    if (cantidad <= 0) return true;
    return false;
};

export default function InvInsumo() {
    const [invInsumo, setInvInsumo] = useState<invInsumoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState<DateRangeState>({ fecha_inicio: "", fecha_fin: "" });
    const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);

    const [facturaInsumoId, setFacturaInsumoId] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadInvInsumo = async () => {
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
                        return `inv_insumos/rango-fechas?${queryParams.toString()}`;
                    })()
                    : `inv_insumos/insumos_paginated?${queryParams.toString()}`;

                const data = (await apiFetch(endpoint)) as invInsumoResponse;
                if (!isMounted) return;

                setInvInsumo(Array.isArray(data?.insumos) ? data.insumos : []);
                setTotal(Number(data?.total ?? data?.total_insumos ?? 0));
            } catch (requestError: any) {
                if (!isMounted) return;
                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los datos de los insumos."
                );
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadInvInsumo();
        return () => { isMounted = false; };
    }, [page, pageSize, activeDateRange]);

    const SoloFecha = (fechaString: string | number | Date) => {
        if (!fechaString) return "-";
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const filteredInvInsumos = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return invInsumo;
        return invInsumo.filter((inv_insumo) =>
            [
                inv_insumo.nombre_producto,
                String(inv_insumo.cantidad),
                inv_insumo.simbolo,
                String(inv_insumo.min_stock),
                inv_insumo.nombre_tipo,
                SoloFecha(inv_insumo.fecha_ingreso),
                SoloFecha(inv_insumo.fecha_vencimiento),
                String(inv_insumo.precio_unitario),
                inv_insumo.nivel_alerta,
            ]
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [search, invInsumo]);

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
        setPage(1);
        setError(null);
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    type EstadoInsumo = { label: string; color: string };

    const Estadoinsumo = (cantidad: number, minima: number): EstadoInsumo => {
        if (cantidad === 0) return { label: "Agotado", color: "text-red-600" };
        if (cantidad <= minima) return { label: "Provisionar", color: "text-yellow-500" };
        return { label: "Disponible", color: "text-green-600" };
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Inventario de insumos" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link
                            to="/invInsumo/create"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                        >
                            Nuevo insumo
                        </Link>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar inventario..."
                            className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-50"
                        />
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha inicio:</label>
                        <input
                            type="date"
                            value={dateRange.fecha_inicio}
                            onChange={(e) => setDateRange((c) => ({ ...c, fecha_inicio: e.target.value }))}
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 lg:w-44"
                        />
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha fin:</label>
                        <input
                            type="date"
                            value={dateRange.fecha_fin}
                            onChange={(e) => setDateRange((c) => ({ ...c, fecha_fin: e.target.value }))}
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 lg:w-44"
                        />
                        <button
                            type="button"
                            onClick={applyDateFilter}
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-800 px-4 text-sm font-medium text-white transition hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={clearDateFilter}
                            disabled={!activeDateRange}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo insumo</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha registro</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha vencimiento</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado stock</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Precio unitario</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Detalles</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Factura</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, index) => (
                                    <tr key={index}>
                                        <td colSpan={9} className="px-5 py-4">
                                            <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                                        </td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-error-500">{error}</td>
                                </tr>
                            ) : filteredInvInsumos.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay registros de insumos para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvInsumos.map((inv_insumo) => {
                                    const estado = Estadoinsumo(inv_insumo.cantidad, inv_insumo.min_stock);
                                    return (
                                        <tr key={inv_insumo.id_insumo} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-4 py-4 text-center">
                                                <div className="text-sm font-medium text-gray-800 dark:text-white/90">{inv_insumo.nombre_producto}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="text-sm text-gray-800 dark:text-gray-400">{inv_insumo.cantidad} {inv_insumo.simbolo}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-left text-gray-600 dark:text-gray-300">
                                                <div className="truncate">{inv_insumo.nombre_tipo}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                <div>{SoloFecha(inv_insumo.fecha_ingreso)}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                <div>{SoloFecha(inv_insumo.fecha_vencimiento)}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={estado.color}>{estado.label}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                                <div>$ {inv_insumo.precio_unitario}</div>
                                            </td>
                                            <td className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                <div>{inv_insumo.nivel_alerta}</div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <button
                                                        onClick={() => setFacturaInsumoId(inv_insumo.id_insumo)}
                                                        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#71277A] px-4 text-sm font-medium text-white transition hover:bg-[#71277A]/90"
                                                    >
                                                        Factura
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    {isEditDisabled(inv_insumo.cantidad, inv_insumo.nivel_alerta) ? (
                                                        <span className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500">
                                                            Editar
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            to={`/invInsumo/edit/${inv_insumo.id_insumo}`}
                                                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                                            Editar
                                                        </Link>
                                                    )}
                                                    <Link
                                                        to={`/invInsumo/report/${inv_insumo.id_insumo}`}
                                                        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-600 px-4 text-sm font-medium text-white transition hover:bg-gray-700"
                                                    >
                                                        Informe
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-center">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {facturaInsumoId && (
                <FacturaModal
                    insumo_id={facturaInsumoId}
                    onClose={() => setFacturaInsumoId(null)}
                />
            )}
        </>
    );
}