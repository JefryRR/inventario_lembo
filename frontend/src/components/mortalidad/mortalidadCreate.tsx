import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type MortalidadFormState = {
	lote_id: number;
	fecha_reporte: string;
	cantidad: string;
	observacion: string | null;
};

type LoteOption = {
	id_lote: number;
	nombre_lote: string;
	sublote: string;
	nombre_especie?: string;
	nombre_categoria?: string;
};

const ALLOWED_FOTO_TYPES = ["image/jpeg", "image/png"];

const initialState: MortalidadFormState = {
	lote_id: 0,
	fecha_reporte: "",
	cantidad: "",
	observacion: null,
};

export default function MortalidadCreate() {
	const navigate = useNavigate();
	const [form, setForm] = useState<MortalidadFormState>(initialState);
	const [foto, setFoto] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingLotes, setLoadingLotes] = useState(false);
	const [lotes, setLotes] = useState<LoteOption[]>([]);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadLotes = async () => {
			setLoadingLotes(true);

			const extractLotes = (data: any): LoteOption[] =>
				Array.isArray(data?.lotes) ? data.lotes :
					Array.isArray(data) ? data : [];

			const resultados: LoteOption[] = [];

			try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=activo"))); } catch { }
			try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=cuarentena"))); } catch { }
			try { resultados.push(...extractLotes(await apiFetch("lotes_prod/all-lotes_prod?estado=listo_cosecha"))); } catch { }

			if (!mounted) return;

			setLotes(resultados);
			setLoadingLotes(false);
		};

		loadLotes();

		return () => {
			mounted = false;
		};
	}, []);

	const handleChange =
		(field: keyof MortalidadFormState) =>
			(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
				const value = event.target.value;

				if (field === "lote_id") {
					setForm((current) => ({ ...current, lote_id: Number(value) }));
					return;
				}

				if (field === "observacion") {
					setForm((current) => ({ ...current, observacion: value || null }));
					return;
				}

				// cantidad y fecha_reporte se guardan tal cual, como string
				setForm((current) => ({ ...current, [field]: value }));
			};

	const handleFotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;

		if (file && !ALLOWED_FOTO_TYPES.includes(file.type)) {
			setError("Tipo de archivo no permitido. Solo se aceptan imágenes JPEG o PNG");
			event.target.value = "";
			setFoto(null);
			return;
		}

		setError(null);
		setFoto(file);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		if (!form.lote_id || form.lote_id === 0) {
			setError("Selecciona un lote");
			setLoading(false);
			return;
		}

		const cantidadNum = Number(form.cantidad);
		if (!form.cantidad || Number.isNaN(cantidadNum) || cantidadNum <= 0) {
			setError("La cantidad debe ser mayor a cero");
			setLoading(false);
			return;
		}

		if (!form.fecha_reporte) {
			setError("Selecciona la fecha de reporte");
			setLoading(false);
			return;
		}

		try {
			// El backend espera multipart/form-data (Form(...) + File(None)),
			// por eso construimos un FormData en lugar de mandar JSON.
			const formData = new FormData();
			formData.append("lote_id", String(form.lote_id));
			formData.append("fecha_reporte", form.fecha_reporte);
			formData.append("cantidad", String(cantidadNum));
			if (form.observacion) {
				formData.append("observacion", form.observacion.trim());
			}
			if (foto) {
				formData.append("foto", foto);
			}

			const data = await apiFetch("mortalidad/create", {
				method: "POST",
				body: formData,
			});

			setSuccess(data?.message || "Registro de mortalidad creado correctamente");
			setForm(initialState);
			setFoto(null);
			navigate("/mortalidad");
		} catch (requestError: any) {
			setError(requestError?.detail || requestError?.message || "Ocurrió un error al crear el registro de mortalidad");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva mortalidad</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">Registra la mortalidad ocurrida en un lote.</p>
					</div>

					<Link
						to="/mortalidad"
						className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
					>
						Volver a mortalidad
					</Link>
				</div>

				<form onSubmit={handleSubmit} className="p-5 lg:p-6">
					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Lote <span className="text-error-500">*</span>
							</label>
							<select
								value={form.lote_id}
								onChange={handleChange("lote_id")}
								className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
								required
								disabled={loadingLotes || lotes.length === 0}
							>
								<option className="dark:text-black" value={0} disabled>
									{loadingLotes ? "Cargando lotes..." : "Selecciona un lote"}
								</option>
								{lotes.map((lote) => (
									<option className="dark:text-black" key={lote.id_lote} value={lote.id_lote}>
										{lote.nombre_lote} {lote.sublote ? `- ${lote.sublote}` : ""} {lote.nombre_especie ? `- ${lote.nombre_especie}` : ""}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Fecha de reporte <span className="text-error-500">*</span>
							</label>
							<input
								type="datetime-local"
								value={form.fecha_reporte}
								onChange={handleChange("fecha_reporte")}
								className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
								required
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Cantidad <span className="text-error-500">*</span>
							</label>
							<input
								type="number"
								value={form.cantidad}
								onChange={handleChange("cantidad")}
								min={1}
								className="h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
								required
							/>
						</div>

						<div>
							<label htmlFor="observacion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
								Observación
							</label>
							<input
								type="text"
								id="observacion"
								value={form.observacion || ""}
								onChange={handleChange("observacion")}
								className="mt-1 h-11 block w-full rounded-lg focus:border-gray-300 border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
								placeholder="Observación"
							/>
						</div>

						<div className="md:col-span-2">
							<label htmlFor="foto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
								Foto (opcional)
							</label>
							<input
								type="file"
								id="foto"
								accept="image/jpeg,image/png"
								onChange={handleFotoChange}
								className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-white/[0.06] dark:file:text-gray-300"
							/>
							{foto && (
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{foto.name}</p>
							)}
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
							{loading ? "Guardando..." : "Registrar mortalidad"}
						</button>
						<Link
							to="/mortalidad"
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
