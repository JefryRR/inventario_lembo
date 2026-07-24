import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

// Tipos de datos para los permisos
type PermisoRow = {
    id_modulo: number;
    id_rol: number;
    insertar: boolean;
    actualizar: boolean;
    seleccionar: boolean;
    borrar: boolean;
    nombre_modulo: string;
    nombre_rol: string;
};

type PermisosResponse = {
    page: number;
    page_size: number;
    total_permisos: number;
    total_pages: number;
    permisos: PermisoRow[];
};

// Componente para mostrar un badge de estado (activo/inactivo)
function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${active
                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                }`}
        >
            {active ? "Si" : "No"}
        </span>
    );
}

export default function Permisos() {
    const navigate = useNavigate();
    const [permisos, setPermisos] = useState<PermisoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/signin");
        }
    }, [navigate]);

    // Debounce: espera 400ms después de que el usuario deja de escribir
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);


    useEffect(() => {
        let isMounted = true;

        const loadPermisos = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construimos los parámetros de la URL para la paginación y búsqueda
                const params = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });
                // Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    params.set("search", debouncedSearch.trim());
                }

                const data = (await apiFetch(`permisos/all_permisos-pag?${params.toString()}`)) as PermisosResponse;

                if (!isMounted) {
                    return;
                }
                setPermisos(Array.isArray(data?.permisos) ? data.permisos : []);
                setTotal(Number(data?.total_permisos ?? 0));
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los permisos"
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPermisos();

        return () => {
            isMounted = false;
        };
    }, [page, pageSize, debouncedSearch]);

    // Calculamos el total de páginas basado en el total de permisos y el tamaño de página
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <>
            <PageBreadcrumb pageTitle="Permisos" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ConPermiso accion="insertar">
                            <Link
                                to="/permisos/create"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nuevo permiso
                            </Link>
                        </ConPermiso>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar permiso..."
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Módulo
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Rol
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Insertar
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Actualizar
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Seleccionar
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Borrar
                                </th>
                                <ConPermiso accion="actualizar">
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Accciones
                                    </th>
                                </ConPermiso>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index}>
                                        <td colSpan={6} className="px-5 py-4">
                                            <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                                        </td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-error-500">
                                        {error}
                                    </td>
                                </tr>
                            ) : permisos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay permisos para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                permisos.map((permiso) => (
                                    <tr key={`${permiso.id_modulo}-${permiso.id_rol}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {permiso.nombre_modulo}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {permiso.nombre_rol}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge active={permiso.insertar} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge active={permiso.actualizar} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge active={permiso.seleccionar} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge active={permiso.borrar} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <ConPermiso accion="actualizar">
                                                <Link
                                                    to={`/permisos/edit/${permiso.id_modulo}/${permiso.id_rol}`}
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
