import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type TratamientoRow = {
	id_tratamiento: number;
    id_lote: number;
	fecha_inicio: string;
	fecha_fin: string;
	cantidad: number;
	medicina_id: number;
	unid_medida_id: number;
	user_id: number;
	nombre_lote: string;
	nombre_producto: string;
	cantidad_convertida: number;
    observacion: string | null;
    nombre_user: string;
};

type TratamientosResponse = {
	total_tratamientos: number;
	page: number;
	page_size: number;
	tratamientos: TratamientoRow[];
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

export default function Tratamientos() {
	const navigate = useNavigate();
	const [tratamientos, setTratamientos] = useState<TratamientoRow[]>([]);
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
		let isMounted = true;

		const loadTratamientos = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`tratamiento/paginated?page=${page}&page_size=${pageSize}`)) as TratamientosResponse;

				if (!isMounted) {
					return;
				}

				setTratamientos(Array.isArray(data?.tratamientos) ? data.tratamientos : []);
				setTotal(Number(data?.total_tratamientos ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar los tratamientos"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadTratamientos();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize]);

	const filteredTratamientos = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return tratamientos;
		}

		return tratamientos.filter((tratamiento) => {
			return [
				tratamiento.nombre_lote,
				tratamiento.nombre_producto,
                tratamiento.nombre_user,
				tratamiento.observacion,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, tratamientos]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Tratamientos" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/tratamientos/create"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
						>
							Nuevo tratamiento
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar tratamiento..."
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
									Fecha Inicio
								</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha Fin
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidad
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Tratamiento
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
							) : filteredTratamientos.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay tratamientos para mostrar.
									</td>
								</tr>
							) : (
								filteredTratamientos.map((tratamiento) => (
									<tr key={tratamiento.id_tratamiento} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Inicio: {formatDate(tratamiento.fecha_inicio)}</div>
										</td>

                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Fin: {formatDate(tratamiento.fecha_fin)}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{tratamiento.cantidad}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Lote: {tratamiento.nombre_lote}</div>
											<div>Producto: {tratamiento.nombre_producto}</div>
											<div>Responsable: {tratamiento.nombre_user}</div>
										</td>

										<td className="px-5 py-4">
											<Link
												to={`/tratamientos/edit/${tratamiento.id_tratamiento}`}
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
