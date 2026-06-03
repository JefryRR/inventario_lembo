import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type VentasFormState = {
    nombre_comprador: string;
    id_comprador: string;
    fecha_venta: string;
    user_id: number;
};

type UserOption = {
    id_user: number;
    nombre_user: string;
};

const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
};

const initialState: VentasFormState = {
    nombre_comprador: "",
    id_comprador: "",
    fecha_venta: getCurrentDateTimeLocal(),
    user_id: 0,
};

export default function VentasCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<VentasFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadUsers = async () => {
            setLoadingUsers(true);

            try {
                const usersData = await apiFetch("users/all-users-except-admins");

                if (!mounted) return;

                const userList = Array.isArray(usersData?.users)
                    ? usersData.users
                    : Array.isArray(usersData)
                        ? usersData
                        : [];

                setUsers(userList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los usuarios");
            } finally {
                if (mounted) setLoadingUsers(false);
            }
        };

        loadUsers();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof VentasFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;

            if (field === "user_id") {
                setForm((current) => ({
                    ...current,
                    user_id: Number(value),
                }));
                return;
            }

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
                nombre_comprador: form.nombre_comprador.trim(),
                id_comprador: form.id_comprador.trim() || null,
                fecha_venta: form.fecha_venta,
                user_id: Number(form.user_id),
            };

            const data = await apiFetch("ventas/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Venta registrada correctamente");
            setForm(initialState);
            navigate("/ventas", { state: { newVentaId: data?.id_venta } });
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "Ocurrió un error al registrar la venta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta title="Crear venta | Inventario Lembo" description="Formulario para registrar una nueva venta" />
            <PageBreadcrumb pageTitle="Crear venta" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva venta</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la venta.
                        </p>
                    </div>

                    <Link
                        to="/ventas"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ventas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre del comprador <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_comprador}
                                onChange={handleChange("nombre_comprador")}
                                placeholder="Juan Pérez"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                                minLength={3}
                                maxLength={25}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Identificación del comprador
                            </label>
                            <input
                                value={form.id_comprador}
                                onChange={handleChange("id_comprador")}
                                placeholder="1001234567"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                minLength={3}
                                maxLength={20}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fecha de venta <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={form.fecha_venta}
                                onChange={handleChange("fecha_venta")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Usuario responsable <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.user_id}
                                onChange={handleChange("user_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                                disabled={loadingUsers || users.length === 0}
                            >
                                <option value={0} disabled>
                                    {loadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"}
                                </option>
                                {users.map((user) => (
                                    <option key={user.id_user} value={user.id_user}>
                                        {user.nombre_user}
                                    </option>
                                ))}
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
                            {loading ? "Guardando..." : "Guardar venta"}
                        </button>
                        <Link
                            to="/ventas"
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
