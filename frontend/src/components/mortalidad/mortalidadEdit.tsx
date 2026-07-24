import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// se usa solo para armar la URL completa de la foto servida como StaticFiles.
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:8000";

// Definición de tipos para el estado del formulario de mortalidad
type MortalidadFormState = {
  lote_id: number;
  fecha_reporte: string; // mostrado como readonly
  cantidad: number;
  observacion: string | null;
  user_id: number;
};

type LoteOption = {
  id_lote: number;
  nombre_lote: string;
  sublote: string;
};

type UserOption = {
  id_user: number;
  nombre_user: string;
};

// Estado inicial del formulario para editar un registro de mortalidad
const emptyState: MortalidadFormState = {
  lote_id: 0,
  fecha_reporte: "",
  cantidad: 0,
  observacion: null,
  user_id: 0,
};

// Función para convertir una fecha en formato ISO a un string compatible con <input type="datetime-local">
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

// Función para resolver la URL completa de la foto, considerando si es relativa o absoluta
function resolveFotoUrl(fotoUrl?: string | null): string | null {
  if (!fotoUrl) return null;
  if (fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")) return fotoUrl;
  return `${API_BASE_URL}${fotoUrl}`;
}

// Componente principal para editar un registro de mortalidad
export default function MortalidadEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id || params.id_mortalidad || params.mortalidad_id;

  const [form, setForm] = useState<MortalidadFormState>(emptyState);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const extractLotes = (data: any): LoteOption[] =>
      Array.isArray(data?.lotes) ? data.lotes :
        Array.isArray(data) ? data : [];

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // Lotes por separado para manejar estados vacíos
        const resultados: LoteOption[] = [];
        try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=activo"))); } catch { }
        try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=cuarentena"))); } catch { }
        try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=listo_cosecha"))); } catch { }

        // El resto en paralelo
        const [mData, usersData] = await Promise.all([
          apiFetch(`mortalidad/by-id?id_mortalidad=${id}`),
          apiFetch("users/all-users-except-admins"),
        ]);

        if (!mounted) return;

        const userList = Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData)
            ? usersData
            : [];

        // Si el lote del registro ya no está activo/en cuarentena/listo para cosecha
        // (p. ej. fue finalizado), no aparece en `resultados`. Lo inyectamos para que
        // el <select> muestre el valor correcto en vez de quedar vacío.
        const currentLoteId = Number(mData?.lote_id ?? 0);
        const yaIncluido = resultados.some((l) => l.id_lote === currentLoteId);
        if (currentLoteId && !yaIncluido && mData?.nombre_lote) {
          resultados.push({
            id_lote: currentLoteId,
            nombre_lote: mData.nombre_lote,
            sublote: mData.sublote ?? "",
          });
        }

        setLotes(resultados);
        setUsers(userList);
        setFotoUrl(mData?.foto_url ?? null);

        setForm({
          lote_id: currentLoteId,
          fecha_reporte: toDatetimeLocal(mData?.fecha_reporte),
          cantidad: Number(mData?.cantidad ?? 0),
          observacion: mData?.observacion ?? null,
          user_id: Number(mData?.user_id ?? 0),
        });
      } catch (requestError: any) {
        if (!mounted) return;
        setLoadError(requestError?.detail || requestError?.message || "No se pudo cargar el registro de mortalidad");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Función para manejar los cambios en los campos del formulario
  const handleChange =
    (field: keyof MortalidadFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        if (field === "cantidad" || field === "lote_id" || field === "user_id") {
          setForm((current) => ({ ...current, [field]: Number(value) }));
          return;
        }

        if (field === "observacion") {
          setForm((current) => ({ ...current, observacion: value || null }));
          return;
        }

        setForm((current) => ({ ...current, [field]: value }));
      };

  // Función para manejar el envío del formulario de edición de mortalidad
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!form.lote_id || form.lote_id === 0) {
      setError("Selecciona un lote");
      setSaving(false);
      return;
    }

    if (form.cantidad <= 0) {
      setError("La cantidad debe ser mayor a cero");
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        lote_id: Number(form.lote_id),
        cantidad: Number(form.cantidad),
        observacion: form.observacion ? form.observacion.trim() : null,
        user_id: Number(form.user_id),
      };

      await apiFetch(`mortalidad/by-id/${id}`, {
        method: "PUT",
        body: payload,
      });

      setSuccess("Registro de mortalidad actualizado correctamente");
      setTimeout(() => navigate("/mortalidad"), 700);
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "No se pudo actualizar el registro de mortalidad");
    } finally {
      setSaving(false);
    }
  };

  const fotoSrc = resolveFotoUrl(fotoUrl);

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar mortalidad</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza el registro de mortalidad.</p>
          </div>

          <Link
            to="/mortalidad"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a mortalidad
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando registro...</div>
          ) : loadError ? (
            <div className="p-6 text-center text-sm text-error-500">{loadError}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lote <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.lote_id}
                    onChange={handleChange("lote_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={lotes.length === 0}
                  >
                    <option className="dark:text-black" value={0} disabled>
                      Selecciona un lote
                    </option>
                    {lotes.map((lote) => (
                      <option className="dark:text-black" key={lote.id_lote} value={lote.id_lote}>
                        {lote.nombre_lote} {lote.sublote ? `- ${lote.sublote}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de reporte</label>
                  <input
                    type="datetime-local"
                    value={form.fecha_reporte}
                    readOnly
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad <span className="text-error-500">*</span>
                  </label>
                  <input
                    value={form.cantidad}
                    onChange={handleChange("cantidad")}
                    min={1}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Usuario responsable <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.user_id}
                    onChange={handleChange("user_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={users.length === 0}
                  >
                    <option className="dark:text-black" value={0} disabled>
                      Selecciona un usuario
                    </option>
                    {users.map((user) => (
                      <option className="dark:text-black" key={user.id_user} value={user.id_user}>
                        {user.nombre_user}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observación</label>
                  <textarea
                    value={form.observacion || ""}
                    onChange={handleChange("observacion")}
                    className="h-28 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    maxLength={255}
                  />
                </div>

                {fotoSrc && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Foto</label>
                    <a href={fotoSrc} target="_blank" rel="noreferrer" className="block h-28 w-28 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img src={fotoSrc} alt="Foto de mortalidad" className="h-full w-full object-cover" />
                    </a>
                    <p className="mt-1 text-xs text-gray-400">La foto no se puede reemplazar.</p>
                  </div>
                )}
              </div>

              {success && (
                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Actualizar mortalidad"}
                </button>
                <Link
                  to="/mortalidad"
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
