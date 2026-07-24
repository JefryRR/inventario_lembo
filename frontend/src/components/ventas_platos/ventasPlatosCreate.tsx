import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Definición de tipos para el estado del formulario de creación de ventas de platos
type VentasPlatosFormState = {
    plato_id: number;
    cantidad: string | number;
    precio: string | number;
    fecha_venta: string;
    nombre_plato: string;
};

type PlatoOption = {
    id_plato: number;
    nombre_plato: string;
};

// Estado inicial del formulario para crear una nueva venta de plato
const initialState: VentasPlatosFormState = {
    plato_id: 0,
    cantidad: "" as string | number,
    precio: "" as string | number,
    fecha_venta: "",
    nombre_plato: "",
};

// Componente principal para crear una nueva venta de plato
export default function VentasPlatosCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<VentasPlatosFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingPlatos, setLoadingPlatos] = useState(false);
    const [platos, setPlatos] = useState<PlatoOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadCatalogs = async () => {
            setLoadingPlatos(true);

            try {
                const [platosData] = await Promise.all([
                    apiFetch("platos/all-platos"),
                ]);

                if (!mounted) return;

                const platoList = Array.isArray(platosData?.platos)
                    ? platosData.platos
                    : Array.isArray(platosData)
                        ? platosData
                        : [];

                setPlatos(platoList);

            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar las ventas de platos");
            } finally {
                if (mounted) {
                    setLoadingPlatos(false);
                }
            }
        };

        loadCatalogs();

        return () => {
            mounted = false;
        };
    }, []);

    // Función para manejar los cambios en los campos del formulario de creación de ventas de platos
    const handleChange =
        (field: keyof VentasPlatosFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;

            if (field === "plato_id" || field === "cantidad" || field === "precio") {
                setForm((current) => ({
                    ...current,
                    [field]: field === "cantidad" || field === "precio" ? Number(value) : value,
                }));
                return;
            }
        };

    // Función para obtener la fecha actual en formato local (YYYY-MM-DD)
    const getLocalISODate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    // Función para manejar el envío del formulario de creación de ventas de platos
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validación del campo de cantidad para asegurarse de que sea un número mayor a 0
        const cantidadValue = parseFloat(String(form.cantidad));

        if (isNaN(cantidadValue) || cantidadValue <= 0) {
            setError("La cantidad debe ser un número mayor a 0");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                plato_id: Number(form.plato_id),
                cantidad: cantidadValue,
                precio: Number(form.precio),
                fecha_venta: getLocalISODate(),
            };

            const data = await apiFetch("venta_platos/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Venta de plato registrada correctamente");
            setForm(initialState);
            navigate("/venta_platos", { state: { selectVentaId: data?.id_venta_plato } });
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "Ocurrió un error al registrar la venta de plato");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta title="Crear venta de plato | Inventario Lembo" description="Formulario para crear una nueva venta de plato" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva venta de plato</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la venta de plato.
                        </p>
                    </div>

                    <Link
                        to="/venta_platos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ventas de platos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {/* Plato*/}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Plato <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.plato_id}
                                onChange={handleChange("plato_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                disabled={loadingPlatos || platos.length === 0}
                            >
                                <option className="dark:text-black" value={0} disabled>
                                    {loadingPlatos ? "Cargando platos..." : "Selecciona un plato"}
                                </option>
                                {platos.map((plato) => (
                                    <option className="dark:text-black" key={plato.id_plato} value={plato.id_plato}>
                                        {plato.nombre_plato}
                                    </option>
                                ))}
                            </select>
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
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                                min={0}
                            />
                        </div>

                        {/* Cantidad */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cantidad <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.cantidad}
                                onChange={handleChange("cantidad")}
                                min={1}
                                step="any"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                            />
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
                            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Guardar venta"}
                        </button>
                        <Link
                            to="/venta_platos"
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