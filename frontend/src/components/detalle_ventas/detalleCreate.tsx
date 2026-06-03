import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type EstadoVenta = "Vendido" | "Separado" | "Anulado";

type DetalleFormState = {
    cantidad: number;
    unid_medida_id: number;
    precio_venta: string;
    inv_prod_id: number;
    venta_id: number;
    estado_venta: EstadoVenta;
};

type ProductoOption = {
    id_inventario: number;
    nombre_producto: string;
    nombre_lote?: string;
    cantidad?: number;
    simbolo?: string;
};

type VentaOption = {
    id_venta: number;
    nombre_comprador: string;
    fecha_venta?: string;
};

type MedidaOption = {
    id_unidad: number;
    simbolo: string;
};

const ESTADO_OPTIONS: Array<{ value: EstadoVenta; label: string }> = [
    { value: "Vendido", label: "Vendido" },
    { value: "Separado", label: "Separado" },
    { value: "Anulado", label: "Anulado" },
];

const initialState: DetalleFormState = {
    cantidad: 0,
    unid_medida_id: 0,
    precio_venta: "",
    inv_prod_id: 0,
    venta_id: 0,
    estado_venta: "Separado",
};

function toCurrencyValue(value: string): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export default function DetalleCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<DetalleFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [loadingMedidas, setLoadingMedidas] = useState(false);
    const [productos, setProductos] = useState<ProductoOption[]>([]);
    const [ventas, setVentas] = useState<VentaOption[]>([]);
    const [medidas, setMedidas] = useState<MedidaOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadCatalogs = async () => {
            setLoadingProductos(true);
            setLoadingVentas(true);
            setLoadingMedidas(true);

            try {
                const [productosData, ventasData, medidasData] = await Promise.all([
                    apiFetch("inv_produccion/all/produccion"),
                    apiFetch("ventas/all/ventas"),
                    apiFetch("unid-medida/all-unid_medidas"),
                ]);

                if (!mounted) return;

                const productoList = Array.isArray(productosData?.produccion)
                    ? productosData.produccion
                    : Array.isArray(productosData)
                        ? productosData
                        : [];

                const ventaList = Array.isArray(ventasData?.ventas)
                    ? ventasData.ventas
                    : Array.isArray(ventasData)
                        ? ventasData
                        : [];

                const medidaList = Array.isArray(medidasData?.medidas)
                    ? medidasData.medidas
                    : Array.isArray(medidasData)
                        ? medidasData
                        : [];

                setProductos(productoList);
                setVentas(ventaList);
                setMedidas(medidaList);
                // Preseleccionar venta desde query string si existe
                try {
                    const params = new URLSearchParams(location.search);
                    const ventaIdParam = Number(params.get("venta_id") || 0);
                    if (ventaIdParam > 0) {
                        setForm((current) => ({ ...current, venta_id: ventaIdParam }));
                    }
                } catch (e) {
                    // ignore
                }
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los catálogos");
            } finally {
                if (mounted) {
                    setLoadingProductos(false);
                    setLoadingVentas(false);
                    setLoadingMedidas(false);
                }
            }
        };

        loadCatalogs();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof DetalleFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;

            if (field === "cantidad" || field === "unid_medida_id" || field === "inv_prod_id" || field === "venta_id") {
                setForm((current) => ({
                    ...current,
                    [field]: Number(value),
                }));
                return;
            }

            setForm((current) => ({
                ...current,
                [field]: value as EstadoVenta,
            }));
        };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (form.cantidad <= 0) {
            setError("La cantidad debe ser mayor a cero");
            setLoading(false);
            return;
        }

        if (toCurrencyValue(form.precio_venta) <= 0) {
            setError("El precio de venta debe ser mayor a cero");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                precio_venta: Number(form.precio_venta),
                inv_prod_id: Number(form.inv_prod_id),
                venta_id: Number(form.venta_id),
                estado_venta: form.estado_venta,
            };

            const data = await apiFetch("detalles-venta/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Detalle de venta registrado correctamente");
            setForm(initialState);
            navigate("/ventas");
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "Ocurrió un error al registrar el detalle de venta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta title="Crear detalle de venta | Inventario Lembo" description="Formulario para crear un nuevo detalle de venta" />
            <PageBreadcrumb pageTitle="Crear detalle de venta" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo detalle de venta</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el detalle de la venta.
                        </p>
                    </div>

                    <Link
                        to="/ventas"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ventas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Venta <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.venta_id}
                                onChange={handleChange("venta_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                                disabled={loadingVentas || ventas.length === 0}
                            >
                                <option value={0} disabled>
                                    {loadingVentas ? "Cargando ventas..." : "Selecciona una venta"}
                                </option>
                                {ventas.map((venta) => (
                                    <option key={venta.id_venta} value={venta.id_venta}>
                                        {venta.nombre_comprador}
                                        {venta.fecha_venta ? ` - ${new Date(venta.fecha_venta).toLocaleDateString()}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Producto <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.inv_prod_id}
                                onChange={handleChange("inv_prod_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                                disabled={loadingProductos || productos.length === 0}
                            >
                                <option value={0} disabled>
                                    {loadingProductos ? "Cargando productos..." : "Selecciona un producto"}
                                </option>
                                {productos.map((producto) => (
                                    <option key={producto.id_inventario} value={producto.id_inventario}>
                                        {producto.nombre_producto}
                                        {producto.nombre_lote ? ` - ${producto.nombre_lote}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cantidad <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.cantidad}
                                onChange={handleChange("cantidad")}
                                min={1}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Precio de venta <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.precio_venta}
                                onChange={handleChange("precio_venta")}
                                placeholder="12500"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Unidad de medida <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.unid_medida_id}
                                onChange={handleChange("unid_medida_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                                disabled={loadingMedidas || medidas.length === 0}
                            >
                                <option value={0} disabled>
                                    {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                                </option>
                                {medidas.map((medida) => (
                                    <option key={medida.id_unidad} value={medida.id_unidad}>
                                        {medida.simbolo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Estado de venta <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.estado_venta}
                                onChange={handleChange("estado_venta")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                {ESTADO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                            {success}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Guardar detalle"}
                        </button>
                        <Link
                            to="/ventas"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}
