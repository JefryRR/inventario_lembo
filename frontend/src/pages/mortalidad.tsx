import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type MortalidadRow = {
	id_mortalidad: number;
	lote_id: number;
	fecha_reporte: string;
	cantidad: number;
	observacion?: string;
	user_id: number;
	nombre_especie?: string;
	nombre_categoria?: string;
	nombre_lote: string;
	nombre_user?: string;
};

type MortalidadResponse = {
	total_mortalidad: number;
	page: number;
	page_size: number;
	mortalidad: MortalidadRow[];
};

const PAGE_SIZES = [5, 10, 20, 50];

function formatDate(value: string): string {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString("es-CO", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function Mortalidad() {
	const navigate = useNavigate();
	const [rows, setRows] = useState<MortalidadRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`mortalidad/paginated?page=${page}&page_size=${pageSize}`)) as MortalidadResponse;
				if (!mounted) return;

				setRows(Array.isArray(data?.mortalidad) ? data.mortalidad : []);
				setTotal(Number(data?.total_mortalidad ?? 0));
			} catch (requestError: any) {
				if (!mounted) return;
				setError(requestError?.detail || requestError?.message || "No se pudieron cargar los registros de mortalidad");
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, [page, pageSize]);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return rows;

		return rows.filter((r) => {
			return [
				r.nombre_lote,
				r.nombre_especie,
				r.nombre_categoria,
				r.nombre_user,
				r.observacion,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, rows]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Mortalidad" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/mortalidad/create"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
						>
							Nuevo registro
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-72"
						/>
						<select
							value={pageSize}
							onChange={(e) => {
								setPage(1);
								setPageSize(Number(e.target.value));
							}}
							className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
						>
							{PAGE_SIZES.map((size) => (
								<option key={size} value={size}>
									{size} por página
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Lote
                                </th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Categoría / Especie
								</th>
								
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Fecha de reporte
                                </th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Cantidad
                                </th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Observación
                                </th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Usuario
                                </th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Acciones
                                </th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{loading ? (
								Array.from({ length: 5 }).map((_, index) => (
									<tr key={index}>
										<td colSpan={6} className="px-5 py-4">
											<div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
										</td>
									</tr>
								))
							) : error ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-error-500">{error}</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay registros de mortalidad.</td>
								</tr>
							) : (
								filtered.map((mortalidad) => (
									<tr key={mortalidad.id_mortalidad} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{mortalidad.nombre_lote}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">ID: {mortalidad.id_mortalidad}</div>
										</td>

										<td className="px-5 py-4">
											<div className="text-sm text-gray-800 dark:text-gray-300">{mortalidad.nombre_categoria || "-"} / {mortalidad.nombre_especie || "-"}</div>
										</td>
										
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(mortalidad.fecha_reporte)}</td>
										
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{mortalidad.cantidad}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{mortalidad.observacion || "-"}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{mortalidad.nombre_user}</td>

										<td className="px-5 py-4">
											<Link
												to={`/mortalidad/edit/${mortalidad.id_mortalidad}`}
												className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
											>
												Editar
											</Link>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-center">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
							disabled={page <= 1 || loading}
							className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							Anterior
						</button>
						<span className="text-sm text-gray-500 dark:text-gray-400">Página {page} de {totalPages}</span>
						<button
							type="button"
							onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
							disabled={page >= totalPages || loading}
							className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							Siguiente
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
