import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";


type LoteFormState = {
  nombre_lote: string;
  ubicacion: string;
  latitud: string;
  longitud: string;
};



const emptyState: LoteFormState = {
  nombre_lote: "",
  ubicacion: "",
  latitud: "",
  longitud: "",
};


export default function LotesEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id_lote_g;

  const [form, setForm] = useState<LoteFormState>(emptyState);
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
        const loteData = await apiFetch(`lotes/lote_by_id?lote_id=${id}`)

        if (!mounted) return;

        setForm({
          nombre_lote: loteData?.nombre_lote || "",
          ubicacion: loteData?.ubicacion || "",
          latitud: loteData?.latitud || "",
          longitud: loteData?.longitud || "",
        });
  
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
        nombre_lote: form.nombre_lote.trim(),
        ubicacion: form.ubicacion.trim(),
        latitud: form.latitud.trim(),
        longitud: form.longitud.trim(),
      };

      // Primero actualizar campos editables por LoteUpdate
      await apiFetch(`lotes/by-id/${id}?id_lote=${id}`, {
        method: "PUT",
        body: payload,
      });
      
      console.log("Payload a enviar para actualización:", payload);
      setSuccess("Lote actualizado correctamente");
      setTimeout(() => navigate("/lotesGranja"), 800);
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "No se pudo actualizar el lote");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Editar lote | Inventario Lembo" description="Editar lote" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar lote</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos del lote.</p>
          </div>

          <Link
            to="/lotesGranja"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a lotes granja
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
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    required
                    maxLength={25}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ubicación <span className="text-error-500">*</span>
                  </label>
                  <input
                    value={form.ubicacion}
                    onChange={handleChange("ubicacion")}
                    placeholder="Ubicación del lote"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Latitud <span className="text-error-500">*</span>
                  </label>
                  <input
                    value={form.latitud}
                    onChange={handleChange("latitud")}
                    placeholder="Latitud"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    required
                    maxLength={25}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Longitud <span className="text-error-500">*</span>
                  </label>
                  <input
                    value={form.longitud}
                    onChange={handleChange("longitud")}
                    placeholder="Longitud"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-4₀ focus:border-brand-3₀₀ dark:border-gray-7₀₀ dark:text-white/9₀ dark:focus:border-brand-8₀₀"
                    required
                    maxLength={25}
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
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Actualizar lote"}
                </button>
                <Link
                  to="/lotesGranja"
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
