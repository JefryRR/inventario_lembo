import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type TratamientoFormState = {
    lote_id: number;
    medicina_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    cantidad: number;
    unid_medida_id: number;
    observacion: string | null;
    user_id: number;
    cant_convertida: number;
    nombre_lote: string;
    nombre_producto: string;
    nombre_user: string;
    simbolo: string;
};

type LoteOption = {
    id_lote_g: number;
    nombre_lote: string;
};

type MedicinaOption = {
    id_insumo: number;
    nombre_producto: string;
    tipo_id: number;
    fecha_vencimiento: string;
    cantidad: number;
    simbolo: string;
};

type MedidaOption = {
    id_unidad: number;
    simbolo: string;
};

const emptyState: TratamientoFormState = {
    lote_id: 0,
    nombre_lote: "",
    medicina_id: 0,
    fecha_inicio: "",
    fecha_fin: "",
    cantidad: 0,
    unid_medida_id: 0,
    observacion: null,
    user_id: 0,
    cant_convertida: 0,
    nombre_producto: "",
    nombre_user: "",
    simbolo: "",
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

export default function TratamientoEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id;

    const [form, setForm] = useState<TratamientoFormState>(emptyState);
    const [lotes, setLotes] = useState<LoteOption[]>([]);
    const [medicinas, setMedicinas] = useState<MedicinaOption[]>([]);
    const [medidas, setMedidas] = useState<MedidaOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const [tratamientoData, lotesData, medicinasData, medidasData] = await Promise.all([
                    apiFetch(`tratamiento/by-id?id_tratamiento=${id}`),
                    apiFetch("lotes/all-lotes_prod"),
                    apiFetch("inv_insumos/all_insumos"),
                    apiFetch("unid-medida/all-unid_medidas"),
                ]);

                if (!mounted) return;

                const loteList = Array.isArray(lotesData?.lotes)
                    ? lotesData.lotes
                    : Array.isArray(lotesData)
                        ? lotesData
                        : [];

                const medicinaList = Array.isArray(medicinasData?.medicinas)
                    ? medicinasData.medicinas
                    : Array.isArray(medicinasData)
                        ? medicinasData
                        : [];

                const medicinasVigentes = medicinaList.filter((insumo: MedicinaOption) => {
                    const esMedicamento = insumo.tipo_id === 1;
                    const noVencido = new Date(insumo.fecha_vencimiento) >= new Date();
                    return esMedicamento && noVencido;
                });

                const medidaList = Array.isArray(medidasData?.medidas)
                    ? medidasData.medidas
                    : Array.isArray(medidasData)
                        ? medidasData
                        : [];

                setLotes(loteList);
                setMedicinas(medicinasVigentes);
                setMedidas(medidaList);

                setForm({
                    nombre_lote: tratamientoData?.nombre_lote || "",
                    nombre_producto: tratamientoData?.nombre_producto || "",
                    fecha_inicio: toDatetimeLocal(tratamientoData?.fecha_inicio),
                    fecha_fin: toDatetimeLocal(tratamientoData?.fecha_fin),
                    cantidad: Number(tratamientoData?.cantidad ?? 0),
                    unid_medida_id: Number(tratamientoData?.unid_medida_id ?? 0),
                    observacion: tratamientoData?.observacion || null,
                    user_id: Number(tratamientoData?.user_id ?? 0),
                    cant_convertida: Number(tratamientoData?.cant_convertida ?? 0),
                    medicina_id: Number(tratamientoData?.medicina_id ?? 0),
                    lote_id: Number(tratamientoData?.lote_id ?? 0),
                    simbolo: tratamientoData?.simbolo || "",
                    nombre_user: tratamientoData?.nombre_user || "",
                });

            } catch (requestError: any) {
                if (!mounted) return;
                setLoadError(requestError?.detail || requestError?.message || "No se pudo cargar el tratamiento");
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
        (field: keyof TratamientoFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                const value = event.target.value;

                if (field === "cantidad" || field === "medicina_id" || field === "unid_medida_id" || field === "lote_id" || field === "user_id") {
                    setForm((current) => ({ ...current, [field]: Number(value) }));
                    return;
                }

                if (field === "observacion") {
                    setForm((current) => ({ ...current, observacion: value || null }));
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

        if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
            setError("La fecha de fin no puede ser menor a la fecha de inicio");
            setSaving(false);
            return;
        }

        try {
            const payload = {
                tratamiento_id: Number(id),
                nombre_lote: form.nombre_lote.trim(),
                nombre_producto: form.nombre_producto.trim(),
                fecha_inicio: form.fecha_inicio,
                fecha_fin: form.fecha_fin,
                cantidad: Number(form.cantidad),
                simbolo: form.simbolo.trim(),
                lote_id: Number(form.lote_id),
                unid_medida_id: Number(form.unid_medida_id),
                observacion: form.observacion ? form.observacion.trim() : null,
                user_id: Number(form.user_id),
                nombre_user: form.nombre_user.trim(),
                cantidad_convertida: Number(form.cant_convertida),
            };

            await apiFetch(`tratamiento/by-id/${id}?id_tratamiento=${id}`, {
                method: "PUT",
                body: payload,
            });

            setSuccess("Tratamiento actualizado correctamente");
            setTimeout(() => navigate("/tratamientos"), 800);
        } catch (requestError: any) {
            setError(requestError?.detail || requestError?.message || "No se pudo actualizar el tratamiento");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar tratamiento</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del tratamiento.</p>
                    </div>

                    <Link
                        to="/tratamientos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a tratamientos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando tratamiento...</div>
                    ) : loadError ? (
                        <div className="p-6 text-center text-sm text-error-500">{loadError}</div>
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
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                        disabled={lotes.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona un lote
                                        </option>
                                        {lotes.map((lote) => (
                                            <option key={lote.id_lote_g} value={lote.id_lote_g}>
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
                                        value={form.medicina_id}
                                        onChange={handleChange("medicina_id")}
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                        required
                                        disabled={medicinas.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona un producto
                                        </option>
                                        {medicinas.map((medicina) => (
                                            <option key={medicina.id_insumo} value={medicina.id_insumo}>
                                                {medicina.nombre_producto}, cantidad: {medicina.cantidad} {medicina.simbolo} 
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
                                        className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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
                                        className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                        required
                                        disabled={medidas.length === 0}
                                    >
                                        <option value={0} disabled>
                                            Selecciona una unidad de medida
                                        </option>
                                        {medidas.map((unidad) => (
                                            <option key={unidad.id_unidad} value={unidad.id_unidad}>
                                                {unidad.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Fecha de inicio <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.fecha_inicio}
                                        onChange={handleChange("fecha_inicio")}
                                        className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Fecha de fin <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.fecha_fin}
                                        onChange={handleChange("fecha_fin")}
                                        className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observación</label>
                                    <input
                                        type="text"
                                        value={form.observacion || ""}
                                        onChange={handleChange("observacion")}
                                        className="h-28 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                        placeholder="Observación"
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
                                    {saving ? "Guardando..." : "Actualizar tratamiento"}
                                </button>
                                <Link
                                    to="/tratamientos"
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
