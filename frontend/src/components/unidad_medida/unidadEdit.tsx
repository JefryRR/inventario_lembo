import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type UnidadFormState = {
    unidad: string;
    simbolo: string;
    conversion: number;
    tipo?: string;
};

const emptyState: UnidadFormState = {
    unidad: "",
    simbolo: "",
    conversion: 1,
    tipo: "",
};

export default function UnidadEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<UnidadFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [unidadData] = await Promise.all([
                    apiFetch(`unid-medida/get_by-id?id=${id}`),
                ]);
                if (!mounted) return;

                setForm({
                    unidad: unidadData?.unidad || "",
                    simbolo: unidadData?.simbolo || "",
                    conversion: unidadData?.conversion || 1,
                    tipo: unidadData?.tipo || "",
                });

            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar la unidad");
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
        (field: keyof UnidadFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((prev) => ({ ...prev, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre: form.unidad.trim(),
                simbolo: form.simbolo.trim(),
                conversion: form.conversion,
                tipo: form.tipo,
            };

            await apiFetch(`unid-medida/by_id/${id}`, { method: "PUT", body: payload });
            setSuccess("Unidad actualizada correctamente");
            setTimeout(() => navigate("/unidades"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar la unidad");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar unidad | Inventario Lembo" description="Editar unidad" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar unidad</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos de la unidad.</p>
                    </div>

                    <Link to="/unidades" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a unidades</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando unidad...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la unidad <span className="text-error-500">*</span></label>
                                    <input value={form.unidad} onChange={handleChange("unidad")} placeholder="Nombre de la unidad" className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Símbolo <span className="text-error-500">*</span></label>
                                    <input value={form.simbolo} onChange={handleChange("simbolo")} placeholder="Símbolo de la unidad" className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Equivalencia a unidad base <span className="text-error-500">*</span></label>
                                    <input type="number" value={form.conversion} onChange={handleChange("conversion")} placeholder="Equivalencia a unidad base" className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300" required min={0.000001} step={0.000001} />
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
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar unidad"}
                                </button>
                                <Link to="/unidades" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Cancelar</Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
