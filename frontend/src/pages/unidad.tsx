import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type UnidadRow = {
    id_unidad: number;
    unidad: string;
    simbolo: string;
    conversion: number;
    tipo: string;
};

type UnidadesResponse = {
    unidades: UnidadRow[];
};

export default function Unidades() {
    const [unidad, setUnidad] = useState<UnidadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadUnidades = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`unid-medida/all-unid_medidas`) as UnidadesResponse | UnidadRow[];

                if (!isMounted) {
                    return;
                }

                const unidadList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.unidades)
                        ? data.unidades
                        : [];

                setUnidad(unidadList);
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudieron cargar las unidades."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadUnidades();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredUnidades = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return unidad;
        }

        return unidad.filter((unidad) => {
            return [
                unidad.unidad,
                unidad.simbolo,
                unidad.conversion.toString(),
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, unidad]);

        return (
            <>
                <PageBreadcrumb pageTitle="Unidades de medida" />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                to="/unidades/crear"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nueva unidad
                            </Link>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar unidad..."
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800 sm:w-72"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Nombre unidad
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Símbolo
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Conversión
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
                                            <td colSpan={5} className="px-5 py-4">
                                                <div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                                            </td>
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-error-500">
                                            {error}
                                        </td>
                                    </tr>
                                ) : filteredUnidades.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay unidades para mostrar.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUnidades.map((unidades) => (
                                        <tr key={unidades.id_unidad} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-5 py-4">
                                                <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                    {unidades.unidad}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {unidades.simbolo}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {unidades.conversion}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    to={`/unidades/edit/${unidades.id_unidad}`}
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
