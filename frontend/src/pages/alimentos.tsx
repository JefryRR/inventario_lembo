import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type AlimentoRow = {
	id_alimento: number;
    lote_id: number;
    insumo_id: number;
    fecha_alimento: string;
    cantidad: number;
    unid_medida_id: number;
    nombre_producto: string;
    simbolo: string;
    nombre_lote: string;
};

type AlimentosResponse = {
	total_alimentos: number;
	page: number;
	page_size: number;
	alimentos: AlimentoRow[];
};


function formatDate(value: string): string {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString("es-CO", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

export default function Alimentos() {
	const navigate = useNavigate();
	const [alimentos, setAlimentos] = useState<AlimentoRow[]>([]);
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

		const loadAlimentos = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`alimento_prod/paginated?page=${page}&page_size=${pageSize}`)) as AlimentosResponse;

				if (!isMounted) {
					return;
				}

				setAlimentos(Array.isArray(data?.alimentos) ? data.alimentos : []);
				setTotal(Number(data?.total_alimentos ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar los alimentos"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadAlimentos();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize]);

	const filteredAlimentos = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return alimentos;
		}

		return alimentos.filter((alimento) => {
			return [
				alimento.nombre_lote,
				alimento.nombre_producto,
                alimento.simbolo,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, alimentos]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Alimentos" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/alimentos/create"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
						>
							Nuevo alimento
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar alimento..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 sm:w-72"
						/>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha de alimento
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidad
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Nombre del alimento
								</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Lote
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
							) : filteredAlimentos.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay alimentos para mostrar.
									</td>
								</tr>
							) : (
								filteredAlimentos.map((alimento) => (
									<tr key={alimento.id_alimento} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{formatDate(alimento.fecha_alimento)}
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{alimento.cantidad} {alimento.simbolo || "-"}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{alimento.nombre_producto}
										</td>
                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{alimento.nombre_lote}
										</td>
										<td className="px-5 py-4">
											<Link
												to={`/alimentos/edit/${alimento.id_alimento}`}
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
