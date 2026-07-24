import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Definición de tipos para el estado del formulario de edición de solicitudes de maquinaria
type SolicitudEstado = "pendiente" | "entregada" | "cancelada" | "devuelta";

type SolicitudFormState = {
  maquinaria_id: number;
  fecha_entrega: string;
  fecha_devolucion: string;
  estado: SolicitudEstado;
  nombre_maq: string;
  user_id: number;
  nombre_user: string;
  observaciones: string;
};

type MaquinariaOption = {
  id_maquina: number;
  nombre_maq: string;
  tipo_maq: string;
};

// Estado inicial del formulario para editar una solicitud de maquinaria
const emptyState: SolicitudFormState = {
  maquinaria_id: 0,
  fecha_entrega: "",
  fecha_devolucion: "",
  estado: "pendiente",
  nombre_maq: "",
  user_id: 0,
  nombre_user: "",
  observaciones: "",
};

// Opciones de estado para el select en el formulario de edición de solicitudes
const ESTADO_OPTIONS: Array<{ value: SolicitudEstado; label: string }> = [
  { value: "pendiente", label: "Pendiente" },
  { value: "entregada", label: "Entregada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "devuelta", label: "Devuelta" },
];

// Componente principal para editar una solicitud de maquinaria existente
export default function SolicitudEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id || params.id_solicitud || params.solicitud_id;

  const [form, setForm] = useState<SolicitudFormState>(emptyState);
  const [originalEstado, setOriginalEstado] = useState<SolicitudEstado | null>(null);
  const [maquina, setMaquina] = useState<MaquinariaOption[]>([]);
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
        const [solicitudData, maquinaData] = await Promise.all([
          apiFetch(`solicitud-maq/by-id?id=${id}`),
          apiFetch("maquinas/all_maquinas"),
        ]);

        if (!mounted) return;

        const maquinaList = Array.isArray(maquinaData?.maquinaria)
          ? maquinaData.maquinaria
          : Array.isArray(maquinaData)
            ? maquinaData
            : [];

        setMaquina(maquinaList);

        setForm({
          fecha_entrega: solicitudData?.fecha_entrega || "",
          fecha_devolucion: solicitudData?.fecha_devolucion || "",
          user_id: Number(solicitudData?.user_id ?? 0),
          nombre_user: solicitudData?.nombre_user || "",
          maquinaria_id: Number(solicitudData?.maquinaria_id ?? 0),
          estado: (solicitudData?.estado as SolicitudEstado) || "pendiente",
          nombre_maq: solicitudData?.nombre_maq || "",
          observaciones: solicitudData?.observaciones || "",
        });

        setOriginalEstado(
          (solicitudData?.estado as SolicitudEstado) || null,
        );
      } catch (requestError: any) {
        if (!mounted) return;
        setError(
          requestError?.detail ||
            requestError?.message ||
            "No se pudo cargar la solicitud",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Función para manejar los cambios en los campos del formulario de edición de solicitudes
  const handleChange =
    (field: keyof SolicitudFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      // Campos numéricos
      if (field === "maquinaria_id" || field === "user_id") {
        setForm((current) => ({ ...current, [field]: Number(value) }));
        return;
      }

      // Campo estado (enum)
      if (field === "estado") {
        setForm((current) => ({
          ...current,
          estado: value as SolicitudEstado,
        }));
        return;
      }

      setForm((current) => ({ ...current, [field]: value }));
    };

  // Función para manejar el envío del formulario de edición de solicitudes
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
        const payload = {
        maquinaria_id: Number(form.maquinaria_id),
        estado: form.estado,
        user_id: Number(form.user_id) || null,
        observaciones: form.observaciones.trim() || null,
        };

        await apiFetch(`solicitud-maq/update/${id}`, {
        method: "PUT",
        body: payload,
        });

        const solicitudActualizada = await apiFetch(`solicitud-maq/by-id?id=${id}`);

        setForm((current) => ({
        ...current,
        fecha_entrega: solicitudActualizada?.fecha_entrega || "",
        fecha_devolucion: solicitudActualizada?.fecha_devolucion || "",
        }));

        setOriginalEstado(form.estado);
        setSuccess("Solicitud actualizada correctamente");
        setTimeout(() => navigate("/solicitud-maq"), 800);
    } catch (requestError: any) {
        setError(
        requestError?.detail ||
            requestError?.message ||
            "No se pudo actualizar la solicitud",
        );
    } finally {
        setSaving(false);
    }
    };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Editar solicitud
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Actualiza los datos de la solicitud.
            </p>
          </div>

          <Link
            to="/solicitud-maq"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a solicitudes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Cargando solicitud...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-error-500">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Máquina <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.maquinaria_id}
                    onChange={handleChange("maquinaria_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={maquina.length === 0}
                  >
                    <option className="dark:text-black/90" value={0} disabled>
                      Selecciona una máquina
                    </option>
                    {maquina.map((m) => (
                      <option className="dark:text-black/90" key={m.id_maquina} value={m.id_maquina}>
                        {m.nombre_maq} ({m.tipo_maq})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado de la solicitud{" "}
                    <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.estado}
                    onChange={handleChange("estado")}
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    value={form.observaciones}
                    onChange={handleChange("observaciones")}
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
                  to="/solicitud-maq"
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
