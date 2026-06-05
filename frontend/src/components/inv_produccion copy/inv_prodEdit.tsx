import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type Inv_prodFormState = {
    nombre_producto: string,
    cantidad: string,
    unid_medida_id: string,
    fecha_vencimiento: string,
    lote_id: string,
    valor_unitario: string,
    nombre_lote: string,
    categoria_id: string,
    especie_id: string,
    nombre_categoria: string,
    nombre_especie: string,
    simbolo: string,
};

type LoteOption = {
    id_lote: number;
    nombre_lote: string;
};

type CategoriaOption = {
    id_categoria: number;
    nombre_categoria: string;
};

type EspecieOption = {
    id_especie: number;
    nombre_especie: string;
};

type Unid_medOption = {
    id_unidad: number;
    simbolo: string;
};

const emptyState: Inv_prodFormState = {
    nombre_producto: "",
    cantidad: "",
    unid_medida_id: "",
    fecha_vencimiento: "",
    lote_id: "",
    valor_unitario: "",
    nombre_lote: "",
    categoria_id: "",
    especie_id: "",
    nombre_categoria: "",
    nombre_especie: "",
    simbolo: ""
};

export default function Inv_prodEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id_inventario;

    const [form, setForm] = useState<Inv_prodFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
    const [especies, setEspecies] = useState<EspecieOption[]>([]);
    const [lotes, setLotes] = useState<LoteOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const toDateInputValue = (value: string | number | Date | undefined) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    };

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [invProdData, lotesData, UnidMedidasData, CategoriasData, EspeciesData] = await Promise.all([
                    apiFetch(`inv_produccion/by-id?id=${id}`),
                    apiFetch(`lotes/all-lotes_prod`),
                    apiFetch(`unid-medida/all-unid_medidas`),
                    apiFetch(`categorias/all-categorias`),
                    apiFetch(`especies/all-especies`),
                ]);
                if (!mounted) return;

                const lotesList = Array.isArray(lotesData?.lotes) ? lotesData.Lotes :
                    Array.isArray(lotesData) ? lotesData : [];

                const unidMedList = Array.isArray(UnidMedidasData?.unid_medidas) ? UnidMedidasData.unid_medidas :
                    Array.isArray(UnidMedidasData) ? UnidMedidasData : [];

                const categoriasList = Array.isArray(CategoriasData?.categorias) ? CategoriasData.categorias :
                    Array.isArray(CategoriasData) ? CategoriasData : [];

                const especiesList = Array.isArray(EspeciesData?.especies) ? EspeciesData.especies :
                    Array.isArray(EspeciesData) ? EspeciesData : [];

                setForm({
                    nombre_producto: invProdData?.nombre_producto || "",
                    cantidad: String(invProdData?.cantidad ?? ""),
                    unid_medida_id: invProdData?.unid_medida_id ? String(invProdData.unid_medida_id) : "",
                    fecha_vencimiento: toDateInputValue(invProdData?.fecha_vencimiento),
                    lote_id: invProdData?.lote_id ? String(invProdData.lote_id) : "",
                    valor_unitario: invProdData?.valor_unitario ? String(invProdData.valor_unitario) : "",
                    nombre_lote: invProdData?.nombre_lote || "",
                    categoria_id: invProdData?.categoria_id ? String(invProdData.categoria_id) : "",
                    especie_id: invProdData?.especie_id ? String(invProdData.especie_id) : "",
                    nombre_categoria: invProdData?.nombre_categoria || "",
                    nombre_especie: invProdData?.nombre_especie || "",
                    simbolo: invProdData?.simbolo || ""
                });

                setLotes(lotesList);
                setUnidMedidas(unidMedList);
                setCategorias(categoriasList);
                setEspecies(especiesList);

            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el registro del producto");
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
        (field: keyof Inv_prodFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_producto: form.nombre_producto.trim(),
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                fecha_vencimiento: form.fecha_vencimiento,
                lote_id: Number(form.lote_id),
                valor_unitario: Number(form.valor_unitario),
                categoria_id: Number(form.categoria_id),
                especie_id: Number(form.especie_id),
            };

            await apiFetch(`inv_produccion/update/${id}`, { method: "PUT", body: payload });
            setSuccess("Producto actualizado correctamente");
            setTimeout(() => navigate("/invProd"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar el producto");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar producto</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del producto.</p>
                    </div>

                    <Link to="/invProd" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a productos</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando producto...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del producto <span className="text-error-500">*</span></label>
                                    <input value={form.nombre_producto} onChange={handleChange("nombre_producto")} placeholder="Carne cerdo" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad <span className="text-error-500">*</span></label>
                                    <input type="number" value={form.cantidad} onChange={handleChange("cantidad")} placeholder="100" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Unidad de medida <span className="text-error-500">*</span></label>
                                    <select value={form.unid_medida_id} onChange={handleChange("unid_medida_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.unid_medida_id && !unidMedidas.some((unidMed) => String(unidMed.id_unidad) === form.unid_medida_id) && (
                                            <option value={form.unid_medida_id}>{form.simbolo || "Unidad asignada"}</option>
                                        )}
                                        {unidMedidas.map((unidMed) => (
                                            <option key={unidMed.id_unidad} value={String(unidMed.id_unidad)}>
                                                {unidMed.simbolo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha vencimiento <span className="text-error-500">*</span></label>
                                    <input type="date" value={form.fecha_vencimiento} onChange={handleChange("fecha_vencimiento")} placeholder="usuario@correo.com" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre lote <span className="text-error-500">*</span></label>
                                    <select value={form.lote_id} onChange={handleChange("lote_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.lote_id && !lotes.some((lote) => String(lote.id_lote) === form.lote_id) && (
                                            <option value={form.lote_id}>{form.nombre_lote || "Lote asignado"}</option>
                                        )}
                                        {lotes.map((lote) => (
                                            <option key={lote.id_lote} value={String(lote.id_lote)}>
                                                {lote.nombre_lote}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor unitario</label>
                                    <input type="number" value={form.valor_unitario} onChange={handleChange("valor_unitario")} placeholder="12785.00" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800" minLength={1} />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"> Categoría producto <span className="text-error-500">*</span></label>
                                    <select value={form.categoria_id} onChange={handleChange("categoria_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.categoria_id && !categorias.some((categoria) => String(categoria.id_categoria) === form.categoria_id) && (
                                            <option value={form.categoria_id}>{form.nombre_categoria || "Categoría asignada"}</option>
                                        )}
                                        {categorias.map((categoria) => (
                                            <option key={categoria.id_categoria} value={String(categoria.id_categoria)}>
                                                {categoria.nombre_categoria}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"> Especie producto <span className="text-error-500">*</span></label>
                                    <select value={form.especie_id} onChange={handleChange("especie_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {form.especie_id && !especies.some((especie) => String(especie.id_especie) === form.especie_id) && (
                                            <option value={form.especie_id}>{form.nombre_especie || "Especie asignada"}</option>
                                        )}
                                        {especies.map((especie) => (
                                            <option key={especie.id_especie} value={String(especie.id_especie)}>
                                                {especie.nombre_especie}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
                            )}

                            {success && (
                                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{success}</div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar producto"}
                                </button>
                                <Link to="/invProd"
                                 className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
                                    Cancelar
                                    </Link>
                            </div>
                        </>
                    )}
                </form>
            </div >
        </>
    );
}
