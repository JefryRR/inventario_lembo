import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type invPerdRow = {
    id_perdida: number
    inv_prod_id: number
    cantidad: number
    motivo: string
    fecha_reporte: string
    unid_medida_id: number
    user_id: number
    observaciones: string
    nombre_user: string
    nombre_producto: string
    valor_unitario: number
    nombre_lote: string
    simbolo: string

};

type invPerdResponse = {
    total: number;
    page: number;
    page_size: number;
    perdidas: invPerdRow[];
};

const PAGE_SIZES = [5, 10, 20, 50];

export default function Users() {
    const [invPerd, setInvPerd] = useState<invPerdRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");


    useEffect(() => {
        let isMounted = true;

        const loadUsers = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(
                    `inv_perdida/paginated-perdida?page=${page}&page_size=${pageSize}`
                )) as invPerdResponse;

                if (!isMounted) {
                    return;
                }

                setInvPerd(Array.isArray(data?.perdidas) ? data.perdidas : []);
                setTotal(Number(data?.total ?? 0));
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los datos de las perdidas."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadUsers();

        return () => {
            isMounted = false;
        };
    }, [page, pageSize]);

    const filteredInvperd = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return invPerd;
        }

        return invPerd.filter((inv_perd) => {
            return [
                inv_perd.nombre_producto,
                String(inv_perd.cantidad),
                inv_perd.motivo,
                inv_perd.nombre_user,
                inv_perd.fecha_reporte,
                inv_perd.observaciones,
                inv_perd.simbolo,
                String(inv_perd.valor_unitario),
                inv_perd.nombre_lote
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, invPerd]);

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

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <>
            <PageBreadcrumb pageTitle="Inventario de perdidas" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/invPerd/create"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600">
                            Registrar pérdida
                        </Link>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar perdida..."
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-72"
                        />
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPage(1);
                                setPageSize(Number(e.target.value));
                            }}
                            className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                        >
                            {PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size} por página
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Nombre producto
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Cantidad
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Fecha reporte
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Valor unitario
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Motivo
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Registrado por
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Lote
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Accciones
                                </th>
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
                                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-error-500">
                                        {error}
                                    </td>
                                </tr>
                            ) : filteredInvperd.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay registros de perdida para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvperd.map((inv_perd) => (
                                    <tr key={inv_perd.id_perdida} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {inv_perd.nombre_producto}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm text-gray-800 dark:text-gray-400" title={formatearCantidad(inv_perd.cantidad, inv_perd.simbolo)}>
                                                {inv_perd.cantidad} {inv_perd.simbolo || "-"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div> {formatearFecha(inv_perd.fecha_reporte)} </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>$ {inv_perd.valor_unitario}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{inv_perd.motivo}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{inv_perd.nombre_user}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{inv_perd.nombre_lote}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Link
                                                to={`/invPerd/edit/${inv_perd.id_perdida}`}
                                                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600">
                                                Editar
                                            </Link>
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
