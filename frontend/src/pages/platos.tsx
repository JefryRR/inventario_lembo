import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

type PlatoRow = {
    id_plato: number;
    nombre_plato: string;
    fecha_registro: string;
    estado: boolean;
};

type PlatosResponse = {
    page: number
    page_size: number
    total_platos: number
    total_pages: number
    platos: PlatoRow[];
};

export default function Platos() {
    const [plato, setPlato] = useState<PlatoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");


    useEffect(() => {
        const timeoutId = setTimeout(() => { setDebouncedSearch(search); }, 400);
        return () => clearTimeout(timeoutId);
    }, [search]);

    // Cuando cambia el término de búsqueda (ya debounced), volvemos a la página 1
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        let isMounted = true;

        const loadPlatos = async () => {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });

                // Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    params.set("search", debouncedSearch.trim());
                }

                const data = await apiFetch(`platos/platos_paginated?${params.toString()}`) as PlatosResponse;

                if (!isMounted) {
                    return;
                }

                const platoList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.platos)
                        ? data.platos
                        : [];

                setPlato(platoList);
                setTotal(Number(data?.total_platos ?? 0));
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los platos."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPlatos();

        return () => {
            isMounted = false;
        };
    }, [ page, pageSize, debouncedSearch ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <>
            <PageBreadcrumb pageTitle="Platos" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ConPermiso accion="insertar">
                            <Link
                                to="/platos/crear"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nuevo plato
                            </Link>
                        </ConPermiso>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar plato..."
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Nombre plato
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Fecha de registro
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Estado
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
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index}>
                                        <td colSpan={4} className="px-5 py-4">
                                            <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                                        </td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-error-500">
                                        {error}
                                    </td>
                                </tr>
                            ) : plato.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay platos para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                plato.map((plato) => (
                                    <tr key={plato.id_plato} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {plato.nombre_plato}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div> {plato.fecha_registro} </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                className="inline-flex ...">
                                                {plato.estado ? <span className="text-success-700">Activo</span> : <span className="text-error-700">Inactivo</span>}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <ConPermiso accion="actualizar">
                                                <Link
                                                    to={`/platos/edit/${plato.id_plato}`}
                                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                                    Editar
                                                </Link>
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
