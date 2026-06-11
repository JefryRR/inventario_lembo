import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type Inv_insumoFormState = {
    id_insumo: string;
    nombre_producto: string;
    cantidad: string;
    unid_medida_id: string;
    precio_unitario: string;
    fecha_ingreso: string;
    fecha_vencimiento: string;
    tipo_id: string;
    min_stock: string;
    nombre_tipo: string;
    simbolo: string;
};


type tipo_insumoOption = {
    id_tipo_insumo: number;
    nombre_tipo: string;
};

type Unid_medOption = {
    id_unidad: number;
    simbolo: string;
};


const initialState: Inv_insumoFormState = {
    id_insumo: "",
    nombre_producto: "",
    cantidad: "",
    unid_medida_id: "",
    precio_unitario: "",
    fecha_ingreso: "",
    fecha_vencimiento: "",
    tipo_id: "",
    min_stock: "",
    nombre_tipo: "",
    simbolo: "",
};

export default function UsersCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<Inv_insumoFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingTipoIns, setLoadingTipoIns] = useState(false);
    const [loadingUnidMedidas, setLoadingUnidMedidas] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [tipoIns, setTipoins] = useState<tipo_insumoOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadTipo_ins = async () => {
            setLoadingTipoIns(true);
            try {
                const tipoInsData = await apiFetch(`tipo_insumos/all-tipo_insumo`);
                if (!mounted) return;

                const tipoInsList = Array.isArray(tipoInsData?.tipo_insumos)
                    ? tipoInsData.tipo_insumos
                    : Array.isArray(tipoInsData)
                        ? tipoInsData
                        : [];

                setTipoins(tipoInsList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los tipos de insumos");
            } finally {
                if (mounted) setLoadingTipoIns(false);
            }
        };

        loadTipo_ins();

        const loadUnidMedidas = async () => {
            setLoadingUnidMedidas(true);
            try {
                const unid_medData = await apiFetch(`unid-medida/all-unid_medidas`);
                if (!mounted) return;

                const medidasList = Array.isArray(unid_medData?.unid_medidas)
                    ? unid_medData.unid_medidas
                    : Array.isArray(unid_medData)
                        ? unid_medData
                        : [];

                setUnidMedidas(medidasList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar las unidades de medida");
            } finally {
                if (mounted) setLoadingUnidMedidas(false);
            }
        };

        loadUnidMedidas();


        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof Inv_insumoFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({
                    ...current,
                    [field]: value,
                }));
            };

    const getLocalISODateTime = () => {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_producto: form.nombre_producto,
                cantidad: form.cantidad,
                unid_medida_id: form.unid_medida_id,
                precio_unitario: form.precio_unitario,
                fecha_ingreso: getLocalISODateTime(),
                fecha_vencimiento: form.fecha_vencimiento,
                tipo_id: form.tipo_id,
                min_stock: form.min_stock,

            };

            const data = await apiFetch("inv_insumos/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Insumo registrado correctamente");
            setForm(initialState);
            navigate("/Invinsumo");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al registrar el insumo"
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
                            Registrar insumo
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el insumo.
                        </p>
                    </div>

                    <Link
                        to="/Invinsumo"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a inv. insumos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre producto <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_producto}
                                onChange={handleChange("nombre_producto")}
                                placeholder="Harina de trigo"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cantidad <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.cantidad}
                                onChange={handleChange("cantidad")}
                                placeholder="10"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Unidad <span className="text-error-500">*</span>
                            </label>
                            <select value={form.unid_medida_id || ""} onChange={handleChange("unid_medida_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required disabled={loadingUnidMedidas || unidMedidas.length === 0}>
                                <option value="" disabled>
                                    {loadingUnidMedidas ? "Cargando unidades..." : "Selecciona una unidad"}
                                </option>
                                {unidMedidas.map((unidMed) => (
                                    <option key={unidMed.id_unidad} value={String(unidMed.id_unidad)}>
                                        {unidMed.simbolo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Precio compra <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="money"
                                value={form.precio_unitario}
                                onChange={handleChange("precio_unitario")}
                                placeholder="$ 12250.42"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fecha vencimiento <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.fecha_vencimiento}
                                onChange={handleChange("fecha_vencimiento")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                tipo insumo <span className="text-error-500">*</span>
                            </label>
                            <select value={form.tipo_id || ""} onChange={handleChange("tipo_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required disabled={loadingTipoIns || tipoIns.length === 0}>
                                <option value="" disabled>
                                    {loadingTipoIns ? "Cargando tipos de insumos..." : "Selecciona un tipo de insumo"}
                                </option>
                                {tipoIns.map((tipo) => (
                                    <option key={tipo.id_tipo_insumo} value={String(tipo.id_tipo_insumo)}>
                                        {tipo.nombre_tipo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                mínimo stock <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.min_stock}
                                onChange={handleChange("min_stock")}
                                placeholder="18.24"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
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
                            {loading ? "Guardando..." : "Registrar insumo"}
                        </button>
                        <Link
                            to="/Invinsumo"
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
