import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type IngredienteRow = {
	id_ingrediente: number;
    plato_id: number;
    cant_inv: number;
    unid_med_id: number;
    inventario_id: number;
    origen_inv: number;
	fecha_registro: string;
    nombre_plato: string;
    nombre_producto: string;
    simbolo: string;
};

type IngredienteResponse = {
	total_ingredientes: number;
	page: number;
	page_size: number;
	ingredientes: IngredienteRow[];
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

export default function Ingrediente() {
	const navigate = useNavigate();
	const [ingredientes, setIngredientes] = useState<IngredienteRow[]>([]);
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

		const loadIngredientes = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`ingredientes/ingredientes_pag?page=${page}&page_size=${pageSize}`)) as IngredienteResponse;

				if (!isMounted) {
					return;
				}

				setIngredientes(Array.isArray(data?.ingredientes) ? data.ingredientes : []);
				setTotal(Number(data?.total_ingredientes ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar los ingredientes"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadIngredientes();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize]);

	const filteredIngredientes = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return ingredientes;
		}

		return ingredientes.filter((ingrediente) => {
			return [
				ingrediente.nombre_plato,
				ingrediente.nombre_producto,
                ingrediente.simbolo,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, ingredientes]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Ingredientes" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/ingredientes/crear"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
						>
							Nuevo ingrediente
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar ingrediente..."
							className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Plato
								</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Origen
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Producto
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidad
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha de registro
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
							) : filteredIngredientes.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay ingredientes para mostrar.
									</td>
								</tr>
							) : (
								filteredIngredientes.map((ingrediente) => (
									<tr key={ingrediente.id_ingrediente} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{ingrediente.nombre_plato}</td>

                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{ingrediente.origen_inv === 1 ? "Producción" : "Insumo"}</td>

                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{ingrediente.nombre_producto}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{ingrediente.cant_inv} {ingrediente.simbolo || "-"}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(ingrediente.fecha_registro)}</td>
										<td className="px-5 py-4">
											<Link
												to={`/ingredientes/edit/${ingrediente.id_ingrediente}`}
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
