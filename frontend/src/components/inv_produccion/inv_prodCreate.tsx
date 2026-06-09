import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type Inv_prodFormState = {
    id_inventario: string,
    nombre_producto: string,
    cantidad: string,
    unid_medida_id: string,
    fecha_ingreso: string,
    fecha_vencimiento: string,
    lote_id: string,
    valor_unitario: string,
    nombre_lote: string,
    categoria_id: string,
    especie_id: string,
    nombre_categoria: string,
    nombre_especie: string,
    simbolo: string
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


const initialState: Inv_prodFormState = {
    id_inventario: "",
    nombre_producto: "",
    cantidad: "",
    unid_medida_id: "",
    fecha_ingreso: "",
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

export default function Inv_prodCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<Inv_prodFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [loadingLotes, setLoadingLotes] = useState(false);
    const [loadingUnidMedidas, setLoadingUnidMedidas] = useState(false);
    const [loadingCategorias, setLoadingCategorias] = useState(false);
    const [loadingEspecies, setLoadingEspecies] = useState(false);
    const [unidMedidas, setUnidMedidas] = useState<Unid_medOption[]>([]);
    const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
    const [especies, setEspecies] = useState<EspecieOption[]>([]);
    const [lotes, setLotes] = useState<LoteOption[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadLotes = async () => {
            setLoadingLotes(true);
            try {
                const lotesData = await apiFetch(`lotes_prod/all-lotes_prod?estado=listo_cosecha`);
                if (!mounted) return;

                // El backend retorna directamente un array
                const lotesList = Array.isArray(lotesData) ? lotesData : [];

                setLotes(lotesList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar los lotes");
            } finally {
                if (mounted) setLoadingLotes(false);
            }
        };

        loadLotes();

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

        const loadCategorias = async () => {
            setLoadingCategorias(true);
            try {
                const CategoriaData = await apiFetch(`categorias/all-categorias`);
                if (!mounted) return;

                const CategoriasList = Array.isArray(CategoriaData?.categorias)
                    ? CategoriaData.categorias
                    : Array.isArray(CategoriaData)
                        ? CategoriaData
                        : [];

                setCategorias(CategoriasList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar las categorías");
            } finally {
                if (mounted) setLoadingCategorias(false);
            }
        };

        loadCategorias();

        const loadEspecies = async () => {
            setLoadingEspecies(true);
            try {
                const EspecieData = await apiFetch(`especies/all-especies`);
                if (!mounted) return;
                const EspeciesList = Array.isArray(EspecieData?.especies)
                    ? EspecieData.especies
                    : Array.isArray(EspecieData)
                        ? EspecieData
                        : [];
                setEspecies(EspeciesList);
            } catch (requestError: any) {
                if (!mounted) return;
                setError(requestError?.detail || requestError?.message || "No se pudieron cargar las especies");
            } finally {
                if (mounted) setLoadingEspecies(false);
            }
        };

        loadEspecies();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange =
        (field: keyof Inv_prodFormState) =>
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
                nombre_producto: form.nombre_producto.trim(),
                cantidad: Number(form.cantidad),
                unid_medida_id: Number(form.unid_medida_id),
                fecha_ingreso: getLocalISODateTime(),
                fecha_vencimiento: form.fecha_vencimiento,
                lote_id: Number(form.lote_id),
                valor_unitario: Number(form.valor_unitario),
                categoria_id: Number(form.categoria_id),
                especie_id: Number(form.especie_id),
            };

            const data = await apiFetch("inv_produccion/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Producto registrado correctamente");
            setForm(initialState);
            navigate("/invProd");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al registrar el producto"
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
                            Registrar producto
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el producto.
                        </p>
                    </div>

                    <Link
                        to="/invProd"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a inv. producción
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
                                placeholder="Pernil de pollo"
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
                                Nombre lote <span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.lote_id || ""}
                                onChange={handleChange("lote_id")}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                                required
                                disabled={loadingLotes}
                            >
                                <option value="" disabled>
                                    {loadingLotes ? "Cargando lotes..." : "Selecciona un lote"}
                                </option>
                                {lotes.map((lote) => (
                                    <option key={lote.id_lote} value={String(lote.id_lote)}>
                                        {lote.nombre_lote}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Valor unitario <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.valor_unitario}
                                onChange={handleChange("valor_unitario")}
                                placeholder="12250.42"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Categoría producto <span className="text-error-500">*</span>
                            </label>
                            <select value={form.categoria_id || ""} onChange={handleChange("categoria_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required disabled={loadingCategorias || categorias.length === 0}>
                                <option value="" disabled>
                                    {loadingCategorias ? "Cargando categorías..." : "Selecciona una categoría"}
                                </option>
                                {categorias.map((categoria) => (
                                    <option key={categoria.id_categoria} value={String(categoria.id_categoria)}>
                                        {categoria.nombre_categoria}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Especie producto <span className="text-error-500">*</span>
                            </label>
                            <select value={form.especie_id || ""} onChange={handleChange("especie_id")} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required disabled={loadingEspecies || especies.length === 0}>
                                <option value="" disabled>
                                    {loadingEspecies ? "Cargando especies..." : "Selecciona una especie"}
                                </option>
                                {especies.map((especie) => (
                                    <option key={especie.id_especie} value={String(especie.id_especie)}>
                                        {especie.nombre_especie}
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
                            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Registrar inventario"}
                        </button>
                        <Link
                            to="/invProd"
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
