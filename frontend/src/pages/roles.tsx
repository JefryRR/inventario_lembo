import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

// Tipos de datos para los roles
type RolRow = {
    id_rol: number;
    nombre_rol: string;
    descripcion: string;
    estado: boolean;
};

type RolesResponse = {
    roles: RolRow[];
};

export default function Roles() {
    const [rol, setRol] = useState<RolRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        // Función para cargar los roles desde la API
        const loadRoles = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`roles/all/roles`) as RolesResponse | RolRow[];

                if (!isMounted) {
                    return;
                }

                // Aseguramos que data.roles sea un array antes de asignarlo al estado
                const roleList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.roles)
                        ? data.roles
                        : [];

                setRol(roleList);
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

    // Filtrado de roles basado en el término de búsqueda
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

    const handleStatusChange = async (id_rol: number, newState: boolean) => {
        // optimista: actualizar UI inmediatamente
        setRol((prev) => prev.map(u => u.id_rol === id_rol ? { ...u, estado: newState } : u));
        try {
            await apiFetch(`roles/estado/${id_rol}?estado_rol=${newState}`, { method: "PUT" });
        } catch (err) {
            // rollback si falla
            setRol((prev) => prev.map(u => u.id_rol === id_rol ? { ...u, estado: !newState } : u));
            console.error(err);
        }
    };
        return (
            <>
                <PageBreadcrumb pageTitle="Roles" />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <ConPermiso accion="insertar">
                                <Link
                                    to="/roles/crear"
                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                    Nuevo rol
                                </Link>
                            </ConPermiso>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar rol..."
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
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
                                    <ConPermiso accion="actualizar">
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Accciones
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
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(rol.id_rol, !rol.estado)}
                                                    className="inline-flex ...">
                                                    {rol.estado ? <span className="text-success-700">Activo</span> : <span className="text-error-700">Inactivo</span>}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4">
                                                <ConPermiso accion="actualizar">
                                                    <Link
                                                        to={`/roles/editar/${rol.id_rol}`}
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
                </div>
            </>
        );
    }
