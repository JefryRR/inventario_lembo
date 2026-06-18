import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type LoteRow = {
	id_lote: number;
	lote_granj_id: number;
	nombre_lote: string;
	fecha_siembra: string;
	fecha_cosecha: string;
	cantidad: number;
	especie_id: number;
	categoria_id: number;
	estado_lote: string;
	user_id: number;
	nombre_especie: string;
	nombre_categoria: string;
	nombre_user: string;
};

type LotesResponse = {
	total_lotes: number;
	page: number;
	page_size: number;
	lotes: LoteRow[];
};

const ESTADO_LABELS: Record<string, string> = {
	activo: "Activo",
	finalizado: "Finalizado",
	cuarentena: "Cuarentena",
	cosechar: "Cosechar",
	listo_para_carne: "Listo para carne",
};

function formatEstado(value: string): string {
	return ESTADO_LABELS[value] || value;
}

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

export default function Lotes() {
	const navigate = useNavigate();
	const [lotes, setLotes] = useState<LoteRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	useEffect(() => {
		let isMounted = true;

		const loadLotes = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`lotes_prod/paginated?page=${page}&page_size=${pageSize}`)) as LotesResponse;

				if (!isMounted) {
					return;
				}

				setLotes(Array.isArray(data?.lotes) ? data.lotes : []);
				setTotal(Number(data?.total_lotes ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
					requestError?.message ||
					"No se pudieron cargar los lotes"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadLotes();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize]);

	const filteredLotes = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return lotes;
		}

		return lotes.filter((lote) => {
			return [
				lote.nombre_lote,
				lote.nombre_especie,
				lote.nombre_categoria,
				lote.nombre_user,
				lote.estado_lote,
				formatEstado(lote.estado_lote),
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, lotes]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Lote de producción" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/lotesProd/create"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
						>
							Nueva producción
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar producción..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-green-800 sm:w-72"
						/>
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
									Fechas
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cant. actual
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Catálogos
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Estado
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
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-error-500">
										{error}
									</td>
								</tr>
							) : filteredLotes.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay registros de producción para mostrar.
									</td>
								</tr>
							) : (
								filteredLotes.map((lote) => (
									<tr key={lote.id_lote} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{lote.nombre_lote}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">ID: {lote.id_lote}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Siembra: {formatDate(lote.fecha_siembra)}</div>
											<div>Cosecha: {formatDate(lote.fecha_cosecha)}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{lote.cantidad}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Especie: {lote.nombre_especie}</div>
											<div>Categoría: {lote.nombre_categoria}</div>
											<div>Responsable: {lote.nombre_user}</div>
										</td>

										<td className="px-5 py-4">
											<span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
												{formatEstado(lote.estado_lote)}
											</span>
										</td>

										<td className="px-5 py-4">
											<div className="flex flex-col items-center gap-2">
												<Link
													to={`/lotesProd/edit/${lote.id_lote}`}
													className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
													Editar
												</Link>
												<Link
													to={`/lotesProd/report/${lote.id_lote}`}
													className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-600 px-4 text-sm font-medium text-white transition hover:bg-gray-700">
													Informe
												</Link>
											</div>
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
						<span className="text-sm text-gray-500 dark:text-gray-400">
							Página {page} de {totalPages}
						</span>
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
