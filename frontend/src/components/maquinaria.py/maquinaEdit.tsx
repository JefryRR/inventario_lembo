import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

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
    fecha_de_baja: string
};


const emptyState: MaquinaFormState = {
    id_maquina: 0,
    nombre_maq: "",
    tipo_maq: "",
    marca: "",
    modelo: "",
    num_serie: "",
    fecha_compra: "",
    estado: "operativa",
    ubicacion: "",
    observaciones: "",
    fecha_de_baja:""
};

function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";

  // Si viene solo como "YYYY-MM-DD" (sin hora), parsear manualmente
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (isDateOnly) {
    return `${value}T00:00`;
  }

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

export default function MaquinaEdit() {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id_maquina;

    const [form, setForm] = useState<MaquinaFormState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const estados: Array<{ value: estadoMaquina; label: string }> = [
        { value: "operativa", label: "Operativa" },
        { value: "dañada", label: "Dañada" },
        { value: "mantenimiento", label: "En mantenimiento" },
        { value: "de_baja", label: "Dado de baja" },
    ];

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const MaquinaData = await apiFetch(`maquinas/by-id?id=${id}`);
                if (!mounted) return;

                setForm({
                    id_maquina: MaquinaData?.id_maquina || 0,
                    nombre_maq: MaquinaData?.nombre_maq || "",
                    tipo_maq: MaquinaData?.tipo_maq || "",
                    marca: MaquinaData?.marca || "",
                    modelo: MaquinaData?.modelo || "",
                    num_serie: MaquinaData?.num_serie || "",
                    fecha_compra: MaquinaData?.fecha_compra || "",
                    estado: MaquinaData?.estado || "operativa",
                    ubicacion: MaquinaData?.ubicacion || "",
                    observaciones: MaquinaData?.observaciones || "",
                    fecha_de_baja: toDatetimeLocal(MaquinaData?.fecha_de_baja)
                });

            } catch (err: any) {
                setError(err?.detail || err?.message || "No se pudo cargar el registro de la máquina");
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
        (field: keyof MaquinaFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field]: value }));
            };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                nombre_maq: form.nombre_maq,
                tipo_maq: form.tipo_maq,
                marca: form.marca,
                modelo: form.modelo,
                num_serie: form.num_serie,
                fecha_compra: form.fecha_compra,
                estado: form.estado,
                ubicacion: form.ubicacion,
                observaciones: form.observaciones
            };

            await apiFetch(`maquinas/update/${id}`, { method: "PUT", body: payload });
            setSuccess("Máquina actualizada correctamente");
            setTimeout(() => navigate("/maquinaria"), 800);
        } catch (err: any) {
            setError(err?.detail || err?.message || "No se pudo actualizar la máquina");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar máquina</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los datos de la máquina.</p>
                    </div>

                    <Link to="/maquinaria" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Volver a máquinas</Link>
                </div>

                <form onSubmit={handleSubmit} className="p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">Cargando máquina...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-error-500">{error}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la máquina <span className="text-error-500">*</span></label>
                                    <input
                                        value={form.nombre_maq}
                                        type="text"
                                        onChange={handleChange("nombre_maq")}
                                        placeholder="Máquina 1"
                                        className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de máquina <span className="text-error-500">*</span></label>
                                    <input type="text"
                                        value={form.tipo_maq}
                                        onChange={handleChange("tipo_maq")}
                                        className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Marca<span className="text-error-500">*</span></label>
                                    <input type="text" value={form.marca} onChange={handleChange("marca")} className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>

                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Modelo<span className="text-error-500">*</span></label>
                                    <input type="text" value={form.modelo} onChange={handleChange("modelo")} className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">N. serie<span className="text-error-500">*</span></label>
                                    <input type="text" value={form.num_serie} onChange={handleChange("num_serie")} className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha compra <span className="text-error-500">*</span></label>
                                    <input type="date" value={form.fecha_compra} onChange={handleChange("fecha_compra")} placeholder="06/06/2026" className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado <span className="text-error-500">*</span></label>
                                    <select value={form.estado} onChange={handleChange("estado")} className="h-11 w-full rounded-lg border focus:ring-gray-500 focus:border-gray-300 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90" required>
                                        {estados.map((estado) => (
                                            <option className="dark:text-black" key={estado.value} value={estado.value}>
                                                {estado.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Ubicación <span className="text-error-500">*</span></label>
                                    <input type="text" value={form.ubicacion} onChange={handleChange("ubicacion")} placeholder="Ubicación de la máquina" className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones </label>
                                    <input type="text" value={form.observaciones} onChange={handleChange("observaciones")} placeholder="Observaciones sobre la máquina" className="h-11 w-full rounded-lg border focus:ring-gray-500 border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"/>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
                            )}

                            {success && (
                                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{success}</div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Actualizar producto"}
                                </button>
                                <Link to="/maquinaria"
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
                                    Cancelar
                                </Link>
                            </div>
                        </>
                    )}
            </form>
        </div >
        </>
    );
}
