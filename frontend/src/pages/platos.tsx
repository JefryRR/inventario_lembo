import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PlatoRow = {
    id_plato: number;
    nombre_plato: string;
    fecha_registro: string;
    estado: boolean;
};

type PlatosResponse = {
    platos: PlatoRow[];
};

export default function Platos() {
    const [plato, setPlato] = useState<PlatoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadPlatos = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`platos/all-platos`) as PlatosResponse | PlatoRow[];

                if (!isMounted) {
                    return;
                }

                const platoList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.platos)
                        ? data.platos
                        : [];

                setPlato(platoList);
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
    }, []);

    const filteredPlatos = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return plato;
        }

        return plato.filter((plato) => {
            return [
                plato.nombre_plato,
                plato.fecha_registro,
                plato.estado ? "activo" : "inactivo",
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [search, plato]);

        return (
            <>
                <PageBreadcrumb pageTitle="Platos" />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                to="/platos/crear"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                                Nuevo plato
                            </Link>
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
                                ) : filteredPlatos.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No hay platos para mostrar.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPlatos.map((plato) => (
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
                                            <td className="px-5 py-4">
                                                <Link
                                                    to={`/platos/edit/${plato.id_plato}`}
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
