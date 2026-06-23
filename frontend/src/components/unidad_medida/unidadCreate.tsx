import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type UnidadFormState = {
    unidad: string;
    simbolo: string;
    conversion: string | number;
    tipo?: string;
};

const initialState = {
    unidad: "",
    simbolo: "",
    conversion: "" as string | number,
    tipo:"inventario",
};

export default function UnidadesCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<UnidadFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const conversionValue = parseFloat(String(form.conversion));

        if (isNaN(conversionValue) || conversionValue <= 0) {
            setError("El factor de conversión debe ser un número mayor a 0");
            return;
        }
    
        try {
            const payload = {
                unidad: form.unidad,
                simbolo: form.simbolo,
                conversion: conversionValue,
                tipo: form.tipo || "inventario",
            };

            const data = await apiFetch("unid-medida/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Unidad creada correctamente");
            setForm(initialState);
            navigate("/unidades");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al crear la unidad"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Crear unidad | Inventario Lembo"
                description="Formulario para crear un nueva unidad"
            />
            <PageBreadcrumb pageTitle="Crear unidad" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Nueva unidad
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la unidad.
                        </p>
                    </div>

                    <Link
                        to="/unidades"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a unidades
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="unidad" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre de unidad
                            </label>
                            <input
                                type="text"
                                id="unidad"
                                value={form.unidad}
                                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                placeholder="Nombre de la unidad"
                            />
                        </div>
                        <div>
                            <label htmlFor="simbolo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Símbolo
                            </label>
                            <input
                                type="text"
                                id="simbolo"
                                value={form.simbolo}
                                onChange={(e) => setForm({ ...form, simbolo: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                placeholder="Símbolo de la unidad"
                            />
                        </div>
                        <div>
                            <label htmlFor="conversion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Conversión
                            </label>
                            <input
                                type="number"
                                id="conversion"
                                value={form.conversion}
                                onChange={(e) => setForm({ ...form, conversion: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                placeholder="0"
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
                            {loading ? "Guardando..." : "Guardar unidad"}
                        </button>
                        <Link
                            to="/unidades"
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
