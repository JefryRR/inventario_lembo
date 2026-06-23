import { useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type PlatoFormState = {
    nombre_plato: string;
    estado: boolean;
    fecha_registro: string;
};

const initialState: PlatoFormState = {
    nombre_plato: "",
    estado: true,
    fecha_registro: new Date().toISOString(),
};

export default function PlatosCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<PlatoFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    
    const handleChange =
        (field: keyof PlatoFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = field === "estado" ? (event.target as HTMLInputElement).checked : event.target.value;

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
                nombre_plato: form.nombre_plato,
                estado: form.estado,
                fecha_registro: form.fecha_registro,
            };

            const data = await apiFetch("platos/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Plato creado correctamente");
            setForm(initialState);
            navigate("/platos");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al crear el plato"
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
                            Nuevo plato
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar el plato.
                        </p>
                    </div>

                    <Link
                        to="/platos"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a platos
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre del plato <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_plato}
                                onChange={handleChange("nombre_plato")}
                                placeholder="Sopa de verduras"
                                className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-3 md:col-span-2">
                            <input
                                id="estado"
                                type="checkbox"
                                checked={form.estado}
                                onChange={handleChange("estado")}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                            />
                            <label htmlFor="estado" className="text-sm text-gray-700 dark:text-gray-300">
                                Plato activo
                            </label>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fecha de registro <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.fecha_registro}
                                onChange={handleChange("fecha_registro")}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                                required
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
                            {loading ? "Guardando..." : "Guardar plato"}
                        </button>
                        <Link
                            to="/platos"
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
