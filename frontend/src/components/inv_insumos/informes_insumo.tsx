import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";

type MovimientoReporte = {
    tipo: string;
    id_registro: number;
    cantidad: number;
    valor: string | number;
    estado: string;
    observaciones: string;
    fecha: string;
    motivo: string;
};

type ReporteProduccion = {
    encabezado: {
        id_insumo: number;
        nombre_producto: string;
        fecha_ingreso: string;
        fecha_vencimiento: string;
        precio_unitario: number;
        simbolo: string;
        cantidad_inicial: number;
        stock_actual: number;
        total_perdido: number;
    };
    movimientos: MovimientoReporte[];
};

export default function InformesInsumo() {
    const { id_insumo } = useParams();
    const [reporte, setReporte] = useState<ReporteProduccion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!id_insumo) {
                setError("No se recibió el identificador del inventario.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(`inv_insumos/reporte/${id_insumo}`)) as ReporteProduccion;

                if (!isMounted) {
                    return;
                }

                setReporte(data ?? null);
            } catch (requestError: any) {
                if (!isMounted) {
                    return;
                }

                setError(
                    requestError?.detail ||
                    requestError?.message ||
                    "No se pudo cargar el reporte de inventario."
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
    }, [id_insumo]);

    const formatearFecha = (fechaString: string | number | Date) => {
        if (!fechaString) return "-";
        const fecha = new Date(fechaString);
        return fecha.toLocaleString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatearMoneda = (valor: number | string) => {
        const numero = Number(valor ?? 0);
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(numero);
    };

    const formatearCantidad = (cantidad: number | string, simbolo?: string) => {
        const unidad = simbolo?.trim() || "-";
        return `${cantidad ?? 0} ${unidad}`;
    };

    const formatearMotivo = (motivo: string) => {
        const mapaMotivos: Record<string, string> = {
            daño_fisico: "En mal estado",
            error_pedido: "Error de pedido",
            contaminacion: "Contaminado",
            extravio: "Extraviado",
            vencimiento: "Vencido",
            robo: "Robado",
        };

        return mapaMotivos[motivo] ?? motivo;
    };

    const encabezado = reporte?.encabezado;

    const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

    const handleExportar = async (formato: "pdf" | "excel") => {
        if (!id_insumo) return;

        setDescargando(formato);
        try {
            const extension = formato === "pdf" ? "pdf" : "xlsx";
            await apiDownload(
                `inv_insumos/reporte/${id_insumo}/${formato}`,
                `reporte_insumo_${id_insumo}.${extension}`
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
                        Informe de Insumos
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Resumen detallado del inventario y sus movimientos.
                    </p>
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
                        to="/invInsumo"
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver
                    </Link>
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
                    No hay información disponible para este inventario.
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Producto
                            </div>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {encabezado.nombre_producto}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                ID insumo: {encabezado.id_insumo}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm dark:border-green-500/20 dark:bg-green-500/10">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Stock actual
                            </div>
                            <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">
                                {formatearCantidad(encabezado.stock_actual, encabezado.simbolo)}
                            </p>
                            <p className="mt-1 text-xs text-green-600/70 dark:text-green-400/60">
                                de {formatearCantidad(encabezado.cantidad_inicial, encabezado.simbolo)} iniciales
                            </p>
                        </div>

                        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-600 dark:text-red-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Total perdido
                            </div>
                            <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">
                                {formatearCantidad(encabezado.total_perdido, encabezado.simbolo)}
                            </p>
                            <p className="mt-1 text-xs text-red-600/70 dark:text-red-400/60">
                                {encabezado.cantidad_inicial > 0
                                    ? `${((encabezado.total_perdido / encabezado.cantidad_inicial) * 100).toFixed(1)}% del inventario`
                                    : "Sin datos"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Valor unitario
                            </div>
                            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {formatearMoneda(encabezado.precio_unitario)}
                            </p>
                            <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/60">
                                por {encabezado.simbolo || "unidad"}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2">

                        {/* Datos generales */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Datos generales</h2>

                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de ingreso</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearFecha(encabezado.fecha_ingreso)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de vencimiento</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearFecha(encabezado.fecha_vencimiento)}</dd>
                                </div>
                            </dl>

                            <hr className="my-4 border-gray-100 dark:border-gray-800" />

                            <dl className="grid grid-cols-1 gap-4">
                                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Resumen financiero</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Costo total inicial</span>
                                        <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                            {formatearMoneda(encabezado.cantidad_inicial * encabezado.precio_unitario)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor total pérdida</span>
                                        <p className="mt-2 text-base font-semibold text-red-600 dark:text-red-400">
                                            {formatearMoneda(encabezado.total_perdido * encabezado.precio_unitario)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor stock actual</span>
                                        <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                            {formatearMoneda(encabezado.stock_actual * encabezado.precio_unitario)}
                                        </p>
                                    </div>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Movimientos</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900/40">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Observaciones</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unidad</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado o Motivo</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {reporte.movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No hay movimientos registrados para este inventario.
                                            </td>
                                        </tr>
                                    ) : (
                                        reporte.movimientos.map((movimiento) => (
                                            <tr key={`${movimiento.tipo}-${movimiento.id_registro}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{movimiento.tipo}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{movimiento.observaciones}</td>
                                                <td className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">{movimiento.cantidad}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{encabezado.simbolo || "-"}</td>
                                                <td className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                                    {movimiento.valor === "-" ? "-" : formatearMoneda(movimiento.valor)}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {movimiento.estado} {movimiento.motivo !== " " ? `${formatearMotivo(movimiento.motivo)}` : ""}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatearFecha(movimiento.fecha)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
}
