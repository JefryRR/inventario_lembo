import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type AlimentoFormState = {
    lote_id: number;
    insumo_id: number;
    fecha_alimento: string;
    cantidad: string;
    unid_medida_id: number;
    nombre_producto: string;
    simbolo: string;
    nombre_lote: string;
};

type LoteOption = {
    id_lote: number;
    nombre_lote: string;
    estado_lote: string;
};

type InsumoOption = {
    id_insumo: number;
    nombre_producto: string;
    tipo_id: number;
    fecha_vencimiento: string;
    cantidad: number;
    simbolo: string;
};

type UnidadOption = {
    id_unidad: number;
    simbolo: string;
    tipo_unidad: string;
};

const emptyState: AlimentoFormState = {
    lote_id: 0,
    insumo_id: 0,
    fecha_alimento: "",
    cantidad: "",
    unid_medida_id: 0,
    nombre_producto: "",
    simbolo: "",
    nombre_lote: ""
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

export default function AlimentoEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<AlimentoFormState>(emptyState);
    const [lotes, setLotes] = useState<LoteOption[]>([]);
    const [insumos, setInsumos] = useState<InsumoOption[]>([]);
    const [unidades, setUnidades] = useState<UnidadOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const [alimentoData, lotesData, insumosData, unidadesData] = await Promise.all([
                    apiFetch(`alimento_prod/by-id?id_alimento=${id}`),
                    apiFetch("lotes_prod/all-lotes_prod"),
                    apiFetch("inv_insumos/all_insumos"),
                    apiFetch("unid-medida/all-unid_medidas"),
                ]);

                if (!mounted) return;

                const loteList = Array.isArray(lotesData?.lotes)
                    ? lotesData.lotes
                    : Array.isArray(lotesData)
                        ? lotesData
                        : [];

                const insumoList = Array.isArray(insumosData?.insumos)
                    ? insumosData.insumos
                    : Array.isArray(insumosData)
                        ? insumosData
                        : [];

                const alimentosVigentes = insumoList.filter((insumo: InsumoOption) => {
                    const esAlimento = insumo.tipo_id === 2;
                    const noVencido = new Date(insumo.fecha_vencimiento) >= new Date();
                    return esAlimento && noVencido;
                });

                const Lotesvisibles = loteList.filter((lote: LoteOption) => {
                    const estado = lote.estado_lote === "activo" || lote.estado_lote === "cuarentena";
                    return estado;
                });

                const unidadList = Array.isArray(unidadesData?.unidades)
                    ? unidadesData.unidades
                    : Array.isArray(unidadesData)
                        ? unidadesData
                        : [];
                const medidasVigentes = unidadList.filter((medida: UnidadOption) => {
                    const esAlimento = medida.tipo_unidad !== "otro";
                    return esAlimento;
                });

                setLotes(Lotesvisibles);
                setInsumos(alimentosVigentes);
                setUnidades(medidasVigentes);

                setForm({
                    nombre_lote: alimentoData?.nombre_lote || "",
                    nombre_producto: alimentoData?.nombre_producto || "",
                    fecha_alimento: toDatetimeLocal(alimentoData?.fecha_alimento),
                    cantidad: String(alimentoData?.cantidad ?? ""),
                    unid_medida_id: Number(alimentoData?.unid_medida_id ?? 0),
                    insumo_id: Number(alimentoData?.insumo_id ?? 0),
                    lote_id: Number(alimentoData?.lote_id ?? 0),
                    simbolo: alimentoData?.simbolo || "",
                });

            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudo cargar el alimento");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [id]);

    const handleChange =
        (field: keyof AlimentoFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                const value = event.target.value;

                if (field === "cantidad" || field === "insumo_id" || field === "unid_medida_id" || field === "lote_id") {
                    setForm((current) => ({ ...current, [field]: Number(value) }));
                    return;
                }

                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_lote: form.nombre_lote.trim(),
                nombre_producto: form.nombre_producto.trim(),
                fecha_alimento: form.fecha_alimento,
                cantidad: Number(form.cantidad),
                simbolo: form.simbolo.trim(),
                lote_id: Number(form.lote_id),
                insumo_id: Number(form.insumo_id),
                unid_medida_id: Number(form.unid_medida_id),
            };

            await apiFetch(`alimento_prod/by-id/${id}?id_alimento=${id}`, {
                method: "PUT",
                body: payload,
            });

            setSuccess("Alimento actualizado correctamente");
            setTimeout(() => navigate("/alimentos"), 800);
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "No se pudo actualizar el alimento");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta title="Editar alimento | Inventario Lembo" description="Editar alimento" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar alimento</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del alimento.</p>
                    </div>

                    <Link
                        to="/alimentos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a alimentos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando alimento...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Lote <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.lote_id}
                                        onChange={handleChange("lote_id")}
                                        className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                        required
                                        disabled={lotes.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona un lote
                                        </option>
                                        {lotes.map((lote) => (
                                            <option key={lote.id_lote} value={lote.id_lote}>
                                                {lote.nombre_lote}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Producto <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.insumo_id}
                                        onChange={handleChange("insumo_id")}
                                        className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                        required
                                        disabled={insumos.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona un producto
                                        </option>
                                        {insumos.map((insumo) => (
                                            <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                                {insumo.nombre_producto} cantidad: {insumo.cantidad} {insumo.simbolo}
                                            </option>
                                        ))}
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
                                        min={1}
                                        className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Unidad de medida <span className="text-error-500">*</span>
                                    </label>
                                    <select
                                        value={form.unid_medida_id}
                                        onChange={handleChange("unid_medida_id")}
                                        className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                        required
                                        disabled={unidades.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona una unidad de medida
                                        </option>
                                        {unidades.map((unidad) => (
                                            <option key={unidad.id_unidad} value={unidad.id_unidad}>
                                                {unidad.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Fecha de alimento <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.fecha_alimento}
                                        onChange={handleChange("fecha_alimento")}
                                        className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
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
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Guardando..." : "Actualizar alimento"}
                                </button>
                                <Link
                                    to="/alimentos"
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
