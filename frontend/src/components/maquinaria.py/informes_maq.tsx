import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";

type HistorialMaquinaRow = {
    id_historial: number;
    id_maquina: number;
    nombre_maq: string;
    num_serie: string;
    estado_actual: string;
    fecha_cambio: string;
    user_id: number;
    nombre_user: string;
    observaciones: string;
    fecha_compra: string;
    marca: string;
    modelo: string;
    tipo_maq: string;
};

type ReporteMaquina = {
    encabezado: HistorialMaquinaRow;
    movimientos: HistorialMaquinaRow[];
};

export default function InformeMaquina() {
    const { id_maquina } = useParams();
    const [reporte, setReporte] = useState<ReporteMaquina | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!id_maquina) {
                setError("No se recibió el identificador del maquina.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(`maquinas/historial?id_maquina=${id_maquina}`)) as
                    | { historial?: HistorialMaquinaRow[] }
                    | HistorialMaquinaRow[];

                const historial = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.historial)
                        ? data.historial
                        : [];

                if (!isMounted) {
                    return;
                }

                if (historial.length === 0) {
                    setReporte(null);
                    return;
                }

                setReporte({
                    encabezado: historial[0],
                    movimientos: historial,
                });
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudo cargar el reporte de maquina."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [id_maquina]);

    const formatearFecha = (fechaString: string | number | Date) => {
        if (!fechaString) return "-";
        const fecha = new Date(fechaString);
        return fecha.toLocaleString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            
        });
    };

    const formatearEstado = (estado: string) => {
        const mapaEstados: Record<string, string> = {
            operativa: 'operativa',
            mantenimiento: 'mantenimiento',
            dañada: 'dañada',
            de_baja: 'Dado de baja'
        };

        return mapaEstados[estado] ?? estado;
    };

    const encabezado = reporte?.encabezado;

    const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

    const handleExportar = async (formato: "pdf" | "excel") => {
        if (!id_maquina) return;

        setDescargando(formato);
        try {
            const extension = formato === "pdf" ? "pdf" : "xlsx";
            await apiDownload(
                `maquinas/reporte/${id_maquina}/${formato}`,
                `reporte_maquina_${id_maquina}.${extension}`
            );
        } catch (err: any) {
            alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
        } finally {
            setDescargando(null);
        }
    };

    return (

        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                        Informe de estado de la maquina: {encabezado?.nombre_maq || "Cargando..."}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleExportar("pdf")}
                        disabled={descargando !== null}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        {descargando === "pdf" ? "Generando..." : "Exportar PDF"}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExportar("excel")}
                        disabled={descargando !== null}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        {descargando === "excel" ? "Generando..." : "Exportar Excel"}
                    </button>
                    <Link
                        to="/maquinaria"
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver
                    </Link>
                </div>
            </div> 
            <div className="grid gap-2">

                        {/* Datos generales */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Datos generales</h2>

                            <dl className="grid grid-cols-4 gap-4">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">marca</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{encabezado?.marca || "Cargando..."}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">modelo</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{encabezado?.modelo || "Cargando..."}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{encabezado?.tipo_maq || "Cargando..."}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha compra</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearFecha(encabezado?.fecha_compra || "")}</dd>
                                </div>
                            </dl>

                            <hr className="my-4 border-gray-100 dark:border-gray-800" />

                        </div>
                    </div>
            
            {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="h-5 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                    {error}
                </div>
            ) : !encabezado ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    No hay información disponible para este maquina.
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex justify-center border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Historial de estados</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900/40">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de Registro</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Responsable</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {reporte.movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No hay movimientos registrados para este maquina.
                                            </td>
                                        </tr>
                                    ) : (
                                        reporte.movimientos.map((movimiento) => (
                                            <tr key={movimiento.id_historial} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{formatearEstado(movimiento.estado_actual)}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatearFecha(movimiento.fecha_cambio)}</td>
                                                <td className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">{movimiento.nombre_user}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{movimiento.observaciones ? movimiento.observaciones : '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
