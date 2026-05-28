import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type DevolucionFormState = {
  id_devolucion?: number;
  id_detalle_venta: number;
  cant_devolucion: number;
  unid_medida_id: number;
  motivo: string;
  fecha_dev: string | null;
  user_id: number;
  observacion: string | null;
  nombre_producto: string;
  nombre_comprador: string;
  nombre_user: string;
  simbolo: string;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

const emptyState: DevolucionFormState = {
  id_detalle_venta: 0,
  cant_devolucion: 0,
  unid_medida_id: 0,
  motivo: "",
  fecha_dev: null,
  user_id: 0,
  observacion: null,
  nombre_producto: "",
  nombre_comprador: "",
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

export default function DevolucionEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  const [form, setForm] = useState<DevolucionFormState>(emptyState);
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
        const [devolucionData, medidasData] = await Promise.all([
          apiFetch(`devoluciones/by-id/devolucion?id=${id}`),
          apiFetch("unid-medida/all-unid_medidas"),
        ]);

        if (!mounted) return;

        const medidaList = Array.isArray(medidasData?.medidas)
          ? medidasData.medidas
          : Array.isArray(medidasData)
            ? medidasData
            : [];

        setMedidas(medidaList);

        setForm({
          id_detalle_venta: Number(devolucionData?.id_detalle_venta ?? 0),
          cant_devolucion: Number(devolucionData?.cant_devolucion ?? 0),
          unid_medida_id: Number(devolucionData?.unid_medida_id ?? 0),
          motivo: devolucionData?.motivo ?? "",
          fecha_dev: toDatetimeLocal(devolucionData?.fecha_dev),
          user_id: Number(devolucionData?.user_id ?? 0),
          observacion: devolucionData?.observacion ?? null,
          nombre_producto: devolucionData?.nombre_producto ?? "",
          nombre_comprador: devolucionData?.nombre_comprador ?? "",
          nombre_user: devolucionData?.nombre_user ?? "",
          simbolo: devolucionData?.simbolo ?? "",
        });
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudo cargar la devolución");
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
    (field: keyof DevolucionFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;

      if (field === "cant_devolucion" || field === "unid_medida_id" || field === "user_id") {
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

    try {
      const payload: any = {
        cant_devolucion: Number(form.cant_devolucion),
        motivo: form.motivo,
        observacion: form.observacion ? form.observacion.trim() : null,
      };

      await apiFetch(`devoluciones/update/devolucion/${id}`, {
        method: "PUT",
        body: payload,
      });

      setSuccess("Devolución actualizada correctamente");
      setTimeout(() => navigate("/devoluciones"), 800);
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "No se pudo actualizar la devolución");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Editar devolución | Inventario Lembo" description="Editar devolución" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar devolución</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos de la devolución.</p>
          </div>

          <Link
            to="/devoluciones"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a devoluciones
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando devolución...</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-error-500">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Producto</label>
                  <div className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 flex items-center">
                    {form.nombre_producto} {form.nombre_comprador ? `— ${form.nombre_comprador}` : ""}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de devolución</label>
                  <input
                    type="datetime-local"
                    value={form.fecha_dev ?? ""}
                    onChange={handleChange("fecha_dev")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    disabled
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad a devolver <span className="text-error-500">*</span></label>
                  <input
                    type="number"
                    value={form.cant_devolucion}
                    onChange={handleChange("cant_devolucion")}
                    min={1}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
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
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo <span className="text-error-500">*</span></label>
                  <select
                    value={form.motivo}
                    onChange={handleChange("motivo")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                  >
                    <option value="Daño">Daño</option>
                    <option value="Error de pedido">Error de pedido</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Usuario responsable</label>
                  <div className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 flex items-center">
                    {form.nombre_user}
                  </div>
                </div>
              </div>

              <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observación</label>
                  <textarea
                    value={form.observacion || ""}
                    onChange={handleChange("observacion")}
                    className="h-28 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    maxLength={255}
                  />
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
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Actualizar devolución"}
                </button>
                <Link
                  to="/devoluciones"
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
