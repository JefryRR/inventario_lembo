import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

type CategoriaRow = {
    id_categoria: number;
    nombre_categoria: string;
};

type CategoriasResponse = {
    categorias: CategoriaRow[];
};

export default function Categorias() {
    const [categoria, setCategoria] = useState<CategoriaRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadCategorias = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`categorias/all-categorias`) as CategoriasResponse | CategoriaRow[];

                if (!isMounted) {
                    return;
                }

                const categoriaList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.categorias)
                        ? data.categorias
                        : [];

                setCategoria(categoriaList);
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar las categorías."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadCategorias();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredCategorias = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return categoria;
        }

        return categoria.filter((categoria) => {
            return [
                categoria.nombre_categoria,
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, categoria]);

        return (
            <>
                <PageBreadcrumb pageTitle="Categorías" />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <ConPermiso accion="insertar">
                                <Link
                                    to="/categorias/create"
                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                    Crear categoría
                                </Link>
                            </ConPermiso>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar categoría..."
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800 sm:w-72"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>

                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Nombre categoría
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
                                ) : filteredCategorias.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay categorías para mostrar.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCategorias.map((categorias) => (
                                        <tr key={categorias.id_categoria} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-5 py-4 text-center">
                                                <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                    {categorias.nombre_categoria}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <ConPermiso accion="actualizar">
                                                    <Link
                                                        to={`/categorias/edit/${categorias.id_categoria}`}
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
