import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type SolicitudEstado =
  | "pendiente"
  | "entregada"
  | "cancelada"
  | "devuelta";

type SolicitudFormState = {
  maquinaria_id: number
  fecha_solicitud: string
  estado: SolicitudEstado
  nombre_maq: string
  user_id: number;
  observaciones: string
};

type MaquinariaOption = {
  id_maquina: number;
  nombre_maq: string;
  tipo_maq: string;
};

type UserOption = {
  id_user: number;
  nombre_user: string;
};

const initialState: SolicitudFormState = {
  maquinaria_id: 0,
  fecha_solicitud: new Date().toISOString().split("T")[0],
  estado: "pendiente",
  nombre_maq: "",
  user_id: 0,
  observaciones: "",
};

const ESTADO_OPTIONS: Array<{ value: SolicitudEstado; label: string }> = [
  { value: "pendiente", label: "Pendiente" },
  { value: "entregada", label: "Entregada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "devuelta", label: "Devuelta" },
];

export default function SolicitudCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SolicitudFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingMaquinaria, setLoadingMaquinaria] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [maquinaria, setMaquinaria] = useState<MaquinariaOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingMaquinaria(true);
      setLoadingUsers(true);

      try {
        const [maquinariaData, userData] = await Promise.all([
          apiFetch("maquinas/all_maquinas"),
          apiFetch("users/all-users-except-admins"),
        ]);

        if (!mounted) return;

        const MaquinaList = Array.isArray(maquinariaData)
          ? maquinariaData
          : maquinariaData?.maquinaria ?? maquinariaData?.data ?? [];

        const UserList = Array.isArray(userData)
          ? userData
          : userData?.users ?? [];
        setMaquinaria(MaquinaList);
        setUsers(UserList);

      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los datos necesarios para el formulario");

      } finally {
        if (mounted) {
          setLoadingMaquinaria(false);
          setLoadingUsers(false);
        }
      }
    };

    loadCatalogs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (form.maquinaria_id && form.maquinaria_id !== 0) {
      const maquinariaEncontrada = maquinaria.find(
        (item) => item.id_maquina === Number(form.maquinaria_id)
      );

      if (maquinariaEncontrada && maquinariaEncontrada.tipo_maq) {
        setForm((current) => ({
          ...current,
          nombre_maq: maquinariaEncontrada.nombre_maq,
        }));
      }
    }

    if (form.user_id && form.user_id !== 0) {
      const userEncontrado = users.find(
        (user) => user.id_user === Number(form.user_id)
      );

      if (userEncontrado) {
        setForm((current) => ({
          ...current,
          nombre_user: userEncontrado.nombre_user,
        }));
      }
    }
  }, [form.maquinaria_id, maquinaria, form.user_id, users]);

  const handleChange =
    (field: keyof SolicitudFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;

        if (field === "maquinaria_id" || field === "user_id") {
          setForm((current) => ({
            ...current,
            [field]: Number(value),
          }));
          return;
        }

        if (field === "estado") {
          setForm((current) => ({
            ...current,
            estado: value as SolicitudEstado,
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
        maquinaria_id: Number(form.maquinaria_id),
        fecha_solicitud: form.fecha_solicitud,
        estado: form.estado,
        user_id: Number(form.user_id),
        observaciones: form.observaciones.trim(),
      };

      const data = await apiFetch("solicitud-maq/crear", {
        method: "POST",
        body: payload,
      });


      setSuccess(data?.message || "Solicitud creada correctamente");
      setForm(initialState);
      navigate("/solicitud-maq");
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva solicitud de maquinaria</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar la solicitud.
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Solicitante <span className="text-error-500">*</span>
              </label>
              <select
                value={form.user_id}
                onChange={handleChange("user_id")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Máquina <span className="text-error-500">*</span>
              </label>
              <select
                value={form.maquinaria_id}
                onChange={handleChange("maquinaria_id")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
                disabled={loadingMaquinaria || maquinaria.length === 0}
              >
                <option value={0} disabled>
                  {loadingMaquinaria ? "Cargando maquinaria..." : "Selecciona una maquinaria"}
                </option>
                {maquinaria.map((maq) => (
                  <option key={maq.id_maquina} value={maq.id_maquina}>
                    {maq.nombre_maq}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de solicitud
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
                Estado de la solicitud <span className="text-error-500">*</span>
              </label>
              <select
                value={form.estado}
                onChange={handleChange("estado")}
                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
              >
                {ESTADO_OPTIONS.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observaciones
              </label>
              <input
                type="text"
                id="observaciones"
                value={form.observaciones || ""}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className="mt-1 block w-full rounded-md focus:border-gray-300 border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                placeholder="Observaciones"
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
              {loading ? "Guardando..." : "Guardar solicitud"}
            </button>
            <Link
              to="/solicitud-maq"
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
