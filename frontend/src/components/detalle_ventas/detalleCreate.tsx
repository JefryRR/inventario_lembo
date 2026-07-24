import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type EstadoVenta = "Vendido" | "Separado" | "Anulado";

type DetalleFormState = {
    cantidad: string | number;
    unid_medida_id: number;
    precio_venta: string;
    inv_prod_id: number;
    venta_id: number;
    estado_venta: EstadoVenta;
};

type ProductoOption = {
    id_inventario: number;
    nombre_producto: string;
    fecha_vencimiento: string;
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

type ItemCarrito = {
    cantidad: number;
    unid_medida_id: number;
    precio_venta: number;
    inv_prod_id: number;
    venta_id: number;
    estado_venta: EstadoVenta;
    nombre_producto: string;
    simbolo: string;
};


const ESTADO_OPTIONS: Array<{ value: EstadoVenta; label: string }> = [
    { value: "Vendido", label: "Vendido" },
    { value: "Separado", label: "Separado" },
    { value: "Anulado", label: "Anulado" },
];

const initialState: DetalleFormState = {
    cantidad: "" as string | number,
    unid_medida_id: 0,
    precio_venta: "",
    inv_prod_id: 0,
    venta_id: 0,
    estado_venta: "Separado",
};

function fechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
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

                const fecha_actual = new Date().toISOString().slice(0, 10);
                const productosVigentes = productoList.filter((p: ProductoOption) => {
                    const noVencido = p.fecha_vencimiento ? p.fecha_vencimiento.slice(0, 10) > fecha_actual : true;
                    const conStock = (p.cantidad ?? 0) > 0;
                    return noVencido && conStock;
                });
                setProductos(productosVigentes);

                const hoy = fechaLocal(new Date());
                const ventasHoy = ventaList.filter((v: VentaOption) => v.fecha_venta?.slice(0, 10) === hoy);
                setVentas(ventasHoy);
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
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los detalles");
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

    const guardarYAgregarOtro = () => {
        setError(null);
        setSuccess(null);

        if (!form.venta_id) {
            setError("Selecciona una venta.");
            return;
        }
        if (!form.inv_prod_id) {
            setError("Selecciona un producto.");
            return;
        }
        if (!form.cantidad || Number(form.cantidad) <= 0) {
            setError("Ingresa una cantidad válida.");
            return;
        }
        if (!form.unid_medida_id) {
            setError("Selecciona una unidad de medida.");
            return;
        }
        if (!form.precio_venta || Number(form.precio_venta) <= 0) {
            setError("Ingresa un precio de venta válido.");
            return;
        }

        const producto = productos.find(
            p => p.id_inventario === Number(form.inv_prod_id)
        );

        const unidad = medidas.find(
            u => u.id_unidad === Number(form.unid_medida_id)
        );

        const nuevoProducto: ItemCarrito = {
            cantidad: Number(form.cantidad),
            unid_medida_id: Number(form.unid_medida_id),
            precio_venta: Number(form.precio_venta),
            inv_prod_id: Number(form.inv_prod_id),
            venta_id: Number(form.venta_id),
            estado_venta: form.estado_venta,
            nombre_producto: producto?.nombre_producto || "",
            simbolo: unidad?.simbolo || "",
        };

        setCarrito(prev => [...prev, nuevoProducto]);

        setForm(current => ({
            ...current,
            cantidad: "",
            precio_venta: "",
            inv_prod_id: 0,
            unid_medida_id: 0,
            estado_venta: "Separado",
        }));

        setSuccess(`${nuevoProducto.nombre_producto || "Producto"} agregado al carrito.`);
    };

    // Solo quita el producto del carrito en memoria (state de React).
    // Nunca llama a la API: mientras el producto está en el carrito, todavía
    // NO existe en la base de datos. Solo confirmarVenta() lo envía a la BD.
    const quitarDelCarrito = (index: number) => {
        setCarrito(prev => prev.filter((_, i) => i !== index));
    };

    const totalCarrito = carrito.reduce(
        (acumulado, item) => acumulado + item.cantidad * item.precio_venta,
        0
    );

    // FastAPI devuelve los errores 422 como { detail: [{ loc, msg, type }, ...] }.
    // Sin esto, requestError.detail es un array y se mostraba como texto ilegible.
    const extraerMensajeError = (requestError: any): string => {
        const detail = requestError?.detail ?? requestError?.body?.detail;

        if (Array.isArray(detail)) {
            return detail
                .map((d: any) => {
                    const campo = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : "campo";
                    return `${campo}: ${d?.msg ?? "valor inválido"}`;
                })
                .join(" | ");
        }

        if (typeof detail === "string") return detail;

        return requestError?.message || "No se pudo confirmar la venta.";
    };

    const confirmarVenta = async () => {
        setError(null);
        setSuccess(null);

        if (carrito.length === 0) {
            setError("Agrega al menos un producto al carrito antes de confirmar.");
            return;
        }

        setLoading(true);

        try {
            // Se envían de a uno, en secuencia (no en paralelo), para:
            // 1) descartar que apiFetch agrupe llamadas simultáneas al mismo endpoint
            // 2) evitar condiciones de carrera si el backend descuenta stock por producto
            for (const item of carrito) {
                const payload = {
                    cantidad: item.cantidad,
                    unid_medida_id: item.unid_medida_id,
                    precio_venta: item.precio_venta,
                    inv_prod_id: item.inv_prod_id,
                    venta_id: item.venta_id,
                    estado_venta: item.estado_venta,
                };

                console.log("Enviando a detalles-venta/crear:", payload);

                await apiFetch("detalles-venta/crear", {
                    method: "POST",
                    body: payload,
                });
            }

            setSuccess("Venta confirmada correctamente.");
            setCarrito([]);
            navigate("/ventas");
        } catch (requestError: any) {
            console.error("Error al confirmar venta:", requestError);
            setError(extraerMensajeError(requestError));
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
                <form className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Venta <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.venta_id}
                                onChange={handleChange("venta_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                disabled={loadingVentas || ventas.length === 0 || carrito.length > 0}
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loadingVentas ? "Cargando ventas..." : "Selecciona una venta"}
                                </option>
                                {ventas.map((venta) => (
                                    <option className="dark:text-black" key={venta.id_venta} value={venta.id_venta}>
                                        {venta.nombre_comprador}
                                        {venta.fecha_venta ? ` - ${new Date(venta.fecha_venta).toLocaleDateString()}` : ""}
                                    </option>
                                ))}
                            </select>
                            {carrito.length > 0 && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    La venta queda bloqueada mientras haya productos en el carrito.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Producto <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.inv_prod_id}
                                onChange={handleChange("inv_prod_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                disabled={loadingProductos || productos.length === 0}
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loadingProductos ? "Cargando productos..." : "Selecciona un producto"}
                                </option>
                                {productos.map((producto) => (
                                    <option className="dark:text-black" key={producto.id_inventario} value={producto.id_inventario}>
                                        {producto.nombre_producto}
                                        {producto.nombre_lote ? ` - ${producto.nombre_lote}` : ""} - cantidad: {producto.cantidad ?? "N/A"} {producto.simbolo ?? ""}
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
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
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
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                disabled={loadingMedidas || medidas.length === 0}
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                                </option>
                                {medidas.map((medida) => (
                                    <option className="dark:text-black" key={medida.id_unidad} value={medida.id_unidad}>
                                        {medida.simbolo}
                                    </option>
                                ))}
                            </select>
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
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Estado de venta <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.estado_venta}
                                onChange={handleChange("estado_venta")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                            >
                                {ESTADO_OPTIONS.map((option) => (
                                    <option className="dark:text-black" key={option.value} value={option.value}>
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
                    <div className="p-5 lg:p-6">
                        <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="border px-3 py-2">Producto</th>
                                    <th className="border px-3 py-2">Cantidad</th>
                                    <th className="border px-3 py-2">Unidad</th>
                                    <th className="border px-3 py-2">Precio</th>
                                    <th className="border px-3 py-2">Estado</th>
                                    <th className="border px-3 py-2">Opciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-center">
                                {carrito.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-5 text-gray-500">
                                            No hay productos agregados.
                                        </td>
                                    </tr>
                                ) : (
                                    carrito.map((detalle, index) => (
                                        <tr key={index}>
                                            <td className="border px-3 py-2">{detalle.nombre_producto}</td>
                                            <td className="border px-3 py-2">{detalle.cantidad}</td>
                                            <td className="border px-3 py-2">{detalle.simbolo}</td>
                                            <td className="border px-3 py-2">{detalle.precio_venta}</td>
                                            <td className="border px-3 py-2">{detalle.estado_venta}</td>
                                            <td className="border px-3 py-2">
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                                    onClick={() => quitarDelCarrito(index)}
                                                >
                                                    Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>

                            {carrito.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
                                        <td className="border px-3 py-2 text-right" colSpan={3}>
                                            Total
                                        </td>
                                        <td className="border px-3 py-2 text-center" colSpan={3}>
                                            {totalCarrito.toLocaleString("es-CO", {
                                                style: "currency",
                                                currency: "COP",
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={guardarYAgregarOtro}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Agregar al carrito
                        </button>
                        <button
                            type="button"
                            onClick={confirmarVenta}
                            disabled={loading || carrito.length === 0}
                            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Confirmar venta"}
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