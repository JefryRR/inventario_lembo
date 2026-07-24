import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Tipos de datos para la edición del formulario del inventario de perdidas
type Inv_perdFormState = {
    id_perdida: number
    cantidad: number
    motivo: string
    unid_medida_id: string
    observaciones: string
    simbolo: string
    origen: string
    nombre_producto: string
};

type Unid_medOption = {
    id_unidad: number;
    simbolo: string;
};

type MotivoOption = {
    value: string;
    label: string;
};

// Opciones de motivos para el formulario de inventario de perdidas
const motivoOptions: MotivoOption[] = [
    { value: "contaminacion", label: "Contaminación" },
    { value: "extravio", label: "Extravio" },
    { value: "vencimiento", label: "Vencimiento" },
    { value: "robo", label: "Robo" },
    { value: "daño_fisico", label: "Dañado" },
];

// Estado inicial para el formulario de edición del inventario de perdidas
const emptyState: Inv_perdFormState = {
    id_perdida: 0,
    cantidad: 0,
    motivo: "",
    unid_medida_id: "",
    observaciones: "",
    simbolo: "",
    origen: "",
    nombre_producto: ""

};

// Componente principal para editar una perdida de inventario
export default function Inv_perdEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<Inv_perdFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [invPerdData, UnidMedidasData] = await Promise.all([
                    apiFetch(`inv_perdida/by-id?id=${id}`),
                    apiFetch(`unid-medida/all-unid_medidas`),
                ]);

                if (!mounted) return;

                const unidMedList = Array.isArray(UnidMedidasData?.unid_medidas) ? UnidMedidasData.unid_medidas :
                    Array.isArray(UnidMedidasData) ? UnidMedidasData : [];

                setForm({
                    id_perdida: Number(invPerdData?.id_perdida ?? 0),
                    cantidad: Number(invPerdData?.cantidad ?? 0),
                    unid_medida_id: invPerdData?.unid_medida_id ? String(invPerdData.unid_medida_id) : "",
                    motivo: invPerdData?.motivo || "",
                    observaciones: invPerdData?.observaciones || "",
                    simbolo: invPerdData?.simbolo || "",
                    origen: invPerdData?.origen || "",
                    nombre_producto: invPerdData?.nombre_producto || ""
                });
                setUnidMedidas(unidMedList);


            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el registro de la perdida");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    // Handler para actualizar el estado del formulario de perdida
    const handleChange =
        (field: keyof Inv_perdFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    // Función para manejar el envío del formulario de perdida
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                id_perdida: form.id_perdida,
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                motivo: form.motivo.trim(),
                observaciones: form.observaciones.trim(),
                simbolo: form.simbolo.trim()
            };

            await apiFetch(`inv_perdida/update-perdida-by-id/${id}`, { method: "PUT", body: payload });
            setSuccess("Perdida actualizada correctamente");
            setTimeout(() => navigate("/invPerd"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar la perdida");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar perdida</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos de la perdida.</p>
                    </div>

                    <Link to="/invPerd" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a perdidas</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando perdida...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre producto </label>
                                    <input type="text" value={form.nombre_producto} readOnly placeholder="100" className=" h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm text-gray-600 outline-none curson-not-allowed dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Origen </label>
                                    <input type="text" value={form.origen} readOnly placeholder="100" className="readonly h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm text-gray-600 outline-none curson-not-allowed dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad <span className="text-error-500">*</span></label>
                                    <input type="number" value={form.cantidad} onChange={handleChange("cantidad")} placeholder="100" className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Unidad de medida <span className="text-error-500">*</span></label>
                                    <select value={form.unid_medida_id} onChange={handleChange("unid_medida_id")}
                                        className="h-11 w-full rounded-lg border focus:ring-gray-500 focus:border-gray-300 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.unid_medida_id && !unidMedidas.some((unidMed) => String(unidMed.id_unidad) === form.unid_medida_id) && (
                                            <option className="dark:text-black" value={form.unid_medida_id}>{form.simbolo || "Unidad asignada"}</option>
                                        )}
                                        {unidMedidas.map((unidMed) => (
                                            <option className="dark:text-black" key={unidMed.id_unidad} value={String(unidMed.id_unidad)}>
                                                {unidMed.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo <span className="text-error-500">*</span></label>
                                    <select value={form.motivo} onChange={handleChange("motivo")} className="h-11 w-full rounded-lg border focus:ring-gray-500 focus:border-gray-300 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        <option className="dark:text-black" value="">
                                            Seleccione un motivo
                                        </option>
                                        {motivoOptions.map((option) => (
                                            <option className="dark:text-black" key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                                    <input type="text" value={form.observaciones} onChange={handleChange("observaciones")} placeholder="Ingrese observaciones" className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" />
                                </div>

                            </div>

                            {error && (
                                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
                            )}

                            {success && (
                                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{success}</div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar producto"}
                                </button>
                                <Link to="/invPerd"
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
                                    Cancelar
                                </Link>
                            </div>
                        </>
                    )}
                </form>
            </div >
        </>
    );
}
