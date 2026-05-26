import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";

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

export default function PermissionsCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<PermissionFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/signin");
                return;
            }

            const payload = {
                id_modulo: form.id_modulo,
                id_rol: form.id_rol,
                insertar: form.insertar,
                actualizar: form.actualizar,
                seleccionar: form.seleccionar,
                borrar: form.borrar,
                nombre_modulo: form.nombre_modulo,
                nombre_rol: form.nombre_rol,
            };

            const response = await fetch("http://localhost:8000/permisos/crear", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data?.detail || data?.message || "No se pudo crear el permiso"
                );
            }

            setSuccess(data?.message || "Permiso creado correctamente");
            setForm(initialState);
            navigate("/users");
        } catch (requestError: any) {
            setError(
                requestError?.message || "Ocurrió un error al crear el permiso"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Crear permiso | Inventario Lembo"
                description="Formulario para crear un nuevo permiso"
            />
            <PageBreadcrumb pageTitle="Crear permiso" />

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
                            <input
                                value={form.nombre_modulo}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rol <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_rol}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Insertar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.insertar ? "true" : "false"}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Actualizar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.actualizar ? "true" : "false"}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Seleccionar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.seleccionar ? "true" : "false"}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Eliminar <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.borrar ? "true" : "false"}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="true">Sí</option>
                                <option value="false">No</option>
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
                            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Guardar permisos"}
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
