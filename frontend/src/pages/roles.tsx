import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type RolRow = {
    id_rol: number;
    nombre_rol: string;
    descripcion: string;
    estado: boolean;
};

type RolesResponse = {
    roles: RolRow[];
};

// const PAGE_SIZES = [5, 10, 20, 50];

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

export default function Roles() {
    const [rol, setRol] = useState<RolRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadRoles = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(
                    `roles/all/roles`
                )) as RolesResponse;

                if (!isMounted) {
                    return;
                }

                setRol(Array.isArray(data?.roles) ? data.roles : []);
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los roles."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadRoles();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredRoles = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return rol;
        }

        return rol.filter((role) => {
            return [
                role.nombre_rol,
                role.descripcion,
                role.estado ? "activo" : "inactivo",
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, rol]);
    
    return (
        <>
            <PageBreadcrumb pageTitle="Roles" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/roles/crear"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600">
                            Nuevo rol
                        </Link>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar rol..."
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-72"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Nombre rol
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Descripción
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Estado
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Accciones
                                </th>
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
                            ) : filteredRoles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay roles para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredRoles.map((rol) => (
                                    <tr key={rol.id_rol} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {rol.nombre_rol}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div> {rol.descripcion} </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <StatusBadge active={rol.estado} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <Link
                                                to={`/roles/Edit/${rol.id_rol}`}
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
            </div>
        </>
    );
}
