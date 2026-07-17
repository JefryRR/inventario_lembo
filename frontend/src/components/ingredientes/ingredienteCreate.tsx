import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PlatoOption = {
    id_plato: number;
    nombre_plato: string;
};

type ProductoOption = {
    id_inventario: number;
    nombre_producto: string;
    cantidad: number;
    simbolo: string;
    fecha_vencimiento: string;
};

type InsumoOption = {
    id_insumo: number;
    nombre_producto: string;
    cantidad: number;
    simbolo: string;
    tipo_id: number;
    fecha_vencimiento: string;
};

type ComercializacionOption = {
    id_comercializacion: number;
    nombre_producto: string;
    cant_no_vendida: number;
    simbolo: string;
    fecha_vencimiento: string;
};

type MedidaOption = {
    id_unidad: number;
    simbolo: string;
};

// Un ingrediente que el usuario ya agregó a la lista, listo para enviarse al backend
type ItemIngrediente = {
    clientId: string; // id temporal solo para el frontend (key de React y para poder eliminarlo)
    origen_inv: number;
    inventario_id: number;
    nombre_producto: string;
    cantidad: number;
    unid_med_id: number;
    simbolo_medida: string;
};

// Campos del ingrediente que se está armando actualmente en el formulario (antes de agregarlo a la lista)
type ItemFormState = {
    origen_inv: number;
    inventario_id: number;
    cant_inv: string | number;
    unid_med_id: number;
};

const initialItemForm: ItemFormState = {
    origen_inv: 0,
    inventario_id: 0,
    cant_inv: "",
    unid_med_id: 0,
};

const getLocalISODate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // Envía "YYYY-MM-DD"
};

export default function IngredienteCreate() {
    const navigate = useNavigate();

    // Dato común a todos los ingredientes que se agreguen
    const [platoId, setPlatoId] = useState(0);

    // Ingrediente que se está llenando en el formulario ahora mismo
    const [itemForm, setItemForm] = useState<ItemFormState>(initialItemForm);

    // Lista de ingredientes ya agregados (todavía no enviados al backend)
    const [items, setItems] = useState<ItemIngrediente[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [loadingPlatos, setLoadingPlatos] = useState(false);
    const [loadingInsumos, setLoadingInsumos] = useState(false);
    const [loadingMedidas, setLoadingMedidas] = useState(false);
    const [loadingComercializacion, setLoadingComercializacion] = useState(false);
    const [productos, setProductos] = useState<ProductoOption[]>([]);
    const [comercializaciones, setComercializaciones] = useState<ComercializacionOption[]>([]);
    const [platos, setPlatos] = useState<PlatoOption[]>([]);
    const [insumos, setInsumos] = useState<InsumoOption[]>([]);
    const [medidas, setMedidas] = useState<MedidaOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadCatalogs = async () => {
            setLoadingProductos(true);
            setLoadingComercializacion(true);
            setLoadingPlatos(true);
            setLoadingInsumos(true);
            setLoadingMedidas(true);

            try {
                const [productosData, platosData, insumosData, medidasData, comercializacionesData] = await Promise.all([
                    apiFetch("inv_produccion/all/produccion"),
                    apiFetch("platos/all-platos"),
                    apiFetch("inv_insumos/all_insumos"),
                    apiFetch("unid-medida/all-unid_medidas"),
                    apiFetch("comercio/disponibles"),
                ]);

                if (!mounted) return;

                const productoList = Array.isArray(productosData?.inv_produccion)
                    ? productosData.inv_produccion
                    : Array.isArray(productosData)
                        ? productosData
                        : [];

                const comercializacionList = Array.isArray(comercializacionesData?.comercializaciones)
                    ? comercializacionesData.comercializaciones
                    : Array.isArray(comercializacionesData)
                        ? comercializacionesData
                        : [];

                const platoList = Array.isArray(platosData?.platos)
                    ? platosData.platos
                    : Array.isArray(platosData)
                        ? platosData
                        : [];

                const insumoList = Array.isArray(insumosData?.inv_insumos)
                    ? insumosData.inv_insumos
                    : Array.isArray(insumosData)
                        ? insumosData
                        : [];


                const medidaList = Array.isArray(medidasData?.medidas)
                    ? medidasData.medidas
                    : Array.isArray(medidasData)
                        ? medidasData
                        : [];

                const fecha_actual = new Date().toISOString().slice(0, 10);
                
                const productosVigentes = productoList.filter((p: ProductoOption) => {
                    const noVencido = p.fecha_vencimiento
                        ? p.fecha_vencimiento.slice(0, 10) > fecha_actual
                        : true;
                    const conStock = p.cantidad > 0;
                    return noVencido && conStock;
                });

                const insumosVigentes = insumoList.filter((i: InsumoOption) => {
                    const noVencido = i.fecha_vencimiento
                        ? i.fecha_vencimiento.slice(0, 10) > fecha_actual
                        : true;
                    const conStock = i.cantidad > 0;
                    const esTipoInsumo = i.tipo_id === 2; // Filtrar solo insumos (tipo_id === 1)
                    return noVencido && conStock && esTipoInsumo;
                });

                const comercializacionesVigentes = comercializacionList.filter((c: ComercializacionOption) => {
                    const noVencido = c.fecha_vencimiento
                        ? c.fecha_vencimiento.slice(0, 10) > fecha_actual
                        : true;
                    return noVencido;
                });

                setProductos(productosVigentes);
                setPlatos(platoList);
                setInsumos(insumosVigentes);
                setMedidas(medidaList);
                setComercializaciones(comercializacionesVigentes);

            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los ingredientes, insumos o unidades de medida");
            } finally {
                if (mounted) {
                    setLoadingProductos(false);
                    setLoadingPlatos(false);
                    setLoadingInsumos(false);
                    setLoadingMedidas(false);
                    setLoadingComercializacion(false);
                }
            }
        };

        loadCatalogs();

        return () => {
            mounted = false;
        };
    }, []);

    const handleItemChange =
        (field: keyof ItemFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;

                // Si cambia el origen, reiniciamos el inventario_id seleccionado para evitar inconsistencias
                if (field === "origen_inv") {
                    setItemForm((current) => ({
                        ...current,
                        origen_inv: Number(value),
                        inventario_id: 0,
                    }));
                    return;
                }

                if (field === "inventario_id" || field === "unid_med_id") {
                    setItemForm((current) => ({
                        ...current,
                        [field]: Number(value),
                    }));
                    return;
                }

                setItemForm((current) => ({
                    ...current,
                    [field]: value,
                }));
            };

    // Cuánto de un producto/insumo ya está reservado en la lista (por si el usuario lo agrega en dos tandas)
    const cantidadYaAgregada = (origenInv: number, inventarioId: number) =>
        items
            .filter((item) => item.origen_inv === origenInv && item.inventario_id === inventarioId)
            .reduce((total, item) => total + item.cantidad, 0);

    const handleAddItem = () => {
        setError(null);

        if (!itemForm.origen_inv) {
            setError("Selecciona el origen de inventario");
            return;
        }

        if (!itemForm.inventario_id) {
            setError("Selecciona un producto");
            return;
        }

        if (!itemForm.unid_med_id) {
            setError("Selecciona una unidad de medida");
            return;
        }

        const cantidadValue = parseFloat(String(itemForm.cant_inv));
        if (Number.isNaN(cantidadValue) || cantidadValue <= 0) {
            setError("La cantidad debe ser un número mayor a 0");
            return;
        }

        const origenSeleccionado =
            itemForm.origen_inv === 1
                ? productos.find((producto) => producto.id_inventario === itemForm.inventario_id)
                : itemForm.origen_inv === 2
                ? insumos.find((insumo) => insumo.id_insumo === itemForm.inventario_id)
                : comercializaciones.find((com) => com.id_comercializacion === itemForm.inventario_id);

        if (origenSeleccionado) {
            // "comercializacion" usa cant_no_vendida en vez de cantidad
            const cantidadBase =
                itemForm.origen_inv === 3
                    ? Number((origenSeleccionado as ComercializacionOption).cant_no_vendida || 0)
                    : Number((origenSeleccionado as any).cantidad || 0);

            const disponible = cantidadBase - cantidadYaAgregada(itemForm.origen_inv, itemForm.inventario_id);

            if (cantidadValue > disponible) {
                setError(`Solo hay ${disponible} ${origenSeleccionado.simbolo || ""} disponibles de "${origenSeleccionado.nombre_producto}"`);
                return;
            }

            // Validar fecha de vencimiento solo para comercialización
            if (itemForm.origen_inv === 3) {
                const fechaVenc = new Date((origenSeleccionado as ComercializacionOption).fecha_vencimiento);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);

                if (fechaVenc < hoy) {
                    setError(`El producto "${origenSeleccionado.nombre_producto}" está vencido y no puede utilizarse.`);
                    return;
                }
            }
        }

        const medidaSeleccionada = medidas.find((medida) => medida.id_unidad === itemForm.unid_med_id);

        const nuevoItem: ItemIngrediente = {
            clientId: crypto.randomUUID(),
            origen_inv: itemForm.origen_inv,
            inventario_id: itemForm.inventario_id,
            nombre_producto: origenSeleccionado?.nombre_producto || "Producto",
            cantidad: cantidadValue,
            unid_med_id: itemForm.unid_med_id,
            simbolo_medida: medidaSeleccionada?.simbolo || "",
        };

        setItems((current) => [...current, nuevoItem]);
        // Reiniciamos solo los campos del ingrediente; el plato queda igual para el siguiente
        setItemForm(initialItemForm);
    };

    const handleRemoveItem = (clientId: string) => {
        setItems((current) => current.filter((item) => item.clientId !== clientId));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!platoId) {
            setError("Debes seleccionar un plato");
            return;
        }

        if (items.length === 0) {
            setError("Agrega al menos un producto antes de guardar los ingredientes");
            return;
        }

        setLoading(true);

        const errores: string[] = [];
        let ultimoIdIngrediente: number | undefined;

        // Enviamos un ingrediente a la vez porque el backend registra un ingrediente por producto.
        for (const item of items) {
            try {
                const payload = {
                    plato_id: Number(platoId),
                    cant_inv: item.cantidad,
                    inventario_id: item.inventario_id,
                    unid_med_id: item.unid_med_id,
                    origen_inv: item.origen_inv,
                    fecha_registro: getLocalISODate(),
                };

                const data = await apiFetch("ingredientes/crear", {
                    method: "POST",
                    body: payload,
                });

                ultimoIdIngrediente = data?.id_ingrediente ?? ultimoIdIngrediente;

                // Si se guardó bien, lo quitamos de la lista pendiente para que, si algo más falla,
                // el usuario vea claramente qué le falta por reintentar.
                setItems((current) => current.filter((current_item) => current_item.clientId !== item.clientId));
            } catch (requestError: any) {
                errores.push(`${item.nombre_producto}: ${requestError?.detail || requestError?.message || "error desconocido"}`);
            }
        }

        setLoading(false);

        if (errores.length > 0) {
            setError(`No se pudieron guardar algunos productos: ${errores.join(" | ")}`);
            return;
        }

        setSuccess("Ingredientes registrados correctamente");
        navigate("/ingredientes", { state: { selectIngredienteId: ultimoIdIngrediente } });
    };

    return (
        <>
            <PageMeta title="Crear ingrediente | Inventario Lembo" description="Formulario para crear un nuevo ingrediente" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo ingrediente</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Registra uno o varios productos como ingredientes de un plato.
                        </p>
                    </div>

                    <Link
                        to="/ingredientes"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ingredientes
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {/* Dato común a todos los ingredientes */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Plato <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={platoId}
                                onChange={(event) => setPlatoId(Number(event.target.value))}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                disabled={loadingPlatos || platos.length === 0}
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loadingPlatos ? "Cargando platos..." : "Selecciona un plato"}
                                </option>
                                {platos.map((plato) => (
                                    <option className="dark:text-black/90" key={plato.id_plato} value={plato.id_plato}>
                                        {plato.nombre_plato}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="my-6 border-t border-dashed border-gray-200 dark:border-gray-800" />

                    {/* Formulario para armar UN producto a la vez */}
                    <h4 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Agregar producto</h4>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {/* Origen de Inventario */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Origen de Inventario <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={itemForm.origen_inv}
                                onChange={handleItemChange("origen_inv")}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                            >
                                <option className="dark:text-black/90" value={0} disabled>Selecciona el origen</option>
                                <option className="dark:text-black/90" value={1}>Inventario de Producción</option>
                                <option className="dark:text-black/90" value={2}>Inventario de Insumos</option>
                                <option className="dark:text-black/90" value={3}>Comercializacion</option>
                            </select>
                        </div>

                        {/* Producto dinámico (Producción o Insumo) */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Producto <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={itemForm.inventario_id}
                                onChange={handleItemChange("inventario_id")}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                disabled={
                                    itemForm.origen_inv === 0 ||
                                    (itemForm.origen_inv === 1
                                        ? productos.length === 0
                                        : itemForm.origen_inv === 2
                                        ? insumos.length === 0
                                        : comercializaciones.length === 0)
                                }
                            >
                                <option className="dark:text-black/90" value={0} disabled>
                                    {itemForm.origen_inv === 0
                                        ? "Primero selecciona el origen"
                                        : itemForm.origen_inv === 1 && loadingProductos
                                            ? "Cargando producción..."
                                            : itemForm.origen_inv === 2 && loadingInsumos
                                                ? "Cargando insumos..."
                                                : itemForm.origen_inv === 3 && loadingComercializacion
                                                    ? "Cargando comercialización..."
                                                    : "Selecciona un producto"}
                                </option>

                                {itemForm.origen_inv === 1 && productos.map((producto) => (
                                    <option className="dark:text-black/90" key={producto.id_inventario} value={producto.id_inventario}>
                                        {producto.nombre_producto} cantidad: {producto.cantidad} {producto.simbolo}
                                    </option>
                                ))}

                                {itemForm.origen_inv === 2 && insumos.map((insumo) => (
                                    <option className="dark:text-black/90" key={insumo.id_insumo} value={insumo.id_insumo}>
                                        {insumo.nombre_producto} cantidad: {insumo.cantidad} {insumo.simbolo}
                                    </option>
                                ))}

                                {itemForm.origen_inv === 3 && comercializaciones.map((comercial) => (
                                    <option className="dark:text-black/90" key={comercial.id_comercializacion} value={comercial.id_comercializacion}>
                                        {comercial.nombre_producto} cantidad: {comercial.cant_no_vendida} {comercial.simbolo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cantidad */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cantidad <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={itemForm.cant_inv}
                                onChange={handleItemChange("cant_inv")}
                                min={0.01}
                                step="any"
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                                placeholder="0"
                            />
                        </div>

                        {/* Unidad de medida */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Unidad de medida <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={itemForm.unid_med_id}
                                onChange={handleItemChange("unid_med_id")}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                disabled={loadingMedidas || medidas.length === 0}
                            >
                                <option className="dark:text-black/90" value={0} disabled>
                                    {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                                </option>
                                {medidas.map((medida) => (
                                    <option className="dark:text-black/90" key={medida.id_unidad} value={medida.id_unidad}>
                                        {medida.simbolo}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="inline-flex items-center justify-center rounded-lg border border-green-600 px-5 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-500/10"
                        >
                            + Agregar producto a la lista
                        </button>
                    </div>

                    {/* Lista de productos ya agregados */}
                    {items.length > 0 && (
                        <div className="mt-6">
                            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                                Productos agregados ({items.length})
                            </h4>
                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3">Producto</th>
                                            <th className="px-4 py-3">Origen</th>
                                            <th className="px-4 py-3">Cantidad</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.clientId} className="border-t border-gray-100 dark:border-gray-800">
                                                <td className="px-4 py-3 text-gray-800 dark:text-white/90">{item.nombre_producto}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {item.origen_inv === 1 ? "Producción" : item.origen_inv === 2 ? "Insumo" : "Comercialización"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {item.cantidad} {item.simbolo_medida}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.clientId)}
                                                        className="text-xs font-medium text-error-600 hover:underline dark:text-error-400"
                                                    >
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

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
                            disabled={loading || items.length === 0}
                            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : `Guardar ingredientes (${items.length})`}
                        </button>
                        <Link
                            to="/ingredientes"
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
