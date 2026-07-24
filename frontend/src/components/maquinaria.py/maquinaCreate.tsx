import { useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Definición de tipos para el estado de la máquina
type estadoMaquina = "operativa" | "dañada" | "mantenimiento" | "de_baja";

type MaquinaFormState = {
    id_maquina: number;
    nombre_maq: string
    tipo_maq: string
    marca: string
    modelo: string
    num_serie: string
    fecha_compra: string
    estado: estadoMaquina
    ubicacion: string
    observaciones: string
};

// Estado inicial del formulario para crear una máquina
const initialState: MaquinaFormState = {
    id_maquina: 0,
    nombre_maq: "",
    tipo_maq: "",
    marca: "",
    modelo: "",
    num_serie: "",
    fecha_compra: "",
    estado: "operativa",
    ubicacion: "",
    observaciones: ""
};

// Componente principal para crear una máquina
export default function MaquinaCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<MaquinaFormState>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const estados: Array<{ value: estadoMaquina; label: string }> = [
        { value: "operativa", label: "Operativa" },
        { value: "dañada", label: "Dañada" },
        { value: "mantenimiento", label: "En mantenimiento" },
        { value: "de_baja", label: "Dado de baja" },
    ];

    const handleChange =
        (field: keyof MaquinaFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
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
                nombre_maq: form.nombre_maq.trim(),
                tipo_maq: form.tipo_maq.trim(),
                marca: form.marca.trim(),
                modelo: form.modelo.trim(),
                num_serie: form.num_serie.trim(),
                fecha_compra: form.fecha_compra.trim(),
                estado: form.estado.trim(),
                ubicacion: form.ubicacion.trim(),
                observaciones: form.observaciones.trim()
            };

            const data = await apiFetch("maquinas/crear", {
                method: "POST",
                body: payload,
            });

            setSuccess(data?.message || "Máquina registrada correctamente");
            setForm(initialState);
            navigate("/maquinaria");
        } catch (requestError: any) {
            setError(
                requestError?.detail || requestError?.message || "Ocurrió un error al registrar la máquina"
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
                            Registrar máquina
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los datos obligatorios para registrar la máquina.
                        </p>
                    </div>

                    <Link
                        to="/maquinaria"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Volver a Máquinas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre máquina <span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.nombre_maq}
                                onChange={handleChange("nombre_maq")}
                                placeholder="Pernil de pollo"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tipo <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.tipo_maq}
                                onChange={handleChange("tipo_maq")}
                                placeholder="Tipo de máquina"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Marca <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.marca}
                                onChange={handleChange("marca")}
                                placeholder="Marca de la máquina"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Modelo <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.modelo}
                                onChange={handleChange("modelo")}
                                placeholder="Modelo de la máquina"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                N. serie <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.num_serie}
                                onChange={handleChange("num_serie")}
                                placeholder="Número de serie de la máquina"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fecha compra <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.fecha_compra}
                                onChange={handleChange("fecha_compra")}
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Estado<span className="text-error-500">*</span>
                            </label>
                            <select
                                value={form.estado}
                                onChange={handleChange("estado")}
                                className="h-11 w-full rounded-lg focus:ring-gray-500 focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90 dark:bg-black/20"
                                required
                            >
                                {estados.map((estado) => (
                                    <option className="dark:text-black" key={estado.value} value={estado.value}>
                                        {estado.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ubicación<span className="text-error-500">*</span>
                            </label>
                            <input
                                value={form.ubicacion}
                                onChange={handleChange("ubicacion")}
                                placeholder="Bodega principal"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Observaciones
                            </label>
                            <input
                                value={form.observaciones}
                                onChange={handleChange("observaciones")}
                                placeholder="Ingrese observaciones"
                                className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
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
                            {loading ? "Guardando..." : "Registrar máquina"}
                        </button>
                        <Link
                            to="/maquinaria"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form >
            </div >
        </>
    );
}
