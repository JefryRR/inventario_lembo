import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type TratamientoFormState = {
  lote_id: number;
  medicina_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad: number;
  unid_medida_id: number;
  observacion: string;
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
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

const initialState: TratamientoFormState = {
  lote_id: 0,
  medicina_id: 0,
  fecha_inicio: "",
  fecha_fin: "",
  cantidad: 0,
  unid_medida_id: 0,
  observacion: "",
  user_id: 0,
  cant_convertida: 0,
  nombre_lote: "",
  nombre_producto: "",
  simbolo: "",
  nombre_user: "",
};

export default function TratamientoCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<TratamientoFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingMedicinas, setLoadingMedicinas] = useState(false);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [medicinas, setMedicinas] = useState<MedicinaOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingLotes(true);
      setLoadingMedicinas(true);
      setLoadingMedidas(true);

      try {
        const [lotesData, medicinasData, medidasData] = await Promise.all([
          apiFetch("lotes/all-lotes_prod"),
          apiFetch("inv_insumos/all_insumos"),
          apiFetch("unid-medida/all-unid_medidas"),
        ]);

        if (!mounted) return;

        const LoteList = Array.isArray(lotesData?.lotes)
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

        setLotes(LoteList);
        setMedicinas(medicinasVigentes);
        setMedidas(medidaList);

      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los lotes");

      } finally {
        if (mounted) {
          setLoadingLotes(false);
          setLoadingMedicinas(false);
          setLoadingMedidas(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange =
    (field: keyof TratamientoFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = event.target.value;

        if (field === "cantidad" || field === "medicina_id" || field === "unid_medida_id" || field === "lote_id") {
          setForm((current) => ({ ...current, [field]: Number(value) }));
          return;
        }

        if (field === "observacion") {
          setForm((current) => ({ ...current, observacion: value }));
          return;
        }

        setForm((current) => ({ ...current, [field]: value }));
      };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
      setError("La fecha de fin no puede ser menor a la fecha de inicio");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        nombre_lote: form.nombre_lote.trim(),
        nombre_producto: form.nombre_producto.trim(),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        cantidad: Number(form.cantidad),
        simbolo: form.simbolo.trim(),
        lote_id: Number(form.lote_id),
        medicina_id: Number(form.medicina_id),
        unid_medida_id: Number(form.unid_medida_id),
        observacion: form.observacion ? form.observacion.trim() : null,
        cantidad_convertida: Number(form.cant_convertida),
      };

      const data = await apiFetch("tratamiento/create", {
        method: "POST",
        body: payload,
      });

      setSuccess(data?.message || "Tratamiento creado correctamente");
      setForm(initialState);
      navigate("/tratamientos");
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear el tratamiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo tratamiento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar el tratamiento.
            </p>
          </div>

          <Link
            to="/tratamientos"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a tratamientos
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
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
                disabled={loadingLotes || lotes.length === 0}
              >
                <option value={0} disabled>
                  {loadingLotes ? "Cargando lotes..." : "Selecciona un lote"}
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
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
                disabled={loadingMedicinas || medicinas.length === 0}
              >
                <option value={0} disabled>
                  {loadingMedicinas ? "Cargando medicinas..." : "Selecciona una medicina"}
                </option>
                {medicinas.map((inv_insumos) => (
                  <option key={inv_insumos.id_insumo} value={inv_insumos.id_insumo}>
                    {inv_insumos.nombre_producto}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de Inicio <span className="text-error-500">*</span>
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
                Fecha fin <span className="text-error-500">*</span>
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
                disabled={loadingMedidas || medidas.length === 0}
              >
                <option value={0} disabled>
                  {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                </option>
                {medidas.map((medida) => (
                  <option key={medida.id_unidad} value={medida.id_unidad}>
                    {medida.simbolo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="observacion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observación
              </label>
              <input
                type="text"
                id="observacion"
                value={form.observacion || ""}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                className="mt-1 block w-full rounded-md focus:border-gray-300 border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
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
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar tratamiento"}
            </button>
            <Link
              to="/tratamientos"
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
