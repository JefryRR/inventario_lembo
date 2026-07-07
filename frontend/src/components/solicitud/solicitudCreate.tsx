import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type SolicitudEstado =
  | "pendiente"
  | "entregado"
  | "cancelado"
  | "devuelto";

type SolicitudFormState = {
  solicitante: string
  insumo_id: number
  cantidad_in: number
  unid_med_id: number
  fecha_solicitud: string
  tipo_insumo_id: number
  estado_solicitud: SolicitudEstado
  nombre_tipo: string
  simbolo: string
  nombre_producto: string
  user_id: number;
  nombre_user: string
};

type TipoOption = {
  id_tipo_insumo: number;
  nombre_tipo: string;
};

type InventarioOption = {
  id_insumo: number;
  nombre_producto: string;
  dias_restantes: number;
  cantidad: number;
  simbolo: string;
  tipo_id: number;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

const initialState: SolicitudFormState = {
  solicitante: "",
  insumo_id: 0,
  cantidad_in: 0,
  unid_med_id: 0,
  fecha_solicitud: new Date().toISOString(),
  tipo_insumo_id: 0,
  estado_solicitud: "pendiente",
  nombre_tipo: "",
  simbolo: "",
  nombre_producto: "",
  user_id: 0,
  nombre_user: "",
};

const ESTADO_OPTIONS: Array<{ value: SolicitudEstado; label: string }> = [
  { value: "pendiente", label: "Pendiente" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "devuelto", label: "Devuelto" },
];

export default function SolicitudCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SolicitudFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingInventarios, setLoadingInventarios] = useState(false);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [inventarios, setInventarios] = useState<InventarioOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingInventarios(true);
      setLoadingMedidas(true);

      try {
        const [tiposData, inventariosData, medidasData] = await Promise.all([
          apiFetch("tipo_insumos/all-tipo_insumo"),
          apiFetch("inv_insumos/all_insumos"),
          apiFetch("unid-medida/all-unid_medidas"),
        ]);

        if (!mounted) return;

        const TipoList = Array.isArray(tiposData?.tipos)
          ? tiposData.tipos
          : Array.isArray(tiposData)
            ? tiposData
            : [];

        const InventarioList = Array.isArray(inventariosData)
          ? inventariosData.filter((insumo: InventarioOption) => insumo.dias_restantes > 0)
          : Array.isArray(inventariosData?.inventarios)
            ? inventariosData.inventarios.filter((insumo: InventarioOption) => insumo.dias_restantes > 0)
            : [];

        const medidaList = Array.isArray(medidasData?.medidas)
          ? medidasData.medidas
          : Array.isArray(medidasData)
            ? medidasData
            : [];

        setTipos(TipoList);
        setInventarios(InventarioList);
        setMedidas(medidaList);

      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los datos necesarios para el formulario");

      } finally {
        if (mounted) {
          setLoadingInventarios(false);
          setLoadingMedidas(false);
        }
      }
    };

    loadCatalogs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (form.insumo_id && form.insumo_id !== 0) {
      const insumoEncontrado = inventarios.find(
        (item) => item.id_insumo === Number(form.insumo_id)
      );

      // 3. Si lo encuentra, extraemos su tipo y lo guardamos automáticamente en el formulario
      if (insumoEncontrado && insumoEncontrado.tipo_id) {
        setForm((current) => ({
          ...current,
          tipo_insumo_id: insumoEncontrado.tipo_id, 
        }));
      }
    }
  }, [form.insumo_id, inventarios]);

  const handleChange =
    (field: keyof SolicitudFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;

        if (field === "cantidad_in" || field === "insumo_id" || field === "unid_med_id" || field === "tipo_insumo_id") {
          setForm((current) => ({
            ...current,
            [field]: Number(value),
          }));
          return;
        }

        if (field === "estado_solicitud") {
          setForm((current) => ({
            ...current,
            estado_solicitud: value as SolicitudEstado,
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
        solicitante: form.solicitante.trim(),
        insumo_id: Number(form.insumo_id),
        cantidad_in: Number(form.cantidad_in),
        unid_med_id: Number(form.unid_med_id),
        fecha_solicitud: form.fecha_solicitud,
        tipo_insumo_id: Number(form.tipo_insumo_id),
        estado_solicitud: form.estado_solicitud,
        user_id: Number(form.user_id),
      };

      const data = await apiFetch("solicitud/crear", {
        method: "POST",
        body: payload,
      });


      setSuccess(data?.message || "Solicitud creada correctamente");
      setForm(initialState);
      navigate("/solicitud");
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva solicitud de insumo</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar la solicitud.
            </p>
          </div>

          <Link
            to="/solicitud"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a solicitudes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre del solicitante<span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                id="solicitante"
                required
                value={form.solicitante || ""}
                onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                className="mt-1 block w-full rounded-md focus:border-gray-300 border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                placeholder="Pepe Pérez"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Producto <span className="text-error-500">*</span>
              </label>
              <select
                value={form.insumo_id}
                onChange={handleChange("insumo_id")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white dark:focus:border-gray-800"
                required
                disabled={loadingInventarios || inventarios.length === 0}
              >
                <option value={0} disabled>
                  {loadingInventarios ? "Cargando insumos..." : "Selecciona un insumo"}
                </option>
                {inventarios.map((inv_insumos) => (
                  <option className="dark:text-black/90" key={inv_insumos.id_insumo} value={inv_insumos.id_insumo}>
                    {inv_insumos.nombre_producto} - cant disponible: {inv_insumos.cantidad} {inv_insumos.simbolo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cantidad <span className="text-error-500">*</span>
              </label>
              <input
                value={form.cantidad_in}
                onChange={handleChange("cantidad_in")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidad de medida <span className="text-error-500">*</span>
              </label>
              <select
                value={form.unid_med_id}
                onChange={handleChange("unid_med_id")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
                disabled={loadingMedidas || medidas.length === 0}
              >
                <option className="dark:text-black/90" value={0} disabled>
                  {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                </option>
                {medidas.map((medida) => (
                  <option className="dark:text-black/90" key={medida.id_unidad} value={medida.id_unidad}>
                    {medida.simbolo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de solicitud <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                value={form.fecha_solicitud}
                onChange={handleChange("fecha_solicitud")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de insumo <span className="text-error-500">*</span>
              </label>
              <div className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {/* Buscamos el nombre en la lista de tipos usando el ID guardado de forma automática */}
                {tipos.find(t => t.id_tipo_insumo === form.tipo_insumo_id)?.nombre_tipo || "Cargando tipo..."}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado de la solicitud <span className="text-error-500">*</span>
              </label>
              <select
                value={form.estado_solicitud}
                onChange={handleChange("estado_solicitud")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
              >
                {ESTADO_OPTIONS.map((estado) => (
                  <option className="dark:text-black/90" key={estado.value} value={estado.value}>
                    {estado.label}
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
              {loading ? "Guardando..." : "Guardar solicitud"}
            </button>
            <Link
              to="/solicitud"
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
