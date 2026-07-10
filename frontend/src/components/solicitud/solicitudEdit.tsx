import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type SolicitudEstado =
  | "pendiente"
  | "entregado"
  | "cancelado"
  | "devuelto";

type SolicitudFormState = {
  solicitante: string
  ficha: string
  insumo_id: number
  cantidad_in: number
  cant_devolver: number
  unid_med_id: number
  tipo_insumo_id: number
  estado_solicitud: SolicitudEstado
  nombre_tipo: string
  simbolo: string
  nombre_producto: string
};

type TipoOption = {
  id_tipo_insumo: number;
  nombre_tipo: string;
};

type InventarioOption = {
  id_insumo: number;
  nombre_producto: string;
  cantidad: number;
  simbolo: string;
  tipo_id: number;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

const emptyState: SolicitudFormState = {
  solicitante: "",
  ficha: "",
  insumo_id: 0,
  cantidad_in: 0,
  cant_devolver: 0,
  unid_med_id: 0,
  tipo_insumo_id: 0,
  estado_solicitud: "pendiente",
  nombre_tipo: "",
  simbolo: "",
  nombre_producto: "",
};

const ESTADO_OPTIONS: Array<{ value: SolicitudEstado; label: string }> = [
  { value: "pendiente", label: "Pendiente" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "devuelto", label: "Devuelto" },
];

export default function SolicitudEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id || params.id_solicitud || params.solicitud_id;

  const [form, setForm] = useState<SolicitudFormState>(emptyState);
  const [originalEstado, setOriginalEstado] = useState<SolicitudEstado | null>(null);
  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [inventarios, setInventarios] = useState<InventarioOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
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
        const [solicitudData, tiposData, inventariosData, medidasData] = await Promise.all([
          apiFetch(`solicitud/by-id?id=${id}`),
          apiFetch("tipo_insumos/all-tipo_insumo"),
          apiFetch("inv_insumos/all_insumos"),
          apiFetch("unid-medida/all-unid_medidas"),
        ]);

        if (!mounted) return;

        const tiposList = Array.isArray(tiposData?.tipos)
          ? tiposData.tipos
          : Array.isArray(tiposData)
            ? tiposData
            : [];

        const inventariosList = Array.isArray(inventariosData?.inventarios)
          ? inventariosData.inventarios
          : Array.isArray(inventariosData)
            ? inventariosData
            : [];

        const medidasList = Array.isArray(medidasData?.medidas)
          ? medidasData.mediciones
          : Array.isArray(medidasData)
            ? medidasData
            : [];

        setTipos(tiposList);
        setInventarios(inventariosList);
        setMedidas(medidasList);

        setForm({
          solicitante: solicitudData?.solicitante || "",
          ficha: solicitudData?.ficha || "",
          cantidad_in: Number(solicitudData?.cantidad_in ?? 0),
          cant_devolver: Number(solicitudData?.cant_devolver ?? 0),
          insumo_id: Number(solicitudData?.insumo_id ?? 0),
          unid_med_id: Number(solicitudData?.unid_med_id ?? 0),
          tipo_insumo_id: Number(solicitudData?.tipo_insumo_id ?? 0),
          estado_solicitud: (solicitudData?.estado_solicitud as SolicitudEstado) || "pendiente",
          nombre_tipo: solicitudData?.nombre_tipo || "",
          simbolo: solicitudData?.simbolo || "",
          nombre_producto: solicitudData?.nombre_producto || "",
        });
        console.log(solicitudData?.fecha_entrega);
        console.log(new Date(solicitudData?.fecha_entrega));
        setOriginalEstado((solicitudData?.estado_solicitud as SolicitudEstado) || null);
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudo cargar la solicitud");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

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
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        solicitante: form.solicitante.trim(),
        ficha: form.ficha.trim(),
        cantidad: Number(form.cantidad_in),
        cant_devolver: Number(form.cant_devolver),
        insumo_id: Number(form.insumo_id),
        unid_med_id: Number(form.unid_med_id),
        estado_solicitud: form.estado_solicitud,
        tipo_insumo_id: Number(form.tipo_insumo_id),
      };

      // Primero actualizar campos editables por SolicitudUpdate
      await apiFetch(`solicitud/update/${id}`, {
        method: "PUT",
        body: payload,
      });

      // Si el estado cambió, llamar al endpoint específico de estado
      if (originalEstado && originalEstado !== form.estado_solicitud) {
        // El router espera 'estado' (query) y toma 'id_solicitud' desde query también
        await apiFetch(`solicitud/estado/${id}?estado=${id}&estado=${form.estado_solicitud}`, {
          method: "PUT",
        });
      }

      setSuccess("Solicitud actualizada correctamente");
      setTimeout(() => navigate("/solicitud"), 800);
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "No se pudo actualizar la solicitud");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar solicitud</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos de la solicitud.</p>
          </div>

          <Link
            to="/solicitud"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a solicitudes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando solicitud...</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-error-500">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Solicitante <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.solicitante}
                    onChange={handleChange("solicitante")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ficha <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ficha}
                    onChange={handleChange("ficha")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Producto <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.insumo_id}
                    onChange={handleChange("insumo_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={inventarios.length === 0}
                  >
                    <option className="dark:text-black/90" value={0} disabled>
                      Selecciona un insumo
                    </option>
                    {inventarios.map((insumo) => (
                      <option className="dark:text-black/90" key={insumo.id_insumo} value={insumo.id_insumo}>
                        {insumo.nombre_producto} - cant disponible: {insumo.cantidad} {insumo.simbolo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad a solicitar <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.cantidad_in}
                    onChange={handleChange("cantidad_in")}
                    min={1}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={medidas.length === 0}
                  >
                    <option className="dark:text-black/90" value={0} disabled>
                      Selecciona una unidad de medida
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
                      <option className="dark:text-black" key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad a devolver <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.cant_devolver}
                    onChange={handleChange("cant_devolver")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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
                  {saving ? "Guardando..." : "Actualizar solicitud"}
                </button>
                <Link
                  to="/solicitud"
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
