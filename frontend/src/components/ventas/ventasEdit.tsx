import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type VentasFormState = {
    nombre_comprador: string;
    id_comprador: string;
    fecha_venta: string;
    user_id: number;
    nombre_user: string;
    total_venta: number;
};

type VentaDetail = {
    id_venta: number;
    nombre_comprador: string;
    id_comprador: string | null;
    fecha_venta: string;
    user_id: number;
    nombre_user: string;
    total_venta: number | null;
};

const emptyState: VentasFormState = {
    nombre_comprador: "",
    id_comprador: "",
    fecha_venta: "",
    user_id: 0,
    nombre_user: "",
    total_venta: 0,
};

function toDatetimeLocal(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function VentasEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id || params.id_venta || params.venta_id;

    const [form, setForm] = useState<VentasFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let mounted = true;

        const loadVenta = async () => {
            setLoading(true);
            setError(null);

            try {
                const ventaData = await apiFetch(`ventas/by-id?id=${id}`) as VentaDetail;

                if (!mounted) return;

                setForm({
                    nombre_comprador: ventaData?.nombre_comprador ?? "",
                    id_comprador: ventaData?.id_comprador ?? "",
                    fecha_venta: toDatetimeLocal(ventaData?.fecha_venta),
                    user_id: Number(ventaData?.user_id ?? 0),
                    nombre_user: ventaData?.nombre_user ?? "",
                    total_venta: Number(ventaData?.total_venta ?? 0),
                });
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudo cargar la venta");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadVenta();

        return () => {
            mounted = false;
        };
    }, [id]);

    const handleChange =
        (field: keyof VentasFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setForm((current) => ({
                ...current,
                [field]: event.target.value,
            }));
        };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_comprador: form.nombre_comprador.trim(),
                id_comprador: form.id_comprador.trim() || null,
            };

            await apiFetch(`ventas/update/venta/${id}`, {
                method: "PUT",
                body: payload,
            });

            setSuccess("Venta actualizada correctamente");
            setTimeout(() => navigate("/ventas"), 800);
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "No se pudo actualizar la venta");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar venta | Inventario Lembo" description="Editar venta" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar venta</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos permitidos de la venta.</p>
                    </div>

                    <Link
                        to="/ventas"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a ventas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando venta...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
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
                                        Fecha de venta
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.fecha_venta}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Usuario responsable
                                    </label>
                                    <input
                                        value={form.nombre_user}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        ID usuario
                                    </label>
                                    <input
                                        value={form.user_id}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Total venta
                                    </label>
                                    <input
                                        value={form.total_venta}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                    />
                                </div>
                            </div>

                            {success && (
                                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Guardando..." : "Actualizar venta"}
                                </button>
                                <Link
                                    to="/ventas"
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                >
                                    Cancelar
                                </Link>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
