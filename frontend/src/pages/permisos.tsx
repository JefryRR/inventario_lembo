import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PermissionRow = {
    id_modulo: number;
    id_rol: number;
    insertar: boolean;
    actualizar: boolean;
    seleccionar: boolean;
    borrar: boolean;
    nombre_modulo: string;
    nombre_rol: string;
};

type PermissionsResponse = {
    total: number;
    page: number;
    page_size: number;
    permissions: PermissionRow[];
};

const PAGE_SIZES = [5, 10, 20, 50];

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${active
                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                }`}
        >
            {active ? "Activo" : "Inactivo"}
        </span>
    );
}

export default function Users() {
    const navigate = useNavigate();
    const [permisos, setPermissions] = useState<PermissionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/signin");
        }
    }, [navigate]);

    useEffect(() => {
        let isMounted = true;

        const loadUsers = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(
                    `permisos/all_permisos-pag?page=${page}&page_size=${pageSize}`
                )) as PermissionsResponse;

                if (!isMounted) {
                    return;
                }

                setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
                setTotal(Number(data?.total ?? 0));
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

        loadUsers();

        return () => {
            isMounted = false;
        };
    }, [page, pageSize]);

    const filteredPermission = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return permisos;
        }

        return permisos.filter((permiso) => {
            return [
                permiso.id_modulo.toString(),
                permiso.id_rol.toString(),
                permiso.insertar?.toString(),
                permiso.actualizar?.toString(),
                permiso.seleccionar?.toString(),
                permiso.borrar?.toString(),
                permiso.nombre_modulo,
                permiso.nombre_rol,
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, permisos]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    // const endItem = Math.min(page * pageSize, total);

    return (
        <>
            <PageBreadcrumb pageTitle="Permisos" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/permisos/create"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600">
                            Nuevo permiso
                        </Link>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar permiso..."
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
                                    Eliminar
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
                            ) : filteredPermission.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay permisos para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredPermission.map((permisos) => (
                                    <tr key={`${permisos.nombre_modulo}-${permisos.nombre_rol}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {permisos.nombre_modulo}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div> {permisos.nombre_rol} </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{permisos.insertar ? "Sí" : "No"}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{permisos.actualizar ? "Sí" : "No"}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{permisos.seleccionar ? "Sí" : "No"}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{permisos.borrar ? "Sí" : "No"}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Link
                                                to={`/permisos/${permisos.id_modulo}/${permisos.id_rol}`}
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
