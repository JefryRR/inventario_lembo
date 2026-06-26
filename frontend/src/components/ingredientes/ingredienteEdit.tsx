import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type IngredienteFormState = {
    plato_id: number;
    origen_inv: number;
    inventario_id: number;
    cant_inv: string | number;
    unid_med_id: number;
    nombre_producto?: string;
    nombre_plato?: string;
    simbolo?: string;
};

type PlatoOption = {
    id_plato: number;
    nombre_plato: string;
};

type ProductoOption = {
    id_inventario: number;
    nombre_producto: string;
    cantidad: number;
    simbolo: string;
};

type InsumoOption = {
    id_insumo: number;
    nombre_producto: string;
    cantidad: number;
    simbolo: string;
    tipo_id: number;
    fecha_vencimiento: string;
};

type MedidaOption = {
    id_unidad: number;
    simbolo: string;
};

type IngredienteResponse = {
    id_ingrediente: number;
    plato_id: number;
    origen_inv: number;
    cant_inv: number;
    unid_med_id: number;
    inventario_id: number;
    nombre_producto?: string;
    nombre_plato?: string;
    simbolo?: string;
};

const initialState: IngredienteFormState = {
    plato_id: 0,
    origen_inv: 0,
    inventario_id: 0,
    cant_inv: "",
    unid_med_id: 0,
};

export default function IngredienteEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<IngredienteFormState>(initialState);
    const [productos, setProductos] = useState<ProductoOption[]>([]);
    const [insumos, setInsumos] = useState<InsumoOption[]>([]);
    const [platos, setPlatos] = useState<PlatoOption[]>([]);
    const [medidas, setMedidas] = useState<MedidaOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("No se encontró el identificador del ingrediente");
            return;
        }

        let mounted = true;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [ingredienteData, productosData, insumosData, medidasData, platosData] = await Promise.all([
                    apiFetch(`ingredientes/by-id?id=${id}`),
                    apiFetch("inv_produccion/all/produccion"),
                    apiFetch("inv_insumos/all_insumos"),
                    apiFetch("unid-medida/all-unid_medidas"),
                    apiFetch("platos/all-platos"),
                ]);

                if (!mounted) return;

                const ingrediente = ingredienteData as IngredienteResponse;

                const productoList = Array.isArray(productosData?.produccion)
                    ? productosData.produccion
                    : Array.isArray(productosData)
                        ? productosData
                        : [];

                const platoList = Array.isArray(platosData?.platos)
                    ? platosData.platos
                    : Array.isArray(platosData)
                        ? platosData
                        : [];

                const insumoList = Array.isArray(insumosData?.insumos)
                    ? insumosData.insumos
                    : Array.isArray(insumosData)
                        ? insumosData
                        : [];
                
                const alimentosVigentes = insumoList.filter((insumo: InsumoOption) => {
                    const esAlimento = insumo.tipo_id === 2;
                    const noVencido = new Date(insumo.fecha_vencimiento) >= new Date();
                    return esAlimento && noVencido;
                });

                const medidaList = Array.isArray(medidasData?.medidas)
                    ? medidasData.medidas
                    : Array.isArray(medidasData)
                        ? medidasData
                        : [];

                setProductos(productoList);
                setMedidas(medidaList);
                setPlatos(platoList);
                setInsumos(alimentosVigentes);

                setForm({
                    plato_id: Number(ingrediente?.plato_id ?? 0),
                    origen_inv: Number(ingrediente?.origen_inv ?? 0),
                    cant_inv: Number(ingrediente?.cant_inv ?? 0),
                    unid_med_id: Number(ingrediente?.unid_med_id ?? 0),
                    inventario_id: Number(ingrediente?.inventario_id ?? 0),
                });
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudo cargar el ingrediente");
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [id]);

    const handleChange =
        (field: keyof IngredienteFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;

            // Al cambiar el origen, reseteamos el producto seleccionado para evitar inconsistencias cruzadas
            if (field === "origen_inv") {
                setForm((current) => ({
                    ...current,
                    origen_inv: Number(value),
                    inventario_id: 0,
                }));
                return;
            }

            if (
                field === "cant_inv" ||
                field === "unid_med_id" ||
                field === "inventario_id" ||
                field === "plato_id"
            ) {
                setForm((current) => ({
                    ...current,
                    [field]: field === "cant_inv" ? value : Number(value),
                }));
                return;
            }
        };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        const cantidadValue = parseFloat(String(form.cant_inv));

        if (isNaN(cantidadValue) || cantidadValue <= 0) {
            setError("La cantidad debe ser un número mayor a 0");
            setSaving(false);
            return;
        }

        if (form.origen_inv === 0) {
            setError("Debes seleccionar un origen de inventario");
            setSaving(false);
            return;
        }

        try {
            const payload = {
                cant_inv: cantidadValue,
                unid_med_id: Number(form.unid_med_id),
                inventario_id: Number(form.inventario_id),
                plato_id: Number(form.plato_id),
                origen_inv: Number(form.origen_inv),
            };

            const data = await apiFetch(`ingredientes/by_id/${id}`, {
                method: "PUT",
                body: payload,
            });

            setSuccess(data?.message || "Ingrediente actualizado correctamente");
            setTimeout(() => {
                navigate("/ingredientes");
            }, 1500);
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "No se pudo actualizar el ingrediente");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar ingrediente | Inventario Lembo" description="Formulario para editar un ingrediente existente" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar ingrediente</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Modifica los datos del ingrediente seleccionado.</p>
                    </div>

                    <Link
                        to="/ingredientes"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ingredientes
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando datos del ingrediente...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {/* Plato / Receta */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Plato <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.plato_id}
                                        onChange={handleChange("plato_id")}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                        disabled={platos.length === 0}
                                    >
                                        <option value={0} disabled>Selecciona un plato</option>
                                        {platos.map((plato) => (
                                            <option key={plato.id_plato} value={plato.id_plato}>
                                                {plato.nombre_plato}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selector de Origen de Inventario */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Origen de Inventario <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.origen_inv}
                                        onChange={handleChange("origen_inv")}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                    >
                                        <option value={0} disabled>Selecciona el origen</option>
                                        <option value={1}>Inventario de Producción</option>
                                        <option value={2}>Inventario de Insumos</option>
                                    </select>
                                </div>

                                {/* Selector Dinámico de Producto dependiente del Origen */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Producto / Material <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.inventario_id}
                                        onChange={handleChange("inventario_id")}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                        disabled={form.origen_inv === 0}
                                    >
                                        <option value={0} disabled>
                                            {form.origen_inv === 0 ? "Primero selecciona el origen" : "Selecciona un producto"}
                                        </option>
                                        
                                        {form.origen_inv === 1 && productos.map((producto) => (
                                            <option key={producto.id_inventario} value={producto.id_inventario}>
                                                {producto.nombre_producto} cantidad: {producto.cantidad} {producto.simbolo}
                                            </option>
                                        ))}

                                        {form.origen_inv === 2 && insumos.map((insumo) => (
                                            <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                                {insumo.nombre_producto} cantidad: {insumo.cantidad} {insumo.simbolo}
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
                                        value={form.cant_inv}
                                        onChange={handleChange("cant_inv")}
                                        min={0.01}
                                        step="any"
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                                        required
                                    />
                                </div>

                                {/* Unidad de medida */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Unidad de medida <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.unid_med_id}
                                        onChange={handleChange("unid_med_id")}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                        disabled={medidas.length === 0}
                                    >
                                        <option value={0} disabled>Selecciona una unidad de medida</option>
                                        {medidas.map((medida) => (
                                            <option key={medida.id_unidad} value={medida.id_unidad}>
                                                {medida.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
							</div>

                            {success && (
                                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Guardando..." : "Actualizar ingrediente"}
                                </button>
                                <Link
                                    to="/ingredientes"
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                >
                                    Cancelar
                                </Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}