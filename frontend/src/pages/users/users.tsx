import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type UserRow = {
    id_user: number;
    nombre_user: string;
    documento: number;
    tipo_documento: string;
    telefono: string;
    correo: string;
    estado: boolean;
    rol_id: number;
    nombre_rol: string;
};

type UsersResponse = {
    total: number;
    page: number;
    page_size: number;
    users: UserRow[];
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
    const [users, setUsers] = useState<UserRow[]>([]);
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
                    `users/paginated?page=${page}&page_size=${pageSize}`
                )) as UsersResponse;

                if (!isMounted) {
                    return;
                }

                setUsers(Array.isArray(data?.users) ? data.users : []);
                setTotal(Number(data?.total ?? 0));
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los usuarios"
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

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return users;
        }

        return users.filter((user) => {
            return [
                user.nombre_user,
                String(user.documento),
                user.tipo_documento,
                user.telefono,
                user.correo,
                user.nombre_rol,
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, users]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    // const endItem = Math.min(page * pageSize, total);

    return (
        <>
            <PageBreadcrumb pageTitle="Usuarios" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/users/create"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600">
                            Nuevo usuario
                        </Link>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar usuario..."
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
                                    Nombre / Documento
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Correo
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Telefono
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Rol
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
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay usuarios para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id_user} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                {user.nombre_user}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.tipo_documento}. {user.documento}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400"></div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div> {user.correo} </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{user.telefono}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{user.nombre_rol}</div>

                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge active={user.estado} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <Link
                                                to={`/users/Edit/${user.id_user}`}
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
