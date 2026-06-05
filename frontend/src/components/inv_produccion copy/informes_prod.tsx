import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type MovimientoReporte = {
    tipo: string;
    id_registro: number;
    cantidad: number;
    valor: string | number;
    estado: string;
    referencia: string;
    fecha: string;
    motivo: string;
};

type ReporteProduccion = {
    encabezado: {
        id_inventario: number;
        nombre_producto: string;
        fecha_ingreso: string;
        fecha_vencimiento: string;
        valor_unitario: number;
        nombre_lote: string;
        cantidad_inicial: number;
        stock_actual: number;
        total_vendido: number;
        total_perdido: number;
        simbolo: string;
    };
    movimientos: MovimientoReporte[];
};

export default function InformesProd() {
    const { id_inventario } = useParams();
    const [reporte, setReporte] = useState<ReporteProduccion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!id_inventario) {
                setError("No se recibió el identificador del inventario.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = (await apiFetch(`inv_produccion/reporte/${id_inventario}`)) as ReporteProduccion;

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
    }, [id_inventario]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                        Informe de Producción
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Resumen detallado del inventario y sus movimientos.
                    </p>
                </div>
                <Link
                    to="/invProd"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                    Volver
                </Link>
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
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</span>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {encabezado.nombre_producto}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Lote</span>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {encabezado.nombre_lote}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Stock actual</span>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {formatearCantidad(encabezado.stock_actual, encabezado.simbolo)}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor unitario</span>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {formatearMoneda(encabezado.valor_unitario)}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Datos generales</h2>
                            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de ingreso</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearFecha(encabezado.fecha_ingreso)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de vencimiento</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearFecha(encabezado.fecha_vencimiento)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad inicial</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearCantidad(encabezado.cantidad_inicial, encabezado.simbolo)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Vendidos</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearCantidad(encabezado.total_vendido, encabezado.simbolo)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Perdidos</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{formatearCantidad(encabezado.total_perdido, encabezado.simbolo)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">ID inventario</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{encabezado.id_inventario}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Resumen financiero</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Costo total inicial</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {formatearMoneda(encabezado.cantidad_inicial * encabezado.valor_unitario)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor stock actual</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {formatearMoneda(encabezado.stock_actual * encabezado.valor_unitario)}
                                    </p>
                                </div>
                            </div>
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
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Referencia</th>
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
                                                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{movimiento.referencia}</td>
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
            )}
        </div>
    );
}
