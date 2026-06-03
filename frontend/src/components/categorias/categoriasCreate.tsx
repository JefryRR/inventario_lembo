import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type CategoriaFormState = {
    nombre_categoria: string;
};

const initialState: CategoriaFormState = {
    nombre_categoria: "",
};

export default function CategoriasCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<CategoriaFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_categoria: form.nombre_categoria,
            };

            const data = await apiFetch("categorias/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Categoría creada correctamente");
            setForm(initialState);
            navigate("/categorias");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al crear la categoría"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Nueva categoría
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la categoría.
                        </p>
                    </div>

                    <Link
                        to="/categorias"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a categorías
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre de categoría
                            </label>
                            <input
                                type="text"
                                id="nombre"
                                value={form.nombre_categoria}
                                onChange={(e) => setForm({ ...form, nombre_categoria: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                placeholder="Nombre de la categoría"
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
                            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Guardando..." : "Guardar categoría"}
                        </button>
                        <Link
                            to="/categorias"
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
