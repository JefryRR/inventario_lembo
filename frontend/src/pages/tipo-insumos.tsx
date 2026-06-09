import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type TipoInsumoRow = {
    id_tipo_insumo: number;
    nombre_tipo: string;
};

type TiposInsumosResponse = {
    tipos: TipoInsumoRow[];
};

export default function TiposInsumos() {
    const [tipo, setTipo] = useState<TipoInsumoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadTipos = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`tipo_insumos/all-tipo_insumo`) as TiposInsumosResponse | TipoInsumoRow[];

                if (!isMounted) {
                    return;
                }

                const tipoList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.tipos)
                        ? data.tipos
                        : [];

                setTipo(tipoList);
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar los tipos de insumos."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadTipos();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredTipos = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return tipo;
        }

        return tipo.filter((tipo) => {
            return [
                tipo.nombre_tipo,
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, tipo]);

        return (
            <>
                <PageBreadcrumb pageTitle="Tipos de insumos" />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                to="/tipos-insumos/crear"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nuevo tipo de insumo
                            </Link>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar tipo de insumo..."
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800 sm:w-72"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Nombre tipo de insumo
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Acciones
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
                                ) : filteredTipos.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay tipos de insumos para mostrar.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTipos.map((tipo) => (
                                        <tr key={tipo.id_tipo_insumo} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-5 py-4">
                                                <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                    {tipo.nombre_tipo}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    to={`/tipos-insumos/edit/${tipo.id_tipo_insumo}`}
                                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
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
