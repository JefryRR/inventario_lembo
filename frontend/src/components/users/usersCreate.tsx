import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type UserFormState = {
    nombre_user: string;
    documento: string;
    tipo_documento: string;
    telefono: string;
    correo: string;
    pass_hash: string;
    rol_id: string;
    estado: boolean;
};

type RoleOption = {
    id_rol: number;
    nombre_rol: string;
};

const initialState: UserFormState = {
    nombre_user: "",
    documento: "",
    tipo_documento: "CC",
    telefono: "",
    correo: "",
    pass_hash: "",
    rol_id: "",
    estado: true,
};

export default function UsersCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<UserFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadRoles = async () => {
            setLoadingRoles(true);
            try {
                const rolesData = await apiFetch(`roles/all/roles`);
                if (!mounted) return;

                const roleList = Array.isArray(rolesData?.roles)
                    ? rolesData.roles
                    : Array.isArray(rolesData)
                        ? rolesData
                        : [];

                setRoles(roleList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los roles");
            } finally {
                if (mounted) setLoadingRoles(false);
            }
        };

        loadRoles();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof UserFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = field === "estado" ? (event.target as HTMLInputElement).checked : event.target.value;

                setForm((current) => ({
                    ...current,
                    [field]: value,
                }));
            };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
    
        try {
            const payload = {
                nombre_user: form.nombre_user.trim(),
                documento: Number(form.documento),
                tipo_documento: form.tipo_documento.trim(),
                telefono: form.telefono.trim(),
                correo: form.correo.trim(),
                pass_hash: form.pass_hash,
                rol_id: Number(form.rol_id),
                estado: form.estado,
            };

            const data = await apiFetch("users/create", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Usuario creado correctamente");
            setForm(initialState);
            navigate("/users");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al crear el usuario"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Nuevo usuario
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el usuario.
                        </p>
                    </div>

                    <Link
                        to="/users"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a usuarios
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre completo <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_user}
                                onChange={handleChange("nombre_user")}
                                placeholder="Juan Pérez"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Documento <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.documento}
                                onChange={handleChange("documento")}
                                placeholder="1001234567"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tipo de documento <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.tipo_documento}
                                onChange={handleChange("tipo_documento")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="CC">CC</option>
                                <option value="TI">TI</option>
                                <option value="CE">CE</option>
                                <option value="PP">PP</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Teléfono <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.telefono}
                                onChange={handleChange("telefono")}
                                placeholder="3001234567"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Correo <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={form.correo}
                                onChange={handleChange("correo")}
                                placeholder="usuario@correo.com"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Contraseña <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={form.pass_hash}
                                onChange={handleChange("pass_hash")}
                                placeholder="Mínimo 8 caracteres"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rol <span className="text-error-500">*</span>
                            </label>
                            <select value={form.rol_id} onChange={handleChange("rol_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required disabled={loadingRoles || roles.length === 0}>
                                <option value="" disabled>
                                    {loadingRoles ? "Cargando roles..." : "Selecciona un rol"}
                                </option>
                                {roles.map((role) => (
                                    <option key={role.id_rol} value={String(role.id_rol)}>
                                        {role.nombre_rol}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3 md:col-span-2">
                            <input
                                id="estado"
                                type="checkbox"
                                checked={form.estado}
                                onChange={handleChange("estado")}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                            />
                            <label htmlFor="estado" className="text-sm text-gray-700 dark:text-gray-300">
                                Usuario activo
                            </label>
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
                            {loading ? "Guardando..." : "Guardar usuario"}
                        </button>
                        <Link
                            to="/users"
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
