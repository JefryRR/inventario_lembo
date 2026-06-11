import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type LoteEstado =
  | "activo"
  | "finalizado"
  | "cuarentena"
  | "cosechar"
  | "listo_para_carne";

type LoteFormState = {
  nombre_lote: string;
  fecha_siembra: string;
  fecha_cosecha: string;
  cantidad_inicial: number;
  especie_id: number;
  categoria_id: number;
  estado_lote: LoteEstado;
  user_id: number;
};

type EspecieOption = {
  id_especie: number;
  nombre_especie: string;
};

type CategoriaOption = {
  id_categoria: number;
  nombre_categoria: string;
};

type UserOption = {
  id_user: number;
  nombre_user: string;
};

const emptyState: LoteFormState = {
  nombre_lote: "",
  fecha_siembra: "",
  fecha_cosecha: "",
  cantidad_inicial: 0,
  especie_id: 0,
  categoria_id: 0,
  estado_lote: "activo",
  user_id: 0,
};

const ESTADO_OPTIONS: Array<{ value: LoteEstado; label: string }> = [
  { value: "activo", label: "Activo" },
  { value: "finalizado", label: "Finalizado" },
  { value: "cuarentena", label: "Cuarentena" },
  { value: "cosechar", label: "Cosechar" },
  { value: "listo_para_carne", label: "Listo para carne" },
];

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

export default function LotesEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id || params.id_lote || params.lote_id;

  const [form, setForm] = useState<LoteFormState>(emptyState);
  const [originalEstado, setOriginalEstado] = useState<LoteEstado | null>(null);
  const [especies, setEspecies] = useState<EspecieOption[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
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
        const [loteData, especiesData, categoriasData, usersData] = await Promise.all([
          apiFetch(`lotes_prod/by-id?lote_id=${id}`),
          apiFetch("especies/all-especies"),
          apiFetch("categorias/all-categorias"),
          apiFetch("users/all-users-except-admins"),
        ]);

        if (!mounted) return;

        const especieList = Array.isArray(especiesData?.especies)
          ? especiesData.especies
          : Array.isArray(especiesData)
            ? especiesData
            : [];

        const categoriaList = Array.isArray(categoriasData?.categorias)
          ? categoriasData.categorias
          : Array.isArray(categoriasData)
            ? categoriasData
            : [];

        const userList = Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData)
            ? usersData
            : [];

        setEspecies(especieList);
        setCategorias(categoriaList);
        setUsers(userList);

        setForm({
          nombre_lote: loteData?.nombre_lote || "",
          fecha_siembra: toDatetimeLocal(loteData?.fecha_siembra),
          fecha_cosecha: toDatetimeLocal(loteData?.fecha_cosecha),
          cantidad_inicial: Number(loteData?.cantidad_inicial ?? 0),
          especie_id: Number(loteData?.especie_id ?? 0),
          categoria_id: Number(loteData?.categoria_id ?? 0),
          estado_lote: (loteData?.estado_lote as LoteEstado) || "activo",
          user_id: Number(loteData?.user_id ?? 0),
        });
        setOriginalEstado((loteData?.estado_lote as LoteEstado) || null);
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudo cargar el lote");
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
    (field: keyof LoteFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      if (field === "cantidad_inicial" || field === "especie_id" || field === "categoria_id" || field === "user_id") {
        setForm((current) => ({
          ...current,
          [field]: Number(value),
        }));
        return;
      }

      if (field === "estado_lote") {
        setForm((current) => ({
          ...current,
          estado_lote: value as LoteEstado,
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

    if (new Date(form.fecha_cosecha) < new Date(form.fecha_siembra)) {
      setError("La fecha de cosecha no puede ser menor a la fecha de siembra");
      setSaving(false);
      return;
    }

      try {
        const payload = {
          nombre_lote: form.nombre_lote.trim(),
          fecha_siembra: form.fecha_siembra,
          fecha_cosecha: form.fecha_cosecha,
          cantidad_inicial: Number(form.cantidad_inicial),
          especie_id: Number(form.especie_id),
          categoria_id: Number(form.categoria_id),
          user_id: Number(form.user_id),
        };

        // Primero actualizar campos editables por LoteUpdate
        await apiFetch(`lotes_prod/by-id/${id}?id_lote=${id}`, {
          method: "PUT",
          body: payload,
        });

        // Si el estado cambió, llamar al endpoint específico de estado
        if (originalEstado && originalEstado !== form.estado_lote) {
          // El router espera 'estado' (query) y toma 'id_lote' desde query también
          await apiFetch(`lotes_prod/estado/${id}?id_lote=${id}&estado=${form.estado_lote}`, {
            method: "PUT",
          });
        }

        setSuccess("Lote actualizado correctamente");
        setTimeout(() => navigate("/lotesProd"), 800);
      } catch (requestError: any) {
        setError(requestError?.detail || requestError?.message || "No se pudo actualizar el lote");
      } finally {
        setSaving(false);
      }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar lote</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del lote.</p>
          </div>

          <Link
            to="/lotesProd"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a lotes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando lote...</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-error-500">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre del lote <span className="text-error-500">*</span>
                  </label>
                  <input
                    value={form.nombre_lote}
                    onChange={handleChange("nombre_lote")}
                    placeholder="Lote A1"
                    readOnly
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                    maxLength={25}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad inicial <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.cantidad_inicial}
                    onChange={handleChange("cantidad_inicial")}
                    min={1}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de siembra <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_siembra}
                    onChange={handleChange("fecha_siembra")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de cosecha <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_cosecha}
                    onChange={handleChange("fecha_cosecha")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Especie <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.especie_id}
                    onChange={handleChange("especie_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={especies.length === 0}
                  >
                    <option value={0} disabled>
                      Selecciona una especie
                    </option>
                    {especies.map((especie) => (
                      <option key={especie.id_especie} value={especie.id_especie}>
                        {especie.nombre_especie}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categoría <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.categoria_id}
                    onChange={handleChange("categoria_id")}
                    className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    required
                    disabled={categorias.length === 0}
                  >
                    <option value={0} disabled>
                      Selecciona una categoría
                    </option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id_categoria} value={categoria.id_categoria}>
                        {categoria.nombre_categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado del lote <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.estado_lote}
                    onChange={handleChange("estado_lote")}
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
                    <option value={0} disabled>
                      Selecciona un usuario
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
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Actualizar producción"}
                </button>
                <Link
                  to="/lotesProd"
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
