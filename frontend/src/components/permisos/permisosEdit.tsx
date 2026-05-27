import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PermissionFormState = {
    insertar: boolean;
    actualizar: boolean;
    seleccionar: boolean;
    borrar: boolean;
};

/**
 * Normaliza cualquier valor que venga del backend a boolean.
 * Cubre: true/false, 1/0, "1"/"0", "true"/"false", "si"/"sí"
 */
const parseBool = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    if (v === 1) return true;
    if (v === 0) return false;
    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        return s === "1" || s === "true" || s === "si" || s === "sí";
    }
    return false;
};

const BOOL_FIELDS: (keyof PermissionFormState)[] = [
    "insertar",
    "actualizar",
    "seleccionar",
    "borrar",
];

const EMPTY_FORM: PermissionFormState = {
    insertar: false,
    actualizar: false,
    seleccionar: false,
    borrar: false,
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PermisosEdit() {
    const navigate = useNavigate();
    const { moduloId, rolId } = useParams();

    // Parsear params una sola vez; si no vienen, el componente no debería renderizar
    const id_modulo = moduloId ? Number(moduloId) : null;
    const id_rol    = rolId    ? Number(rolId)    : null;

    const [form,    setForm]    = useState<PermissionFormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ── Carga inicial ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id_modulo || !id_rol) return;

        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch(`permisos/${id_modulo}/${id_rol}`);
                if (!mounted) return;

                setForm({
                    insertar:    parseBool(data?.insertar),
                    actualizar:  parseBool(data?.actualizar),
                    seleccionar: parseBool(data?.seleccionar),
                    borrar:      parseBool(data?.borrar),
                });
            } catch (err: any) {
                if (mounted) setError(err?.detail ?? err?.message ?? "No se pudo cargar el permiso");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [id_modulo, id_rol]);

    // ── Manejador de selects booleanos ─────────────────────────────────────────
    // Un solo handler genérico: recibe el campo y devuelve el onChange listo para usar.
    // El select siempre envía "1" o "0" como string, así que la conversión es directa.
    const handleBoolChange =
        (field: keyof PermissionFormState) =>
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value === "1" }));
        };

    // ── Envío ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id_modulo || !id_rol) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await apiFetch(`permisos/update/${id_modulo}/${id_rol}`, {
                method: "PUT",
                body: form, // form ya tiene exactamente los campos que necesita el backend
            });

            setSuccess("Permiso actualizado correctamente");
            setTimeout(() => navigate("/permisos"), 800);
        } catch (err: any) {
            setError(err?.detail ?? err?.message ?? "No se pudo actualizar el permiso");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar permiso | Inventario Lembo" description="Editar permiso" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">

                {/* Cabecera */}
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar permiso</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del permiso.</p>
                    </div>
                    <Link
                        to="/permisos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a permisos
                    </Link>
                </div>

                {/* Cuerpo */}
                <form onSubmit={handleSubmit} className="p-5 lg:p-6">

                    {/* Estado: cargando */}
                    {loading && (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando permiso...</div>
                    )}

                    {/* Estado: error de carga (antes de mostrar el form) */}
                    {!loading && error && !success && (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    )}

                    {/* Formulario: solo se muestra cuando terminó de cargar */}
                    {!loading && (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {BOOL_FIELDS.map((field) => (
                                <div key={field}>
                                    <label className="mb-2 block text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                                        {field === "borrar" ? "Eliminar" : field.charAt(0).toUpperCase() + field.slice(1)}
                                    </label>
                                    <select
                                        value={form[field] ? "1" : "0"}
                                        onChange={handleBoolChange(field)}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                    >
                                        <option value="0">No</option>
                                        <option value="1">Sí</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Mensajes de feedback tras el submit */}
                    {error && !loading && (
                        <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                            {success}
                        </div>
                    )}

                    {/* Botones */}
                    {!loading && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? "Guardando..." : "Actualizar permiso"}
                            </button>
                            <Link
                                to="/permisos"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                            >
                                Cancelar
                            </Link>
                        </div>
                    )}

                </form>
            </div>
        </>
    );
}
