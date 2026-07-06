import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
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

type RoleOption = {
    id_rol: number;
    nombre_rol: string;
};

type ModuleOption = {
    id_modulo: number;
    nombre: string;
};

const initialState: PermissionFormState = {
    id_modulo: 0,
    id_rol: 0,
    insertar: false,
    actualizar: false,
    seleccionar: false,
    borrar: false,
    nombre_modulo: "",
    nombre_rol: "",
};

export default function UsersCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<PermissionFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingModulos, setLoadingModulos] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [modulos, setModulos] = useState<ModuleOption[]>([]);
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

        const loadModulos = async () => {
            setLoadingModulos(true);
            try {
                const modulosData = await apiFetch(`modulos/all/modulos`);
                if (!mounted) return;

                const moduleList = Array.isArray(modulosData?.modulos)
                    ? modulosData.modulos
                    : Array.isArray(modulosData)
                        ? modulosData
                        : [];

                setModulos(moduleList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los módulos");
            } finally {
                if (mounted) setLoadingModulos(false);
            }
        };

        loadModulos();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof PermissionFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const target = event.target as HTMLInputElement | HTMLSelectElement;
                let value: any;
                if (field === "insertar" || field === "actualizar" || field === "seleccionar" || field === "borrar") {
                    const raw = (target as HTMLSelectElement).value ?? (target as HTMLInputElement).checked;
                    value = raw === '1' || String(raw).toLowerCase() === 'si' || String(raw).toLowerCase() === 'true';
                } else if (field === 'id_modulo' || field === 'id_rol') {
                    value = Number(target.value);
                } else {
                    value = target.value;
                }
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                id_modulo: Number(form.id_modulo),
                id_rol: Number(form.id_rol),
                insertar: form.insertar,
                actualizar: form.actualizar,
                seleccionar: form.seleccionar,
                borrar: form.borrar,
            };

            const data = await apiFetch("permisos/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Permiso creado correctamente");
            setForm(initialState);
            navigate("/permisos");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al crear el permiso"
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
                            Nuevo permiso
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el permiso.
                        </p>
                    </div>

                    <Link
                        to="/permisos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a permisos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Módulo <span className="text-error-500">*</span>
                            </label>
                            <select value={form.id_modulo} onChange={handleChange("id_modulo")} className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300" 
                            required disabled={loadingModulos || modulos.length === 0}>
                                <option value={0} disabled>
                                    {loadingModulos ? "Cargando módulos..." : "Selecciona un módulo"}
                                </option>
                                {modulos.map((modulo) => (
                                    <option key={modulo.id_modulo} value={modulo.id_modulo}>
                                        {modulo.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rol <span className="text-error-500">*</span>
                            </label>
                            <select value={form.id_rol} onChange={handleChange("id_rol")} className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300" 
                            required disabled={loadingRoles || roles.length === 0}>
                                <option value={0} disabled>
                                    {loadingRoles ? "Cargando roles..." : "Selecciona un rol"}
                                </option>
                                {roles.map((role) => (
                                    <option key={role.id_rol} value={role.id_rol}>
                                        {role.nombre_rol}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Insertar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.insertar ? "Si" : "No"}
                                onChange={handleChange("insertar")}
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            >
                                <option value="Si">Si</option>
                                <option value="No">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Actualizar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.actualizar ? "Si" : "No"}
                                onChange={handleChange("actualizar")}
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            >
                                <option value="Si">Si</option>
                                <option value="No">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Seleccionar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.seleccionar ? "Si" : "No"}
                                onChange={handleChange("seleccionar")}
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            >
                                <option value="Si">Si</option>
                                <option value="No">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Eliminar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.borrar ? "Si" : "No"}
                                onChange={handleChange("borrar")}
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            >
                                <option value="Si">Si</option>
                                <option value="No">No</option>
                            </select>
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
                            {loading ? "Guardando..." : "Guardar permiso"}
                        </button>
                        <Link
                            to="/permisos"
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
