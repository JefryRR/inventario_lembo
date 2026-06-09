import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type RolFormState = {
    nombre_rol: string;
    descripcion: string;
    estado: boolean;
};

const emptyState: RolFormState = {
    nombre_rol: "",
    descripcion: "",
    estado: true,
};

export default function RolesEdit() {
    const params = useParams();
    const id_rol = params.id_rol;
    const navigate = useNavigate();
    const [form, setForm] = useState<RolFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id_rol) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const rolesData = await apiFetch(`roles/by-id?id=${id_rol}`) as RolFormState;
                if (!mounted) return;

                setForm({
                    nombre_rol: rolesData?.nombre_rol || "",
                    descripcion: rolesData?.descripcion || "",
                    estado: rolesData?.estado !== undefined ? Boolean(rolesData.estado) : true,
                });
            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el rol");
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        load();

        return () => {
            mounted = false;
        };
    }, [id_rol]);

    const handleChange =
        (field: keyof RolFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id_rol) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_rol: form.nombre_rol,
                descripcion: form.descripcion,
                estado: form.estado,
            };

            await apiFetch(`roles/by_id/${id_rol}`, { method: "PUT", body: payload });
            setSuccess("Rol actualizado correctamente");
            setTimeout(() => navigate("/roles"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar el rol");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar rol</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del rol.</p>
                    </div>

                    <Link to="/roles" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a roles</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando rol...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del rol <span className="text-error-500">*</span></label>
                                    <input value={form.nombre_rol} onChange={handleChange("nombre_rol")} placeholder="Administrador" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción <span className="text-error-500">*</span></label>
                                    <input type="text" value={form.descripcion} onChange={handleChange("descripcion")} placeholder="Rol de administrador del sistema" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
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
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar rol"}
                                </button>
                                <Link to="/roles" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Cancelar</Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
