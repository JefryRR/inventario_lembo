import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PermissionFormState = {
    id_modulo: number;
    id_rol: number;
    insertar: boolean;
    actualizar: boolean;
    seleccionar: boolean;
    borrar: boolean;
    nombre_modulo: string;
    nombre_rol: string;
};

const emptyState: PermissionFormState = {
    id_modulo: 0,
    id_rol: 0,
    insertar: false,
    actualizar: false,
    seleccionar: false,
    borrar: false,
    nombre_modulo: "",
    nombre_rol: "",
};

export default function PermisosEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id_modulo = params.id_modulo;
    const id_rol = params.id_rol;

    const [form, setForm] = useState<PermissionFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id_modulo || !id_rol) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiFetch(`permisos/by-id/${id_modulo}/${id_rol}`);
                if (!mounted) return;

                setForm({
                    id_modulo: data.id_modulo,
                    id_rol: data.id_rol,
                    insertar: data.insertar,
                    actualizar: data.actualizar,
                    seleccionar: data.seleccionar,
                    borrar: data.borrar,
                    nombre_modulo: data.nombre_modulo,
                    nombre_rol: data.nombre_rol,
                });
            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el permiso");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [id_modulo, id_rol]);

    const handleChange =
        (field: keyof PermissionFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = field === "insertar" || field === "actualizar" || field === "seleccionar" || field === "borrar"
                    ? (event.target as HTMLInputElement).checked
                    : event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id_modulo || !id_rol) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                id_modulo: form.id_modulo,
                id_rol: form.id_rol,
                insertar: form.insertar,
                actualizar: form.actualizar,
                seleccionar: form.seleccionar,
                borrar: form.borrar,
            };

            await apiFetch(`permisos/by-id/${id_modulo}/${id_rol}`, { method: "PUT", body: payload });
            setSuccess("Permiso actualizado correctamente");
            setTimeout(() => navigate("/permisos"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar el permiso");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar permiso | Inventario Lembo" description="Editar permiso" />
            <PageBreadcrumb pageTitle="Editar permiso" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar permiso</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del permiso.</p>
                    </div>

                    <Link to="/permisos" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a permisos</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando permiso...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre completo <span className="text-error-500">*</span></label>
                                    <input type="number" value={form.id_modulo} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rol <span className="text-error-500">*</span></label>
                                    <select value={form.id_rol} onChange={handleChange("id_rol")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        <option value="">Seleccionar rol</option>
                                        <option value="2">Administrador</option>
                                        <option value="3">Lider</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Insertar <span className="text-error-500">*</span></label>
                                    <select value={form.insertar} onChange={handleChange("insertar")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        <option value="Si">Sí</option>
                                        <option value="No">No</option>
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
                                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar usuario"}
                                </button>
                                <Link to="/permisos" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Cancelar</Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
