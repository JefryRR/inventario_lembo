import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type DevolucionEstado =
  | "Daño"
  | "Error de pedido";

type DevolucionFormState = {
  id_detalle_venta: number;
  cant_devolucion: number;
  unid_medida_id: number;
  venta_id: number;
  motivo: DevolucionEstado;
  fecha_dev: string;
  user_id: number;
  observacion: string | null;
  nombre_producto: string;
  nombre_comprador: string;
  nombre_user: string;
  simbolo: string;
};

type DetalleOption = {
  id_detalle_venta: number;
  venta_id: number;
  nombre_comprador: string;
  nombre_producto: string;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

type UserOption = {
    id_user: number;
    nombre_user: string;
};

const initialState: DevolucionFormState = {
  id_detalle_venta: 0,
  cant_devolucion: 0,
  unid_medida_id: 0,
  venta_id: 0,
  motivo: "Daño",
  fecha_dev: "",
  user_id: 0,
  observacion: null,
  nombre_producto: "",
  nombre_comprador: "",
  nombre_user: "",
  simbolo: "",
};

const ESTADO_OPTIONS: Array<{ value: DevolucionEstado; label: string }> = [
  { value: "Daño", label: "Daño" },
  { value: "Error de pedido", label: "Error de pedido" },
];

export default function DevolucionCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<DevolucionFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [detalles, setDetalles] = useState<DetalleOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingDetalles(true);
      setLoadingMedidas(true);
      setLoadingUsers(true);

      try {
        const [detallesData, medidasData, usersData] = await Promise.all([
          apiFetch("detalles-venta/all/detalles"),
          apiFetch("unid-medida/all-unid_medidas"),
          apiFetch("users/all-users-except-admins"),
        ]);

        if (!mounted) return;

        const DetallesList = Array.isArray(detallesData?.detalles)
          ? detallesData.detalles
          : Array.isArray(detallesData)
            ? detallesData
            : [];

        const medidaList = Array.isArray(medidasData?.medidas)
          ? medidasData.medidas
          : Array.isArray(medidasData)
            ? medidasData
            : [];

        const userList = Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData)
            ? usersData
            : [];

        setDetalles(DetallesList);
        setMedidas(medidaList);
        setUsers(userList);
      } catch (requestError: any) {
      if (!mounted) return;
      setError(requestError?.detail || requestError?.message || "No se pudieron cargar los datos");
      } finally {
        if (mounted) {
          setLoadingDetalles(false);
          setLoadingMedidas(false);
          setLoadingUsers(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

    const handleChange =
      (field: keyof DevolucionFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = event.target.value;

        if (field === "id_detalle_venta" || field === "cant_devolucion" || field === "unid_medida_id" || field === "user_id") {
          setForm((current) => ({ ...current, [field]: Number(value) }));
          return;
        }

        if (field === "observacion") {
          setForm((current) => ({ ...current, observacion: value }));
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
        id_detalle_venta: Number(form.id_detalle_venta),
        venta_id: Number(form.venta_id),
        cant_devolucion: Number(form.cant_devolucion),
        unid_medida_id: Number(form.unid_medida_id),
        motivo: form.motivo,
        fecha_dev: form.fecha_dev,
        user_id: Number(form.user_id),
        observacion: form.observacion ? form.observacion.trim() : null,
      };

      const data = await apiFetch("devoluciones/crear", {
        method: "POST",
        body: payload,
      });

      setSuccess(data?.message || "Devolución creada correctamente");
      setForm(initialState);
      navigate("/devoluciones");
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear la devolución");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Crear devolución | Inventario Lembo" description="Formulario para crear una nueva devolución" />
      <PageBreadcrumb pageTitle="Crear devolución" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva devolución</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar la devolución.
            </p>
          </div>

          <Link
            to="/devoluciones"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a devoluciones
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de devolución <span className="text-error-500">*</span>
                </label>
                <input
                    type="datetime-local"
                    value={form.fecha_dev}
                    onChange={handleChange("fecha_dev")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    required
                />
                </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Detalle de venta <span className="text-error-500">*</span>
              </label>
              <select
                value={form.id_detalle_venta}
                onChange={handleChange("id_detalle_venta")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
                disabled={loadingDetalles || detalles.length === 0}
              >
                <option value={0} disabled>
                  {loadingDetalles ? "Cargando detalles..." : "Selecciona un detalle de venta"}
                </option>
                {detalles.map((detalle) => (
                  <option key={detalle.id_detalle_venta} value={detalle.id_detalle_venta}>
                    {detalle.nombre_producto ? `${detalle.nombre_producto} — ${detalle.nombre_comprador}` : detalle.nombre_comprador}
                  </option>
                ))}
              </select>
            </div>

            <div>
                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad a devolver <span className="text-error-500">*</span>
                </label>
                <input
                    type="number"
                    value={form.cant_devolucion}
                    onChange={handleChange("cant_devolucion")}
                    min={1}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    required
                />
                </div>
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo <span className="text-error-500">*</span>
              </label>
              <select
                value={form.motivo}
                onChange={handleChange("motivo")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
              >
                {ESTADO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                  onChange={handleChange("observacion")}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                  placeholder="Observación de la devolución"
                />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuario responsable <span className="text-error-500">*</span>
              </label>
              <select
                value={form.user_id}
                onChange={handleChange("user_id")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
                disabled={loadingUsers || users.length === 0}
              >
                <option value={0} disabled>
                  {loadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"}
                </option>
                {users.map((user) => (
                  <option key={user.id_user} value={user.id_user}>
                    {user.nombre_user}
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
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar devolución"}
            </button>
            <Link
              to="/devoluciones"
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
