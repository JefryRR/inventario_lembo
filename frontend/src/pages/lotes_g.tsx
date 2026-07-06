import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type LoteRow = {
	id_lote_g: number;
	nombre_lote: string;
	ubicacion: string;
	latitud: string;
	longitud: string;
};

type LotesResponse = {
	total_lotes: number;
	page: number;
	page_size: number;
	lotes_granja: LoteRow[];
};


export default function Lotes_granja() {
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
				const data = (await apiFetch(`lotes/paginated?page=${page}&page_size=${pageSize}`)) as LotesResponse;

				if (!isMounted) {
					return;
				}

				setLotes(Array.isArray(data?.lotes_granja) ? data.lotes_granja : []);
				setTotal(Number(data?.total_lotes ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar los lotes de la granja"
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
				lote.ubicacion,
				lote.latitud,
				lote.longitud,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, lotes]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Lotes" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/lotesGranja/create"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
						>
							Nuevo lote
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar lote..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
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
								<th className="px-5 py-3 w-[200px] text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Ubicación
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Latitud
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Longitud
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Acciones
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{loading ? (
								Array.from({ length: 4 }).map((_, index) => (
									<tr key={index}>
										<td colSpan={5} className="px-5 py-4">
											<div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
										</td>
									</tr>
								))
							) : error ? (
								<tr>
									<td colSpan={5} className="px-5 py-10 text-center text-sm text-error-500">
										{error}
									</td>
								</tr>
							) : filteredLotes.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay lotes para mostrar.
									</td>
								</tr>
							) : (
								filteredLotes.map((lote_g) => (
									<tr key={lote_g.id_lote_g} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{lote_g.nombre_lote}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">ID: {lote_g.id_lote_g}</div>
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{lote_g.ubicacion}</td>
										<td className="pl-5 py-4 text-sm text-gray-600 dark:text-gray-300">{lote_g.latitud}</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{lote_g.longitud}</td>

										<td className="px-5 py-4">
											<Link
												to={`/lotesGranja/edit/${lote_g.id_lote_g}`}
												className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
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
