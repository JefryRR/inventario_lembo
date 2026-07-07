import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PlatosFormState = {
    nombre_plato: string;
    estado: boolean;
};

const emptyState: PlatosFormState = {
    nombre_plato: "",
    estado: true,
};

export default function PlatosEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id_plato = params.id;

    const [form, setForm] = useState<PlatosFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id_plato) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [platoData] = await Promise.all([
                    apiFetch(`platos/by-id?id=${id_plato}`),
                ]);
                if (!mounted) return;

                setForm({
                    nombre_plato: platoData?.nombre_plato || "",
                    estado: platoData?.estado !== undefined ? Boolean(platoData.estado) : true,
                });

            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el plato");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [id_plato]);

    const handleChange =
        (field: keyof PlatosFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id_plato) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_plato: form.nombre_plato.trim(),
                estado: form.estado,
            };

            await apiFetch(`platos/by_id/${id_plato}`, { method: "PUT", body: payload });
            setSuccess("Plato actualizado correctamente");
            setTimeout(() => navigate("/platos"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar el plato");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar plato</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del plato.</p>
                    </div>

                    <Link to="/platos" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a platos</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando plato...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del plato <span className="text-error-500">*</span></label>
                                    <input value={form.nombre_plato} onChange={handleChange("nombre_plato")} placeholder="Nombre del plato" className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>

                                <div> 
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                                    <select
                                        value={form.estado ? "true" : "false"}
                                        onChange={(e) => setForm(curr => ({ ...curr, estado: e.target.value === "true" }))}
                                        className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                        required
                                    >
                                        <option className="dark:text-black" value="true">Activo</option>
                                        <option className="dark:text-black" value="false">Inactivo</option>
                                    </select>
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
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar plato"}
                                </button>
                                <Link to="/platos" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Cancelar</Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
