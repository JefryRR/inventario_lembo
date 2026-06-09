import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

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

export default function VentasPage() {
    const location = useLocation();
    const locationState = (location.state as VentasLocationState | null) ?? null;
    const [ventas, setVentas] = useState<VentaRow[]>([]);
    const [detalles, setDetalles] = useState<DetalleRow[]>([]);
    const [selectedVenta, setSelectedVenta] = useState<number | null>(null);
    const [selectedDetalleId, setSelectedDetalleId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const selectedDetalleRef = useRef<HTMLTableRowElement | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const [ventasData, detallesData] = await Promise.all([
                    apiFetch("ventas/all/ventas"),
                    apiFetch("detalles-venta/all/detalles"),
                ]);

                if (!mounted) return;

                const ventasList = Array.isArray(ventasData?.ventas) ? ventasData.ventas : Array.isArray(ventasData) ? ventasData : [];
                const detallesList = Array.isArray(detallesData?.detalles) ? detallesData.detalles : Array.isArray(detallesData) ? detallesData : [];
                const ventaIdFromState = locationState?.newVentaId ?? locationState?.selectVentaId ?? null;
                const detalleIdFromState = locationState?.newDetalleId ?? null;

                setVentas(ventasList);
                setDetalles(detallesList);

                if (ventaIdFromState) {
                    setSelectedVenta(ventaIdFromState);
                } else if (ventasList.length > 0 && selectedVenta === null) {
                    const hoy = new Date().toISOString().slice(0, 10);
                    const hoyList = ventasList.filter((v: VentaRow) => v.fecha_venta?.slice(0, 10) === hoy);
                    const ultima = hoyList[hoyList.length - 1];
                    setSelectedVenta(ultima ? ultima.id_venta : ventasList[0].id_venta);
                }

                setSelectedDetalleId(detalleIdFromState);
            } catch (err: any) {
                if (!mounted) return;
                setError(err?.detail || err?.message || "No se pudieron cargar las ventas");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [location.key, locationState?.refresh, locationState?.newVentaId, locationState?.selectVentaId, locationState?.newDetalleId]);

    const filteredVentas = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return ventas;
        return ventas.filter((v) =>
            [
                String(v.id_venta),
                v.nombre_comprador || "",
                String(v.id_comprador || ""),
                v.nombre_user || "",
                String(v.total_venta ?? ""),
                v.fecha_venta || "",
            ]
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [ventas, search]);

    const ventasHoy = useMemo(() => {
        const hoy = new Date().toISOString().slice(0, 10);
        return ventas.filter((v) => v.fecha_venta?.slice(0, 10) === hoy);
    }, [ventas]);

    // Sincroniza la venta seleccionada cuando el término de búsqueda cambia
    useEffect(() => {
        const term = search.trim();
        if (!term) {
            if (ventas.length > 0 && selectedVenta === null) {
                setSelectedVenta(ventas[0].id_venta);
            }
            return;
        }

        if (filteredVentas.length > 0) {
            if (!filteredVentas.find((v) => v.id_venta === selectedVenta)) {
                setSelectedVenta(filteredVentas[0].id_venta);
            }
        } else {
            setSelectedVenta(null);
        }
    }, [search, filteredVentas, ventas, selectedVenta]);

    const filteredDetalles = useMemo(() => {
        return detalles.filter((d) => (selectedVenta ? d.venta_id === selectedVenta : true));
    }, [detalles, selectedVenta]);

    const selectedVentaData = ventas.find((v) => v.id_venta === selectedVenta) || null;

    useEffect(() => {
        if (!selectedDetalleId || !selectedDetalleRef.current) return;

        selectedDetalleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [selectedDetalleId, detalles.length]);

    return (
        <>
            <PageMeta title="Ventas | Inventario Lembo" description="Listado de ventas y sus detalles" />
            <PageBreadcrumb pageTitle="Ventas" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link
                            to="/ventas/create"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
                            Nueva venta
                        </Link>
                        {selectedVenta && (
                            <>
                                <Link
                                    to={`/ventas/edit/${selectedVenta}`}
                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#71277A] px-4 text-sm font-medium text-white transition hover:bg-[#71277A]/90"
                                >
                                    Editar venta
                                </Link>
                                <Link
                                    to={`/detalle-ventas/create`}
                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#f8c315] px-4 text-sm font-medium text-white transition hover:bg-[#f1bb0a]"
                                >
                                    Nuevo detalle
                                </Link>
                            </>
                        )}
                        <select
                            value={selectedVenta ?? 0}
                            onChange={(e) => setSelectedVenta(Number(e.target.value) || null)}
                            className="h-11 w-80 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                        >
                            <option value={0} disabled>
                                {loading ? "Cargando ventas..." : "Selecciona una venta"}
                            </option>
                            {ventasHoy.map((v) => (
                                <option key={v.id_venta} value={v.id_venta}>
                                    {v.nombre_comprador} {v.fecha_venta ? ` - ${new Date(v.fecha_venta).toLocaleDateString()}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar ventas..."
                            className="h-10 w-60 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-40"
                        />
                    </div>
                </div>

                {/* Venta summary */}
                <div className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando ventas...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : selectedVentaData ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Comprador</label>
                                <div className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-black">
                                    {selectedVentaData.nombre_comprador}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Identificación</label>
                                <div className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-black">
                                    {selectedVentaData.id_comprador ?? "-"}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de venta</label>
                                <div className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-black">
                                    {selectedVentaData.fecha_venta ? new Date(selectedVentaData.fecha_venta).toLocaleString() : "-"}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                                <div className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-black">
                                    {selectedVentaData.total_venta ? `$ ${selectedVentaData.total_venta}` : "-"}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 text-sm text-gray-500">No hay venta seleccionada.</div>
                    )}
                </div>

                {/* Detalles table */}
                <div className="overflow-x-auto px-5 pb-3">
                    <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
                        <colgroup>
                            <col className="w-64" />
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-36" />
                            <col className="w-32" />
                        </colgroup>
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cantidad</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unidad</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Precio</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Acciones</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredDetalles.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay detalles para esta venta.</td>
                                </tr>
                            ) : (
                                filteredDetalles.map((det) => (
                                    <tr
                                        key={det.id_detalle_venta}
                                        ref={det.id_detalle_venta === selectedDetalleId ? selectedDetalleRef : null}
                                        className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${det.id_detalle_venta === selectedDetalleId ? "bg-brand-50/70 dark:bg-brand-500/10" : ""}`}
                                    >
                                        <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">{det.nombre_producto}</td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-800 dark:text-gray-400">{det.cantidad}</td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-800 dark:text-gray-400">{det.simbolo}</td>
                                        <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">$ {det.precio_venta}</td>
                                        <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">$ {det.precio_venta * det.cantidad}</td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{det.estado_venta}</td>
                                        <td className="px-3 py-4 text-center">
                                            <Link
                                                to={`/detalle-ventas/edit/${det.id_detalle_venta}`}
                                                className="inline-flex h-10 w-20 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
                                            >
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
