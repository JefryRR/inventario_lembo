import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type MortalidadFormState = {
	lote_id: number;
	fecha_reporte: string;
	cantidad: number;
	observacion: string | null;
	user_id: number;
};

type LoteOption = {
	id_lote: number;
	nombre_lote: string;
	nombre_especie?: string;
	nombre_categoria?: string;
};

type UserOption = {
	id_user: number;
	nombre_user: string;
};

const initialState: MortalidadFormState = {
	lote_id: 0,
	fecha_reporte: "",
	cantidad: 0,
	observacion: null,
	user_id: 0,
};

export default function MortalidadCreate() {
	const navigate = useNavigate();
	const [form, setForm] = useState<MortalidadFormState>(initialState);
	const [loading, setLoading] = useState(false);
	const [loadingLotes, setLoadingLotes] = useState(false);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [lotes, setLotes] = useState<LoteOption[]>([]);
	const [users, setUsers] = useState<UserOption[]>([]);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadCatalogs = async () => {
			setLoadingLotes(true);
			setLoadingUsers(true);

			try {
				const [lotesData, usersData] = await Promise.all([
					apiFetch("lotes/all-lotes_prod"),
					apiFetch("users/all-users-except-admins"),
				]);

				if (!mounted) return;

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

				setLotes(loteList);
				setUsers(userList);
			} catch (requestError: any) {
				if (!mounted) return;
				setError(requestError?.detail || requestError?.message || "No se pudieron cargar los catálogos");
			} finally {
				if (mounted) {
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

		if (!form.user_id || form.user_id === 0) {
			setError("Selecciona un usuario responsable");
			setLoading(false);
			return;
		}

		if (form.cantidad <= 0) {
			setError("La cantidad debe ser mayor a cero");
			setLoading(false);
			return;
		}

		try {
			const payload = {
				lote_id: Number(form.lote_id),
				fecha_reporte: form.fecha_reporte,
				cantidad: Number(form.cantidad),
				observacion: form.observacion ? form.observacion.trim() : null,
				user_id: Number(form.user_id),
			};

			const data = await apiFetch("mortalidad/create", {
				method: "POST",
				body: payload,
			});

			setSuccess(data?.message || "Registro de mortalidad creado correctamente");
			setForm(initialState);
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
								className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
								required
								disabled={loadingLotes || lotes.length === 0}
							>
								<option value={0} disabled>
									{loadingLotes ? "Cargando lotes..." : "Selecciona un lote"}
								</option>
								{lotes.map((lote) => (
									<option key={lote.id_lote} value={lote.id_lote}>
										{lote.nombre_lote} {lote.nombre_especie ? `- ${lote.nombre_especie}` : ""}
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
								className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
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
								className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
								required
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observación</label>
							<textarea
								value={form.observacion || ""}
								onChange={handleChange("observacion")}
								className="h-28 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
								maxLength={255}
							/>
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
