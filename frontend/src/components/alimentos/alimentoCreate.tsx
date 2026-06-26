import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type AlimentoFormState = {
    lote_id: number;
    insumo_id: number;
    fecha_alimento: string;
    cantidad: number;
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

const initialState: AlimentoFormState = {
    lote_id: 0,
    insumo_id: 0,
    fecha_alimento: "",
    cantidad: 0,
    unid_medida_id: 0,
    nombre_producto: "",
    simbolo: "",
    nombre_lote: ""
};

export default function AlimentoCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AlimentoFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [loadingUnidad, setLoadingUnidad] = useState(false);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [insumos, setInsumos] = useState<InsumoOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingLotes(true);
      setLoadingInsumos(true);
      setLoadingUnidad(true);

      try {
        const [lotesData, insumosData, unidadesData] = await Promise.all([
          apiFetch("lotes_prod/all-lotes_prod"),
          apiFetch("inv_insumos/all_insumos"),
          apiFetch("unid-medida/all-unid_medidas"),
        ]);

        if (!mounted) return;

        const LoteList = Array.isArray(lotesData?.lotes)
          ? lotesData.lotes
          : Array.isArray(lotesData)
            ? lotesData
            : [];

        const Lotesvisibles = LoteList.filter((lote: LoteOption) => {
          const estado = lote.estado_lote === "activo" || lote.estado_lote === "cuarentena";
          return estado;
        });

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
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los lotes");
      } finally {
        if (mounted) {
          setLoadingLotes(false);
          setLoadingInsumos(false);
          setLoadingUnidad(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

    const handleChange =
        (field: keyof AlimentoFormState) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const value = event.target.value;

            if (field === "cantidad" || field === "insumo_id" || field === "unid_medida_id" || field === "lote_id") {
                setForm((current) => ({ ...current, [field]: Number(value) }));
                return;
            }

            setForm((current) => ({...current,[field]: value }));
        };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
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

      const data = await apiFetch("alimento_prod/create", {
        method: "POST",
        body: payload,
      });

      setSuccess(data?.message || "Alimento creado correctamente");
      setForm(initialState);
      navigate("/alimentos");
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear el alimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Crear alimento | Inventario Lembo" description="Formulario para crear un nuevo alimento" />
      <PageBreadcrumb pageTitle="Crear alimento" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo alimento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar el alimento.
            </p>
          </div>

          <Link
            to="/alimentos"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a alimentos
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
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
                disabled={loadingLotes || lotes.length === 0}
              >
                <option value={0} disabled>
                  {loadingLotes ? "Cargando lotes..." : "Selecciona un lote"}
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
                disabled={loadingInsumos || insumos.length === 0}
              >
                <option value={0} disabled>
                  {loadingInsumos ? "Cargando insumos..." : "Selecciona un alimento"}
                </option>
                {insumos.map((inv_insumos) => (
                  <option key={inv_insumos.id_insumo} value={inv_insumos.id_insumo}>
                    {inv_insumos.nombre_producto} cantidad: {inv_insumos.cantidad} {inv_insumos.simbolo}
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
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
                min={1}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800"
                required
                disabled={loadingUnidad || unidades.length === 0}
              >
                <option value={0} disabled>
                  {loadingUnidad ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                </option>
                {unidades.map((unidad) => (
                  <option key={unidad.id_unidad} value={unidad.id_unidad}>
                    {unidad.simbolo}
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
              {loading ? "Guardando..." : "Guardar alimento"}
            </button>
            <Link
              to="/alimentos"
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
