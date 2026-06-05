import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type Inv_perdFormState = {
    id_perdida: number
    inv_prod_id: number
    cantidad: number
    motivo: string
    origen: string
    fecha_reporte: string
    unid_medida_id: number
    user_id: number
    observaciones: string
    nombre_user: string
    nombre_producto: string
    valor_unitario: number
    nombre_lote: string
    simbolo: string
};

type InvProdOption = {
    id_inventario: number;
    nombre_producto: string;
    nombre_lote: string;
};

type Unid_medOption = {
    id_unidad: number;
    simbolo: string;
};

type MotivoOption = {
    value: string;
    label: string;
};

type InvInsumoOption = {
    id_insumo: number;
    nombre_producto: string;
};



const motivoOptions: MotivoOption[] = [
    { value: "contaminacion", label: "Contaminación" },
    { value: "extravio", label: "Extravio" },
    { value: "vencimiento", label: "Vencimiento" },
    { value: "robo", label: "Robo" },
    { value: "daño_fisico", label: "Dañado" },
];

const origenOptions: MotivoOption[] = [
    { value: "produccion", label: "Producción" },
    { value: "insumo", label: "Insumo" },
];

const initialState: Inv_perdFormState = {
    id_perdida: 0,
    inv_prod_id: 0,
    cantidad: 0,
    motivo: "",
    fecha_reporte: "",
    unid_medida_id: 0,
    user_id: 0,
    observaciones: "",
    nombre_user: "",
    nombre_producto: "",
    valor_unitario: 0,
    nombre_lote: "",
    simbolo: "",
    origen: ""
};


export default function InvPerdCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<Inv_perdFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingInvprod, setLoadingInvprod] = useState(false);
    const [loadingInvinsumo, setLoadingInvinsumo] = useState(false);
    const [loadingUnidMedidas, setLoadingUnidMedidas] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [invProd, setInvProd] = useState<InvProdOption[]>([]);
    const [invInsumo, setInvInsumo] = useState<InvInsumoOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

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

        const loadInvProd = async () => {
            setLoadingInvprod(true);
            try {
                const inv_prodData = await apiFetch(`inv_produccion/all/produccion`);
                if (!mounted) return;

                const invProdList = Array.isArray(inv_prodData?.inv_produccion)
                    ? inv_prodData.inv_produccion
                    : Array.isArray(inv_prodData)
                        ? inv_prodData
                        : [];

                setInvProd(invProdList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar las unidades de medida");
            } finally {
                if (mounted) setLoadingInvprod(false);
            }
        };

        loadInvProd();
        
        const loadInvInsumo = async () => {
            setLoadingInvinsumo(true);
            try {
                const inv_insumoData = await apiFetch(`inv_insumos/all_insumos`);
                if (!mounted) return;

                const invInsumoList = Array.isArray(inv_insumoData?.inv_insumos)
                    ? inv_insumoData.inv_insumos
                    : Array.isArray(inv_insumoData)
                        ? inv_insumoData
                        : [];

                setInvInsumo(invInsumoList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los insumos");
            } finally {
                if (mounted) setLoadingInvinsumo(false);
            }
        };

        loadInvInsumo();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof Inv_perdFormState) =>
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
                inv_prod_id: Number(form.inv_prod_id),
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                motivo: form.motivo,
                origen: form.origen,
                fecha_reporte: getLocalISODateTime(),
                observaciones: form.observaciones.trim() || null,
            };

            const data = await apiFetch("inv_perdida/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Perdida registrada correctamente");
            setForm(initialState);
            navigate("/invPerd");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al registrar la perdida"
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
                            Registrar perdida de inventario
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la perdida.
                        </p>
                    </div>

                    <Link
                        to="/invPerd"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a inv. perdidas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Origen <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.origen}
                                onChange={handleChange("origen")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="" disabled>
                                    Selecciona el origen
                                </option>
                                {origenOptions.map((origen) => (
                                    <option key={origen.value} value={origen.value}>
                                        {origen.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre producto <span className="text-error-500">*</span>
                            </label>
                            <select value={form.inv_prod_id || ""} onChange={handleChange("inv_prod_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required disabled={(form.origen === "produccion" && (loadingInvprod || invProd.length === 0)) || (loadingInvinsumo && form.origen === "insumo" && invInsumo.length === 0)}>
                                <option value="" disabled>
                                    {loadingInvprod ? "Cargando productos..." : "Selecciona un producto"}
                                </option>
                                {form.origen === "insumo" && (
                                    invInsumo.map((insumo) => (
                                        <option key={insumo.id_insumo} value={String(insumo.id_insumo)}>
                                            {insumo.nombre_producto} - ID insumo {insumo.id_insumo}
                                        </option>
                                    ))
                                )}
                                {form.origen === "produccion" && (
                                    invProd.map((prod) => (
                                        <option key={prod.id_inventario} value={String(prod.id_inventario)}>
                                            {prod.nombre_producto} - Lote {prod.nombre_lote} - ID inventario {prod.id_inventario}
                                        </option>
                                    ))
                                )}
                            </select>
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
                                Motivo <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.motivo}
                                onChange={handleChange("motivo")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                            >
                                <option value="" disabled>
                                    Selecciona un motivo
                                </option>
                                {motivoOptions.map((motivo) => (
                                    <option key={motivo.value} value={motivo.value}>
                                        {motivo.label}
                                    </option>
                                ))}
                            </select>
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

                        {/* <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fecha reporte <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.fecha_reporte}
                                onChange={handleChange("fecha_reporte")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div> */}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Observaciones
                            </label>
                            <input
                                value={form.observaciones}
                                onChange={handleChange("observaciones")}
                                placeholder="Observaciones"

                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Registrar perdida"}
                        </button>
                        <Link
                            to="/invPerd"
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
