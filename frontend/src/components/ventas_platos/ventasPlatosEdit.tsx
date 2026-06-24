import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type VentasPlatosFormState = {
    plato_id: number;
    cantidad: string | number;
    precio: string | number;
    fecha_venta: string;
    nombre_plato?: string;
};

type PlatoOption = {
    id_plato: number;
    nombre_plato: string;
};

type VentasPlatosResponse = {
    id_venta_plato: number;
    plato_id: number;
    cantidad: number;
    precio: number;
    fecha_venta: string;
    nombre_plato?: string;
};

const initialState: VentasPlatosFormState = {
    plato_id: 0,
    cantidad: 0,
    precio: 0,
    fecha_venta: "",
};

export default function VentasPlatosEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<VentasPlatosFormState>(initialState);
    const [platos, setPlatos] = useState<PlatoOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("No se encontró el identificador de la venta de plato.");
            return;
        }

        let mounted = true;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [ventasPlatosData, platosData] = await Promise.all([
                    apiFetch(`venta_platos/by-id?id=${id}`),
                    apiFetch("platos/all-platos"),
                ]);

                if (!mounted) return;

                const ventasPlatos = ventasPlatosData as VentasPlatosResponse;

                const platoList = Array.isArray(platosData?.platos)
                    ? platosData.platos
                    : Array.isArray(platosData)
                        ? platosData
                        : [];

                setPlatos(platoList);

                setForm({
                    plato_id: Number(ventasPlatos?.plato_id ?? 0),
                    cantidad: Number(ventasPlatos?.cantidad ?? 0),
                    precio: Number(ventasPlatos?.precio ?? 0),
                    fecha_venta: String(ventasPlatos?.fecha_venta ?? ""),
                    nombre_plato: ventasPlatos?.nombre_plato ?? "",
                });
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudo cargar la venta de plato");
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
        (field: keyof VentasPlatosFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;

            if (field === "plato_id" || field === "cantidad" || field === "precio") {
                setForm((current) => ({
                    ...current,
                    [field]: field === "cantidad" ? value : Number(value),
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

        const cantidadValue = parseFloat(String(form.cantidad));

        if (isNaN(cantidadValue) || cantidadValue <= 0) {
            setError("La cantidad debe ser un número mayor a 0");
            setSaving(false);
            return;
        }

        try {
            const payload = {
                cantidad: cantidadValue,
                plato_id: Number(form.plato_id),
                precio: Number(form.precio),
                fecha_venta: form.fecha_venta,
            };

            const data = await apiFetch(`venta_platos/by_id/${id}`, {
                method: "PUT",
                body: payload,
            });

            setSuccess(data?.message || "Venta actualizada correctamente");
            setTimeout(() => {
                navigate("/venta_platos");
            }, 1500);
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "No se pudo actualizar la venta");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar venta | Inventario Lembo" description="Formulario para editar una venta existente" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar venta</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Modifica los datos de la venta seleccionada.</p>
                    </div>

                    <Link
                        to="/venta_platos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ventas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando datos de la venta...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {/* Plato */}
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

                                {/* Cantidad */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Cantidad <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.cantidad}
                                        onChange={handleChange("cantidad")}
                                        min={1}
                                        step="any"
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                                        required
                                    />
                                </div>

                                {/* Precio */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Precio <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.precio}
                                        onChange={handleChange("precio")}
                                        min={1}
                                        step="any"
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                                        required
                                    />
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
                                    {saving ? "Guardando..." : "Actualizar venta"}
                                </button>
                                <Link
                                    to="/venta_platos"
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