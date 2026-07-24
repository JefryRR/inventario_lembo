import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

type VentasLocationState = {
    refresh?: boolean;
    newVentaId?: number;
    selectVentaId?: number;
    newDetalleId?: number;
};

type VentaRow = {
    id_venta: number;
    nombre_comprador: string;
    id_comprador?: string | null;
    fecha_venta?: string;
    user_id?: number;
    nombre_user?: string;
    total_venta?: number | null;
};

type DetalleRow = {
    id_detalle_venta: number;
    cantidad: number;
    unid_medida_id: number;
    precio_venta: number;
    inv_prod_id: number;
    venta_id: number;
    estado_venta: string;
    cant_convertida?: number;
    nombre_producto?: string;
    nombre_comprador?: string;
    simbolo?: string;
};

/** Devuelve la última venta del día de hoy; si no hay, devuelve la última de todas. */
function resolveDefaultVenta(ventasList: VentaRow[]): number | null {
    if (!ventasList.length) return null;

    const hoy = new Date().toISOString().slice(0, 10);

    const ordenadas = [...ventasList].sort(
        (a, b) =>
            new Date(a.fecha_venta ?? "").getTime() -
            new Date(b.fecha_venta ?? "").getTime()
    );

    const hoyList = ordenadas.filter((v) => v.fecha_venta?.slice(0, 10) === hoy);

    return hoyList.length > 0
        ? hoyList[hoyList.length - 1].id_venta
        : ordenadas[ordenadas.length - 1].id_venta;
}

function puedeEditarDetalle(det: DetalleRow, fechaVenta?: string): boolean {
    if (det.estado_venta === "Anulado") return false;
    if (!fechaVenta) return true;

    const fecha = new Date(fechaVenta);
    const hoy = new Date();

    // Diferencia en días (ignorando la hora)
    fecha.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffMs = hoy.getTime() - fecha.getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);

    return diffDias <= 2;
}

export default function VentasPage() {
    const location = useLocation();
    const locationState = (location.state as VentasLocationState | null) ?? null;

    const [ventas, setVentas] = useState<VentaRow[]>([]);
    const [detalles, setDetalles] = useState<DetalleRow[]>([]);
    const [selectedVenta, setSelectedVenta] = useState<number | null>(null);
    const [selectedDetalleId, setSelectedDetalleId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search] = useState("");

    const selectedDetalleRef = useRef<HTMLTableRowElement | null>(null);

    // Ref para leer selectedVenta en el efecto de búsqueda sin agregarlo como dependencia,
    // evitando re-ejecuciones en cascada que pisaban la selección.
    const selectedVentaRef = useRef<number | null>(selectedVenta);
    useEffect(() => {
        selectedVentaRef.current = selectedVenta;
    }, [selectedVenta]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // Carga de ventas y detalles en paralelo
                const [ventasData, detallesData] = await Promise.all([
                    apiFetch("ventas/all/ventas"),
                    apiFetch("detalles-venta/all/detalles"),
                ]);

                if (!mounted) return;
                // Aseguramos que ventasData.ventas y detallesData.detalles sean arrays antes de asignarlos al estado
                const ventasList: VentaRow[] = Array.isArray(ventasData?.ventas)
                    ? ventasData.ventas
                    : Array.isArray(ventasData)
                        ? ventasData
                        : [];
                
                // Aseguramos que detallesData.detalles sea un array antes de asignarlo al estado
                const detallesList: DetalleRow[] = Array.isArray(detallesData?.detalles)
                    ? detallesData.detalles
                    : Array.isArray(detallesData)
                        ? detallesData
                        : [];

                setVentas(ventasList);
                setDetalles(detallesList);

                // Determinar la venta y detalle seleccionados según el estado de la ubicación o por defecto
                const ventaIdFromState =
                    locationState?.newVentaId ?? locationState?.selectVentaId ?? null;
                const detalleIdFromState = locationState?.newDetalleId ?? null;

                setSelectedVenta(ventaIdFromState ?? resolveDefaultVenta(ventasList));
                setSelectedDetalleId(detalleIdFromState);
            } catch (err: any) {
                if (!mounted) return;
                setError(
                    err?.detail ?? err?.message ?? "No se pudieron cargar las ventas"
                );
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, // Dependencias del efecto: se ejecuta al montar y cuando cambian estas variables 
    [
        location.key,
        locationState?.refresh,
        locationState?.newVentaId,
        locationState?.selectVentaId,
        locationState?.newDetalleId,
    ]);

    // Filtrado de ventas del día de hoy
    const ventasHoy = useMemo(() => {
        const hoy = new Date().toISOString().slice(0, 10);
        return ventas.filter((v) => v.fecha_venta?.slice(0, 10) === hoy);
    }, [ventas]);

    // Filtrado de detalles de la venta seleccionada
    const filteredDetalles = useMemo(
        () => detalles.filter((d) => d.venta_id === selectedVenta),
        [detalles, selectedVenta]
    );

    // Venta seleccionada según el estado de selectedVenta
    const selectedVentaData = useMemo(
        () => ventas.find((v) => v.id_venta === selectedVenta) ?? null,
        [ventas, selectedVenta]
    );

    useEffect(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            setSelectedVenta(resolveDefaultVenta(ventas));
            setSelectedDetalleId(null);
            return;
        }

        // 1. Buscar ventas cuyo comprador (nombre o identificación) coincida
        const ventasPorComprador = ventas.filter((v) =>
            [v.nombre_comprador, v.id_comprador ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(term)
        );

        // 2. Buscar ventas que tengan algún detalle cuyo producto coincida
        const ventaIdsPorProducto = new Set(
            detalles
                .filter((d) => (d.nombre_producto ?? "").toLowerCase().includes(term))
                .map((d) => d.venta_id)
        );
        const ventasPorProducto = ventas.filter((v) => ventaIdsPorProducto.has(v.id_venta));

        // 3. Combinar ambos resultados sin duplicados, priorizando coincidencia por comprador
        const combinadas = [...ventasPorComprador];
        ventasPorProducto.forEach((v) => {
            if (!combinadas.some((c) => c.id_venta === v.id_venta)) {
                combinadas.push(v);
            }
        });

        // 4. Ordenar por fecha (más reciente primero) y seleccionar la primera coincidencia
        const ordenadas = [...combinadas].sort(
            (a, b) =>
                new Date(b.fecha_venta ?? "").getTime() -
                new Date(a.fecha_venta ?? "").getTime()
        );

        if (ordenadas.length > 0) {
            setSelectedVenta(ordenadas[0].id_venta);
            setSelectedDetalleId(null);
        } else {
            // Ninguna venta coincide: limpiamos la selección para mostrar el mensaje de "sin resultados"
            setSelectedVenta(null);
            setSelectedDetalleId(null);
        }
    }, [search, ventas, detalles]);

    // Limpia el highlight del detalle al cambiar de venta manualmente
    const handleSelectVenta = (id: number | null) => {
        setSelectedVenta(id);
        setSelectedDetalleId(null);
    };

    useEffect(() => {
        if (!selectedDetalleId || !selectedDetalleRef.current) return;
        selectedDetalleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [selectedDetalleId, detalles.length]);

    return (
        <>
            <PageBreadcrumb pageTitle="Ventas" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                {/* ── Toolbar ── */}
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <ConPermiso accion="insertar">
                            <Link
                                to="/ventas/create"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                            >
                                Nueva venta
                            </Link>
                        </ConPermiso>

                        {selectedVenta && (
                            <>
                                <ConPermiso accion="actualizar">
                                    <Link
                                        to={`/ventas/edit/${selectedVenta}`}
                                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#71277A] px-4 text-sm font-medium text-white transition hover:bg-[#71277A]/90"
                                    >
                                        Editar venta
                                    </Link>
                                </ConPermiso>
                                <ConPermiso accion="insertar">
                                    <Link
                                        to="/detalle-ventas/create"
                                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#f8c315] px-4 text-sm font-medium text-white transition hover:bg-[#f1bb0a]"
                                    >
                                        Nuevo detalle
                                    </Link>
                                </ConPermiso>
                            </>
                        )}

                        <ConPermiso accion="insertar">
                            {/* Selector de ventas del día de hoy */}
                            <select
                                value={selectedVenta ?? 0}
                                onChange={(e) =>
                                    handleSelectVenta(Number(e.target.value) || null)
                                }
                                className="h-11 w-80 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-gray-500 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-700"
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loading ? "Cargando ventas..." : "Selecciona una venta"}
                                </option>
                                {ventasHoy.map((venta) => (
                                    <option className="dark:text-black" key={venta.id_venta} value={venta.id_venta}>
                                        {venta.nombre_comprador}
                                        {venta.fecha_venta ? ` - ${new Date(venta.fecha_venta).toLocaleDateString()}` : ""}
                                    </option>
                                ))}
                            </select>
                        </ConPermiso>
                    </div>
                </div>

                <div className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            Cargando ventas...
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : selectedVentaData ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                            <Field label="Comprador" value={selectedVentaData.nombre_comprador} />
                            <Field label="Identificación" value={selectedVentaData.id_comprador ?? "-"} />
                            <Field
                                label="Fecha de venta"
                                value={
                                    selectedVentaData.fecha_venta ? new Date(selectedVentaData.fecha_venta).toLocaleDateString() : "-"
                                }
                            />
                            {/* Detalles de la venta */}
                            <Field
                                label="Total"
                                value={
                                    selectedVentaData.total_venta != null
                                        ? `$ ${selectedVentaData.total_venta}`
                                        : "-"
                                }
                            />
                        </div>
                    ) : (
                        <div className="p-3 text-sm text-gray-500">
                            {search.trim()
                                ? "No hay ventas que coincidan con la búsqueda."
                                : "No hay venta seleccionada."}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto px-5 pb-3">
                    <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
                        <colgroup>
                            <col className="w-64" />
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-36" />
                            <col className="w-32" />
                            <col className="w-32" />
                        </colgroup>
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                                {["Producto", "Cantidad", "Unidad", "Precio", "Total", "Estado", "Acciones"].map(
                                    (col) => (
                                        <th
                                            key={col}
                                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                                        >
                                            {col}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredDetalles.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        {selectedVenta
                                            ? "No hay detalles para esta venta."
                                            : "Selecciona una venta para ver sus detalles."}
                                    </td>
                                </tr>
                            ) : (
                                filteredDetalles.map((det) => (
                                    <tr
                                        key={det.id_detalle_venta}
                                        ref={
                                            det.id_detalle_venta === selectedDetalleId
                                                ? selectedDetalleRef
                                                : null
                                        }
                                        className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${det.id_detalle_venta === selectedDetalleId
                                                ? "bg-green-50/70 dark:bg-green-500/10"
                                                : ""
                                            }`}
                                    >
                                        <td className="px-4 py-4 text-center text-sm text-gray-800 dark:text-white/90">
                                            {det.nombre_producto}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-800 dark:text-gray-400">
                                            {det.cantidad}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-800 dark:text-gray-400">
                                            {det.simbolo}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            $ {det.precio_venta}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            $ {det.precio_venta * det.cantidad}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            {det.estado_venta}
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            <ConPermiso accion="actualizar">
                                                {puedeEditarDetalle(det, selectedVentaData?.fecha_venta) ? (
                                                    <Link
                                                        to={`/detalle-ventas/edit/${det.id_detalle_venta}`}
                                                        className="inline-flex h-10 w-20 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                                                    >
                                                        Editar
                                                    </Link>
                                                ) : (
                                                    <span className="inline-flex h-10 w-20 items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed">
                                                        Editar
                                                    </span>
                                                )}
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

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-black">
                {value}
            </div>
        </div>
    );
}
