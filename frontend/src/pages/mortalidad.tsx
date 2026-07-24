import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

// Ajusta esto según cómo esté configurada tu apiFetch/baseURL real,
// se usa solo para armar la URL completa de las fotos servidas como StaticFiles.
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:8000";

type MortalidadRow = {
	id_mortalidad: number;
	lote_id: number;
	fecha_reporte: string;
	cantidad: number;
	observacion?: string;
	foto_url?: string | null;
	user_id: number;
	nombre_especie?: string;
	nombre_categoria?: string;
	nombre_lote: string;
	sublote: string;
	nombre_user?: string;
};

type MortalidadResponse = {
	total_mortalidad: number;
	page: number;
	page_size: number;
	mortalidad: MortalidadRow[];
};

type DateRangeState = {
	fecha_inicio: string;
	fecha_fin: string;
};

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

function resolveFotoUrl(fotoUrl?: string | null): string | null {
	if (!fotoUrl) return null;
	if (fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")) return fotoUrl;
	return `${API_BASE_URL}${fotoUrl}`;
}

export default function Mortalidad() {
	const navigate = useNavigate();
	const [rows, setRows] = useState<MortalidadRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dateRange, setDateRange] = useState<DateRangeState>({ fecha_inicio: "", fecha_fin: "" });
	const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [previewFoto, setPreviewFoto] = useState<string | null>(null);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	// Estado que requiere react-day-picker (usa objetos Date de JS)
	const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
		from: dateRange.fecha_inicio ? new Date(dateRange.fecha_inicio) : undefined,
		to: dateRange.fecha_fin ? new Date(dateRange.fecha_fin) : undefined,
	});

	// 3. Manejador del cambio de fecha en el calendario dual
	const handleSelectRange = (range: DateRange | undefined) => {
		setSelectedRange(range);

		// Convertimos los objetos Date a strings (YYYY-MM-DD) para el Backend
		const inicioStr = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
		const finStr = range?.to ? format(range.to, 'yyyy-MM-dd') : '';

		const newRange = { fecha_inicio: inicioStr, fecha_fin: finStr };
		setDateRange(newRange);

		// Si el usuario ya seleccionó ambas fechas, aplicamos el filtro y cerramos
		if (range?.from && range?.to) {
			setIsOpen(false);
			setError(null);
			setPage(1);
			setActiveDateRange(newRange);
		}
	};

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	// Debounce del buscador: espera 400ms sin escribir antes de disparar la búsqueda al backend
	useEffect(() => {
		const timeout = setTimeout(() => {
			setPage(1);
			setDebouncedSearch(search.trim());
		}, 400);

		return () => clearTimeout(timeout);
	}, [search]);

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				const queryParams = new URLSearchParams({
					page: String(page),
					page_size: String(pageSize),
				});

				if (debouncedSearch) {
					queryParams.set("search", debouncedSearch);
				}

				const endpoint = activeDateRange
					? (() => {
						queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
						queryParams.set("fecha_fin", activeDateRange.fecha_fin);
						return `mortalidad/rango-fechas?${queryParams.toString()}`;
					})()
					: `mortalidad/paginated?${queryParams.toString()}`;

				const data = (await apiFetch(endpoint)) as MortalidadResponse;

				if (!mounted) {
					return;
				}

				setRows(Array.isArray(data?.mortalidad) ? data.mortalidad : []);
				setTotal(Number(data?.total_mortalidad ?? 0));
			} catch (requestError: any) {
				if (!mounted) return;
				// Un 404 del backend significa "sin resultados", no un error real
				if (requestError?.status === 404 || requestError?.statusCode === 404) {
					setRows([]);
					setTotal(0);
				} else {
					setError(requestError?.detail || requestError?.message || "No se pudieron cargar los registros de mortalidad");
				}
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, [page, pageSize, activeDateRange, debouncedSearch]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const clearDateFilter = () => {
		setDateRange({ fecha_inicio: "", fecha_fin: "" });
		setActiveDateRange(null);
		setSelectedRange(undefined);
		setPage(1);
		setError(null);
	};

	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	const handleExportarMortalidades = async (formato: "pdf" | "excel") => {
		setDescargando(formato);
		try {
			const extension = formato === "pdf" ? "pdf" : "xlsx";
			await apiDownload(
				`mortalidad/exportar/${formato}`,
				`reporte_mortalidad.${extension}`,
			);
		} catch (err: any) {
			alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
			setDescargando(null);
		}
	};
	return (
		<>
			<PageBreadcrumb pageTitle="Mortalidad" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<ConPermiso accion="insertar">
							<Link
								to="/mortalidad/create"
								className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
							>
								Nueva mortalidad
							</Link>
						</ConPermiso>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar..."
							className="h-11 w-50 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-50"
						/>
						<button
							onClick={() => handleExportarMortalidades("excel")}
							disabled={descargando !== null}
							className="w-50 inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							{descargando === "excel" ? "Descargando..." : "Exportar Excel"}
						</button>
						<button
							onClick={() => handleExportarMortalidades("pdf")}
							disabled={descargando !== null}
							className="w-50 inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							{descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
						</button>
					</div>
					<div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Filtrar por fecha:
						</label>

						{/* BOTÓN INTERACTIVO DEL CALENDARIO UNIFICADO */}
						<div className="relative w-full lg:w-64">
							<button
								type="button"
								onClick={() => setIsOpen(!isOpen)}
								className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
								aria-label="Seleccionar rango de fechas"
							>
								<span className="truncate">
									{selectedRange?.from ? (
										selectedRange.to ? (
											<>
												{format(selectedRange.from, 'dd LLL yyyy', { locale: es })} -{' '}
												{format(selectedRange.to, 'dd LLL yyyy', { locale: es })}
											</>
										) : (
											format(selectedRange.from, 'dd LLL yyyy', { locale: es })
										)
									) : (
										<span className="text-gray-400">Seleccionar rango</span>
									)}
								</span>
								<CalendarIcon className="h-4 w-4 text-gray-400" />
							</button>

							{/* POPOVER / POPUP DEL CALENDARIO DUAL (Se muestra al hacer clic) */}
							{isOpen && (
								<>
									{/* Overlay para cerrar al hacer clic fuera */}
									<div
										className="fixed inset-0 z-40"
										onClick={() => setIsOpen(false)}
									/>
									<div className="absolute top-12 right-0 z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900">
										<DayPicker
											mode="range"
											defaultMonth={selectedRange?.from || new Date()}
											selected={selectedRange}
											onSelect={handleSelectRange}
											locale={es}
											className="text-gray-800 dark:text-white/90"
										/>
									</div>
								</>
							)}
						</div>

						{/* Botón limpiar — visible solo cuando hay filtro activo */}
						{activeDateRange && (
							<button
								type="button"
								onClick={clearDateFilter}
								className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
							>
								Limpiar filtro
							</button>
						)}
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
								Foto
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
									<td colSpan={8} className="px-5 py-4">
										<div className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
									</td>
								</tr>
							))
						) : error ? (
							<tr>
								<td colSpan={8} className="px-5 py-10 text-center text-sm text-error-500">{error}</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay registros de mortalidad.</td>
							</tr>
						) : (
							rows.map((mortalidad) => {
								const fotoSrc = resolveFotoUrl(mortalidad.foto_url);
								return (
									<tr key={mortalidad.id_mortalidad} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{mortalidad.nombre_lote}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">Sublote: {mortalidad.sublote}</div>
										</td>

										<td className="px-5 py-4">
											<div className="text-sm text-gray-800 dark:text-gray-300">{mortalidad.nombre_categoria || "-"} / {mortalidad.nombre_especie || "-"}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(mortalidad.fecha_reporte)}</td>

										<td className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{mortalidad.cantidad}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{mortalidad.observacion || "-"}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{mortalidad.nombre_user}</td>

										<td className="px-5 py-4">
											{fotoSrc ? (
												<button
													type="button"
													onClick={() => setPreviewFoto(fotoSrc)}
													className="block h-12 w-12 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
												>
													<img src={fotoSrc} alt="Foto de mortalidad" className="h-full w-full object-cover" />
												</button>
											) : (
												<span className="text-xs text-gray-400">-</span>
											)}
										</td>

										<td className="px-5 py-4">
											<ConPermiso accion="actualizar">
												<Link
													to={`/mortalidad/edit/${mortalidad.id_mortalidad}`}
													className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
												>
													Editar
												</Link>
											</ConPermiso>
										</td>
									</tr>
								);
							})
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
		</div >

		{/* Lightbox simple para ver la foto en tamaño completo */}
		{previewFoto && (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
				onClick={() => setPreviewFoto(null)}
			>
				<img
					src={previewFoto}
					alt="Foto de mortalidad ampliada"
					className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
					onClick={(e) => e.stopPropagation()}
				/>
			</div>
		)}
		</>
	);
}
