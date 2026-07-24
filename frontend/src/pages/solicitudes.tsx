import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

// Tipos de datos para las solicitudes
type SolicitudRow = {
	id_solicitud: number;
    solicitante: string;
	ficha: string;
	fecha_solicitud: string;
	fecha_entrega: string;
	fecha_devolucion: string;
	cant_devolver: number;
	cantidad_in: number;
	unid_med_id: number;
	tipo_insumo_id: number;
	estado_solicitud: string;
    nombre_tipo: string;
    simbolo: string;
    nombre_producto: string;
    user_id: number;
    nombre_user: string;
};

type SolicitudResponse = {
	total_solicitudes: number;
	page: number;
	page_size: number;
	solicitudes: SolicitudRow[];
};

// Mapeo de estados a etiquetas legibles
const ESTADO_LABELS: Record<string, string> = {
	pendiente: "Pendiente",
	entregado: "Entregado",
	autorizado: "Autorizado",
	cancelado: "Cancelado",
	devuelto: "Devuelto"
};

// Función para formatear el estado de la solicitud
function formatEstado(value: string): string {
	return ESTADO_LABELS[value] || value;
}

// Función para formatear fechas en formato DD/MM/YYYY
function formatDate(value: string): string {
	if (!value) return "-";

	const [year, month, day] = value.split("-");

	if (!year || !month || !day) return value;

	return `${day}/${month}/${year}`;
}

export default function Solicitudes() {
	const navigate = useNavigate();
	const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	 // Debounce: espera 400ms después de que el usuario deja de escribir
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [search]);

    // Cuando cambia el término de búsqueda (ya debounced), volvemos a la página 1
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

	useEffect(() => {
		let isMounted = true;

		const loadSolicitudes = async () => {
			setLoading(true);
			setError(null);

			try {
				// Construimos los parámetros de la URL para la paginación y búsqueda
				const params = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });
                
                // Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    params.set("search", debouncedSearch.trim());
                }


				// Llamada a la API para obtener las solicitudes paginadas
				const data = (await apiFetch(`solicitud/paginated_solicitudes?${params.toString()}`)) as SolicitudResponse;

				if (!isMounted) {
					return;
				}

				// Aseguramos que data.solicitudes sea un array antes de asignarlo al estado
				setSolicitudes(Array.isArray(data?.solicitudes) ? data.solicitudes : []);
				setTotal(Number(data?.total_solicitudes ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar las solicitudes"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadSolicitudes();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize, debouncedSearch]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	// Función para exportar solicitudes en formato PDF o Excel
	const handleExportarSolicitudes = async (formato: "pdf" | "excel") => {
		setDescargando(formato);
		try {
		const extension = formato === "pdf" ? "pdf" : "xlsx";
		await apiDownload(
			`solicitud/exportar/${formato}`,
			`reporte_solicitudes.${extension}`,
		);
		} catch (err: any) {
		alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
		setDescargando(null);
		}
	};

	return (
		<>
			<PageBreadcrumb pageTitle="Solicitudes de insumos" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<ConPermiso accion="insertar">
							<Link
								to="/solicitud/crear"
								className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
							>
								Nueva solicitud
							</Link>
						</ConPermiso>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar solicitudes..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>

						<button
							onClick={() => handleExportarSolicitudes("excel")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
							>
							{descargando === "excel" ? "Descargando..." : "Exportar Excel"}
							</button>
							<button
							onClick={() => handleExportarSolicitudes("pdf")}
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
									Solicitante
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Ficha
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fechas
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidades
								</th>

								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Detalles
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Estado
								</th>
								<ConPermiso accion="actualizar">
									<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
										Acciones
									</th>
								</ConPermiso>
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
							) : solicitudes.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay registros de solicitudes para mostrar.
									</td>
								</tr>
							) : (
								solicitudes.map((solicitud) => (
									<tr key={solicitud.id_solicitud} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{solicitud.solicitante}</div>
										</td>
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{solicitud.ficha}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Solicitud: {formatDate(solicitud.fecha_solicitud)}</div>
											<div>Entrega: {formatDate(solicitud.fecha_entrega)}</div>
											<div>Devolución: {formatDate(solicitud.fecha_devolucion)}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Cant. solicitada: {solicitud.cantidad_in} {solicitud.simbolo}</div>
											<div>Cant. devuelta: {solicitud.cant_devolver} {solicitud.simbolo}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Producto: {solicitud.nombre_producto}</div>
											<div>Categoria: {solicitud.nombre_tipo}</div>
											<div>Responsable: {solicitud.nombre_user}</div>
										</td>

										<td className="px-5 py-4">
											<span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
												{formatEstado(solicitud.estado_solicitud)}
											</span>
										</td>

										<td className="px-5 py-4">
											<ConPermiso accion="actualizar">
												{solicitud.estado_solicitud?.toLowerCase() === "cancelado" || solicitud.estado_solicitud?.toLowerCase() === "devuelto" ? (
												<span className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500">
													Editar
												</span>
												) : (
													<div className="flex flex-col items-center gap-2">
														<Link
															to={`/solicitud/edit/${solicitud.id_solicitud}`}
															className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
															Editar
														</Link>
													</div>
												)}
											</ConPermiso>
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
