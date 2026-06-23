import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type Inv_insumoFormState = {
    id_insumo: string;
    nombre_producto: string;
    cantidad: string;
    unid_medida_id: string;
    precio_unitario: string;
    fecha_vencimiento: string;
    tipo_id: string;
    min_stock: string;
    nombre_tipo: string;
    simbolo: string;
};

type tipo_insumoOption = {
    id_tipo_insumo: number;
    nombre_tipo: string;
};

type Unid_medOption = {
    id_unidad: number;
    simbolo: string;
};

const emptyState: Inv_insumoFormState = {
    id_insumo: "",
    nombre_producto: "",
    cantidad: "",
    unid_medida_id: "",
    precio_unitario: "",
    fecha_vencimiento: "",
    tipo_id: "",
    min_stock: "",
    nombre_tipo: "",
    simbolo: "",
};

export default function Inv_insumoEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id_insumo;

    const [form, setForm] = useState<Inv_insumoFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [tipoIns, setTipoins] = useState<tipo_insumoOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const toDateInputValue = (value: string | number | Date | undefined) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    };

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [invInsumoData, UnidMedidasData, tipoInsData] = await Promise.all([
                    apiFetch(`inv_insumos/by-id/?id_insumo=${id}`),
                    apiFetch(`unid-medida/all-unid_medidas`),
                    apiFetch(`tipo_insumos/all-tipo_insumo`),
                ]);
                if (!mounted) return;

                const unidMedList = Array.isArray(UnidMedidasData?.unid_medidas) ? UnidMedidasData.unid_medidas :
                    Array.isArray(UnidMedidasData) ? UnidMedidasData : [];

                const tipoInsList = Array.isArray(tipoInsData?._id_tipo_insumo) ? tipoInsData._id_tipo_insumo :
                    Array.isArray(tipoInsData) ? tipoInsData : [];

                setForm({
                    id_insumo: invInsumoData?.id_insumo || "",
                    nombre_producto: invInsumoData?.nombre_producto || "",
                    cantidad: invInsumoData?.cantidad || "",
                    unid_medida_id: invInsumoData?.unid_medida_id || "",
                    precio_unitario: invInsumoData?.precio_unitario || "",
                    fecha_vencimiento: toDateInputValue(invInsumoData?.fecha_vencimiento || ""),
                    tipo_id: invInsumoData?.tipo_id || "",
                    min_stock: invInsumoData?.min_stock || "",
                    nombre_tipo: invInsumoData?.nombre_tipo || "",
                    simbolo: invInsumoData?.simbolo || "",
                });

                setTipoins(tipoInsList);
                setUnidMedidas(unidMedList);
            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el registro del insumo");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    const handleChange =
        (field: keyof Inv_insumoFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_producto: form.nombre_producto.trim(),
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                fecha_vencimiento: form.fecha_vencimiento,
                min_stock: Number(form.min_stock),
                tipo_id: Number(form.tipo_id),
                precio_unitario: Number(form.precio_unitario),
            };

            await apiFetch(`inv_insumos/update_by_id/${id}`, { method: "PUT", body: payload });
            setSuccess("Insumo actualizado correctamente");
            setTimeout(() => navigate("/invInsumo"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar el insumo");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar insumo</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del insumo.</p>
                    </div>

                    <Link to="/invInsumo" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a insumos</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando insumo...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del producto <span className="text-error-500">*</span></label>
                                    <input value={form.nombre_producto} onChange={handleChange("nombre_producto")} placeholder="Carne cerdo" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad<span className="text-error-500">*</span></label>
                                    <input type="number" value={form.cantidad} onChange={handleChange("cantidad")} placeholder="100" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Unidad de medida <span className="text-error-500">*</span></label>
                                    <select value={form.unid_medida_id} onChange={handleChange("unid_medida_id")} 
                                        className="h-11 w-full rounded-lg border focus:ring-gray-500 focus:border-gray-300 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.unid_medida_id && !unidMedidas.some((unidMed) => String(unidMed.id_unidad) === form.unid_medida_id) && (
                                            <option value={form.unid_medida_id}>{form.simbolo || "Unidad asignada"}</option>
                                        )}
                                        {unidMedidas.map((unidMed) => (
                                            <option key={unidMed.id_unidad} value={String(unidMed.id_unidad)}>
                                                {unidMed.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha vencimiento <span className="text-error-500">*</span></label>
                                    <input type="date" value={form.fecha_vencimiento} onChange={handleChange("fecha_vencimiento")} placeholder="usuario@correo.com" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo insumo <span className="text-error-500">*</span></label>
                                    <select value={form.tipo_id} onChange={handleChange("tipo_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {tipoIns.length === 0 && form.tipo_id && (
                                            <option value={form.tipo_id}>{form.nombre_tipo || "Tipo insumo asignado"}</option>
                                        )}
                                        {tipoIns.map((tipo_insumo) => (
                                            <option key={tipo_insumo.id_tipo_insumo} value={String(tipo_insumo.id_tipo_insumo)}>
                                                {tipo_insumo.nombre_tipo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor unitario</label>
                                    <input type="number" value={form.precio_unitario} onChange={handleChange("precio_unitario")} placeholder="12785.00" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" minLength={1} />
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
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar insumo"}
                                </button>
                                <Link to="/invInsumo"
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
