import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type LoteEstado =
  | "activo"
  | "finalizado"
  | "cuarentena"
  | "cosechar"
  | "listo_para_carne";

type LoteFormState = {
  lote_granj_id: number;
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

type GranjaOption = {
  id_lote_g: number;
  nombre_lote: string;
};

type UserOption = {
  id_user: number;
  nombre_user: string;
};

const initialState: LoteFormState = {
  lote_granj_id: 0,
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

export default function LotesCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoteFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingEspecies, setLoadingEspecies] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [especies, setEspecies] = useState<EspecieOption[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [lotes, setLotes] = useState<GranjaOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingEspecies(true);
      setLoadingCategorias(true);
      setLoadingLotes(true);
      setLoadingUsers(true);
      try {
        const [especiesData, categoriasData, lotesData, usersData] = await Promise.all([
          apiFetch("especies/all-especies"),
          apiFetch("categorias/all-categorias"),
          apiFetch("lotes/all-lotes_prod"),
          apiFetch("users/all-users-except-admins"),
          apiFetch("lotes/all-lotes_prod"),
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

        const loteList = Array.isArray(lotesData?.lotes)
          ? lotesData.lotes
          : Array.isArray(lotesData)
            ? lotesData
            : [];

        const userList = Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData)
            ? usersData
            : [];

        setEspecies(especieList);
        setCategorias(categoriaList);
        setLotes(loteList);
        setUsers(userList);

        // Preseleccionar lote desde query string si existe
        try {
          const params = new URLSearchParams(location.search);
          const loteIdParam = Number(params.get("lote_granj_id") || 0);
            if (loteIdParam > 0) {
              setForm((current) => ({ ...current, lote_granj_id: loteIdParam }));
            }
        } catch (e) {
          // ignore
        }
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los lotes");
      } finally {
        if (mounted) {
          setLoadingEspecies(false);
          setLoadingCategorias(false);
          setLoadingLotes(false);
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
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (new Date(form.fecha_cosecha) < new Date(form.fecha_siembra)) {
      setError("La fecha de cosecha no puede ser menor a la fecha de siembra");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        lote_granj_id: Number(form.lote_granj_id),
        nombre_lote: form.nombre_lote.trim(),
        fecha_siembra: form.fecha_siembra,
        fecha_cosecha: form.fecha_cosecha,
        cantidad_inicial: Number(form.cantidad_inicial),
        especie_id: Number(form.especie_id),
        categoria_id: Number(form.categoria_id),
        estado_lote: form.estado_lote,
        user_id: Number(form.user_id),
      };
      const data = await apiFetch("lotes_prod/create", {
        method: "POST",
        body: payload,
      });

      setSuccess(data?.message || "Lote creado correctamente");
      setForm(initialState);
      navigate("/lotesProd");
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear el lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo lote</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa los datos obligatorios para registrar el lote.
            </p>
          </div>

          <Link
            to="/lotesProd"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a lotes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del lote <span className="text-error-500">*</span>
              </label>
              <select
                  value={form.lote_granj_id}
                  onChange={handleChange("lote_granj_id")}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
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
                Cantidad inicial <span className="text-error-500">*</span>
              </label>
              <input
                type="number"
                value={form.cantidad_inicial}
                onChange={handleChange("cantidad_inicial")}
                min={1}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
                disabled={loadingEspecies || especies.length === 0}
              >
                <option value={0} disabled>
                  {loadingEspecies ? "Cargando especies..." : "Selecciona una especie"}
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                required
                disabled={loadingCategorias || categorias.length === 0}
              >
                <option value={0} disabled>
                  {loadingCategorias ? "Cargando categorías..." : "Selecciona una categoría"}
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
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
              {loading ? "Guardando..." : "Guardar lote"}
            </button>
            <Link
              to="/lotesProd"
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
