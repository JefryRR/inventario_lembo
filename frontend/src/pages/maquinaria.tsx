import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

type estadoMaquina = "operativa" | "dañada" | "mantenimiento" | "de_baja";

type MaquinaRow = {
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
	fecha_de_baja: string;
};

type MaquinasResponse = {
	total_maquinas: number;
	page: number;
	page_size: number;
	maquinas: MaquinaRow[];
};

function formatDate(value: string): string {
	if (!value) return "-";

	// value viene como "YYYY-MM-DD" desde el backend (date de Pydantic)
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (!match) return value;

	const [, year, month, day] = match;
	return `${day}/${month}/${year}`;
}

const ESTADO_LABELS: Record<string, string> = {
	activo: "Activo",
	inactivo: "Inactivo",
	en_mantenimiento: "En mantenimiento",
	de_baja: "Dado de baja",
};

function formatEstado(value: string): string {
	return ESTADO_LABELS[value] || value;
}

export default function Maquinas() {
	const navigate = useNavigate();
	const [maquinas, setMaquinas] = useState<MaquinaRow[]>([]);
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

		const loadMaquinas = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = (await apiFetch(`maquinas/paginated-maquinas?page=${page}&page_size=${pageSize}`)) as MaquinasResponse;

				if (!isMounted) {
					return;
				}

				setMaquinas(Array.isArray(data?.maquinas) ? data.maquinas : []);
				setTotal(Number(data?.total_maquinas ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
					requestError?.message ||
					"No se pudieron cargar los Maquinas"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadMaquinas();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize]);

	const filteredMaquinas = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return maquinas;
		}

		return maquinas.filter((maquina) => {
			return [
				maquina.nombre_maq,
				maquina.tipo_maq,
				maquina.marca,
				maquina.modelo,
				maquina.num_serie,
				maquina.fecha_compra,
				formatEstado(maquina.estado),
				maquina.ubicacion,
				maquina.observaciones,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, maquinas]);

	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	const handleExportarMaquinas = async (formato: "pdf" | "excel") => {
		setDescargando(formato);
		try {
		const extension = formato === "pdf" ? "pdf" : "xlsx";
		await apiDownload(
			`maquinas/exportar/${formato}`,
			`reporte_maquinas.${extension}`,
		);
		} catch (err: any) {
		alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
		setDescargando(null);
		}
	};

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Máquinas" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<ConPermiso accion="insertar">
							<Link
								to="/maquinaria/crear"
								className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
							>
								Nueva máquina
							</Link>
						</ConPermiso>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar máquina..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>
						<button
							onClick={() => handleExportarMaquinas("excel")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
							>
							{descargando === "excel" ? "Descargando..." : "Exportar Excel"}
							</button>
							<button
							onClick={() => handleExportarMaquinas("pdf")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
							>
							{descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
						</button>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Nombre de la máquina
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									tipo
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Marca / Modelo
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Número de Serie
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fechas
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Estado
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Ubicación
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Observaciones
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
										<td colSpan={10} className="px-5 py-4">
											<div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
										</td>
									</tr>
								))
							) : error ? (
								<tr>
									<td colSpan={10} className="px-5 py-10 text-center text-sm text-error-500">
										{error}
									</td>
								</tr>
							) : filteredMaquinas.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay máquinas para mostrar.
									</td>
								</tr>
							) : (
								filteredMaquinas.map((maquina) => (
									<tr key={maquina.id_maquina} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.nombre_maq}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.tipo_maq}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.marca} / {maquina.modelo}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.num_serie}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div className="text-sm font-medium text-gray-600 dark:text-white/90">
												Compra:{formatDate(maquina.fecha_compra)}
											</div>
											<div className="text-sm font-medium text-gray-600 dark:text-white/90">
												Retiro:{maquina.fecha_de_baja ? formatDate(maquina.fecha_de_baja) : "-"}
											</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{formatEstado(maquina.estado)}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.ubicacion}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{maquina.observaciones ? maquina.observaciones : "-"}
										</td>
										<td className="px-5 py-4">
											<ConPermiso accion="actualizar">
												<Link
													to={`/maquinaria/edit/${maquina.id_maquina}`}
													className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700 mb-2"
												>
													Editar
												</Link>
											</ConPermiso>
											<Link
												to={`/maquinas/historial/${maquina.id_maquina}`}
												className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-600 px-3 text-sm font-medium text-white transition hover:bg-gray-700">
												Informe
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
