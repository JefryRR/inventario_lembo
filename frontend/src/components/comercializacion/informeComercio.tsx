import { Link, useLocation, useParams, useNavigate } from "react-router";

// Definimos el tipo de datos que esperamos recibir en el state de navegación
type ComercioRow = {
    id_comercializacion: number;
    producto_id: number;
    lote_id: number | null;
    cantidad: number;
    unid_med_id: number;
    lugar_comercializacion: string;
    fecha_comercializacion: string;
    cant_no_vendida: number | null;
    fecha_vencimiento: string;
    vendio_todo: boolean;
    simbolo: string;
    nombre_producto: string;
    user_id: number;
    nombre_user: string;
    sublote: string | null;
    observacion: string | null;
};

// Función para formatear la fecha en formato "dd/mm/yyyy"
function formatDate(value: string): string {
    if (!value) return "-";

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
}

// Componente principal que muestra el informe de comercialización
export default function InformeComercio() {
    const { id_comercializacion } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // No existe un endpoint de reporte por id: los datos de la tupla viajan
    // desde el listado (Comercios) a través del state de navegación.
    const comercializacion = (location.state as { comercializacion?: ComercioRow } | null)?.comercializacion ?? null;

    // Calculamos la cantidad vendida y el porcentaje de no vendido
    const cantidadVendida =
        comercializacion && comercializacion.cant_no_vendida != null
            ? comercializacion.cantidad - comercializacion.cant_no_vendida
            : comercializacion?.cantidad ?? 0;

    const porcentajeNoVendido =
        comercializacion && comercializacion.cant_no_vendida != null && comercializacion.cantidad > 0
            ? ((comercializacion.cant_no_vendida / comercializacion.cantidad) * 100).toFixed(1)
            : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                        Informe de Comercialización
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Detalle del registro de comercialización.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Botón para imprimir o exportar a PDF. */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!comercializacion}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Imprimir / Exportar PDF
                    </button>
                    <Link
                        to="/comercializaciones"
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a comercialización
                    </Link>
                </div>
            </div>

            {!comercializacion ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    No se recibió información de la comercialización
                    {id_comercializacion ? ` #${id_comercializacion}` : ""}. Este informe no tiene un endpoint propio:
                    ábrelo desde el botón "Informe" en el listado de comercializaciones para poder mostrarlo.
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => navigate("/comercializaciones")}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                        >
                            Ir al listado
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Producto
                            </div>
                            <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                {comercializacion.nombre_producto}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                ID comercialización: {comercializacion.id_comercializacion}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm dark:border-green-500/20 dark:bg-green-500/10">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Cantidad comercializada
                            </div>
                            <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">
                                {comercializacion.cantidad} {comercializacion.simbolo}
                            </p>
                            <p className="mt-1 text-xs text-green-600/70 dark:text-green-400/60">
                                en {comercializacion.lugar_comercializacion}
                            </p>
                        </div>

                        <div
                            // Estado de la comercialización: si vendió todo o no, con colores y mensajes distintos
                            className={`rounded-2xl border p-5 shadow-sm ${
                                comercializacion.vendio_todo
                                    ? "border-green-100 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
                                    : "border-yellow-100 bg-yellow-50 dark:border-yellow-500/20 dark:bg-yellow-500/10"
                            }`}
                        >
                            <div
                                className={`flex items-center gap-2 text-xs uppercase tracking-wide ${
                                    comercializacion.vendio_todo
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-yellow-600 dark:text-yellow-400"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Estado
                            </div>
                            <p
                                className={`mt-2 text-2xl font-bold ${
                                    comercializacion.vendio_todo
                                        ? "text-green-700 dark:text-green-400"
                                        : "text-yellow-700 dark:text-yellow-400"
                                }`}
                            >
                                {comercializacion.vendio_todo ? "Vendió todo" : "No vendió todo"}
                            </p>
                            <p
                                className={`mt-1 text-xs ${
                                    comercializacion.vendio_todo
                                        ? "text-green-600/70 dark:text-green-400/60"
                                        : "text-yellow-600/70 dark:text-yellow-400/60"
                                }`}
                            >
                                {comercializacion.vendio_todo
                                    ? "Registro cerrado"
                                    : porcentajeNoVendido !== null
                                    ? `${porcentajeNoVendido}% sin vender`
                                    : "Pendiente de cierre"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Fecha de comercialización
                            </div>
                            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {formatDate(comercializacion.fecha_comercializacion)}
                            </p>
                            <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/60">
                                vence {formatDate(comercializacion.fecha_vencimiento)}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Datos generales</h2>
                            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {comercializacion.nombre_producto} (ID {comercializacion.producto_id})
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Lote / Sublote</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {comercializacion.sublote ?? "-"}
                                        {comercializacion.lote_id != null ? ` (ID ${comercializacion.lote_id})` : ""}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Lugar de comercialización</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {comercializacion.lugar_comercializacion}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Registrado por</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {comercializacion.nombre_user}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de comercialización</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {formatDate(comercializacion.fecha_comercializacion)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha de vencimiento</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                                        {formatDate(comercializacion.fecha_vencimiento)}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Detalle de venta</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad total</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {comercializacion.cantidad} {comercializacion.simbolo}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad vendida (estimada)</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {cantidadVendida} {comercializacion.simbolo}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad no vendida</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {comercializacion.cant_no_vendida != null
                                            ? `${comercializacion.cant_no_vendida} ${comercializacion.simbolo}`
                                            : "-"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Observación</span>
                                    <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                                        {comercializacion.observacion || "Sin observación"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
