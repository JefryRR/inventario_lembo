import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ConPermiso } from "@/components/PermisoModulo/ConPermiso";

// Definición de tipos para los datos de venta de platos
type VentaPlatosRow = {
	id_venta_plato: number;
	plato_id: number;
	cantidad: number;
	precio: number;
	fecha_venta: string;
	nombre_plato: string;
};

type VentaPlatosResponse = {
	total_ventaPlatos: number;
	page: number;
	page_size: number;
	ventaPlatos: VentaPlatosRow[];
};

type DateRangeState = {
	fecha_inicio: string;
	fecha_fin: string;
};

// Función para formatear la fecha en formato legible
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

export default function VentaPlatos() {
	const [ventas, setVentas] = useState<VentaPlatosRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
	const [dateRange, setDateRange] = useState<DateRangeState>({fecha_inicio: "", fecha_fin: ""});
	const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);
	const [debouncedSearch, setDebouncedSearch] = useState(search);
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

		// Actualizamos el estado de dateRange con los valores seleccionados
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

	// Debounce: espera 400ms después de que el usuario deja de escribir
	useEffect(() => {
		const timeoutId = setTimeout(() => { setDebouncedSearch(search); }, 400);
		return () => clearTimeout(timeoutId);
	}, [search]);

	// Cuando cambia el término de búsqueda (ya debounced), volvemos a la página 1
	useEffect(() => {
		setPage(1);
	}, [debouncedSearch]);


	useEffect(() => {
		let isMounted = true;

		const loadVentas = async () => {
			setLoading(true);
			setError(null);

			try {
				// Construimos los parámetros de la URL para la paginación y búsqueda
				const queryParams = new URLSearchParams({
					page: String(page),
					page_size: String(pageSize),
				});

				// Si hay un término de búsqueda, lo agregamos a los parámetros de la URL
                if (debouncedSearch.trim()) {
                    queryParams.set("search", debouncedSearch.trim());
                }

				// Si hay un rango de fechas activo, usamos el endpoint de rango de fechas; de lo contrario, usamos el endpoint paginado
				const endpoint = activeDateRange
					? (() => {
						queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
						queryParams.set("fecha_fin", activeDateRange.fecha_fin);
						return `venta_platos/rango-fechas?${queryParams.toString()}`;
					})()
					: `venta_platos/venta_platos_paginated?${queryParams.toString()}`;
				
					// Llamada a la API para obtener las ventas de platos
				const data = (await apiFetch(endpoint)) as VentaPlatosResponse;

				if (!isMounted) {
					return;
				}

				setVentas(Array.isArray(data?.ventaPlatos) ? data.ventaPlatos : []);
				setTotal(Number(data?.total_ventaPlatos ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
					requestError?.message ||
					"No se pudieron cargar las ventas"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadVentas();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize, activeDateRange, debouncedSearch]);

	// Función para limpiar el filtro de fechas y restablecer la paginación
	const clearDateFilter = () => {
		setDateRange({ fecha_inicio: "", fecha_fin: "" });
		setActiveDateRange(null);
		setSelectedRange(undefined);
		setPage(1);
		setError(null);
	};

	// Cálculo del total general de ventas de platos
	const totalGeneral = useMemo(() => {
		return ventas.reduce((acc, venta) => acc + venta.precio * venta.cantidad, 0);
	}, [ventas]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	const handleExportarVentas = async (formato: "pdf" | "excel") => {
		setDescargando(formato);
		try {
			const extension = formato === "pdf" ? "pdf" : "xlsx";
			await apiDownload(
				`venta_platos/exportar/${formato}`,
				`reporte_ventas_platos.${extension}`,
			);
		} catch (err: any) {
			alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
			setDescargando(null);
		}
	};

	return (
		<>
			<PageBreadcrumb pageTitle="Ventas de platos" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<ConPermiso accion="insertar">
							<Link
								to="/venta_platos/crear"
								className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
							>
								Nueva venta
							</Link>
						</ConPermiso>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar venta..."
							className="h-11 w-full rounded-lg focus:ring-gray-500 border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>
						<button
							onClick={() => handleExportarVentas("excel")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							{descargando === "excel" ? "Descargando..." : "Exportar Excel"}
						</button>
						<button
							onClick={() => handleExportarVentas("pdf")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						>
							{descargando === "pdf" ? "Descargando..." : "Exportar PDF"}
						</button>
					</div>
					<div className="flex flex-col gap-2 lg:flex-row lg:items-center relative">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Filtrar por fechas:
						</label>

						{/* BOTÓN INTERACTIVO DEL CALENDARIO UNIFICADO */}
						<div className="relative w-full lg:w-64">
							<button
								type="button"
								onClick={() => setIsOpen(!isOpen)}
								className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm focus:ring-gray-500 text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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
									Plato
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidad
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Precio
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Total venta
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha de venta
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
							) : ventas.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay ventas de platos para mostrar.
									</td>
								</tr>
							) : (
								ventas.map((venta) => (
									<tr key={venta.id_venta_plato} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{venta.nombre_plato}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{venta.cantidad}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{venta.precio}</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{(venta.precio * venta.cantidad).toLocaleString("es-CO", { style: "currency", currency: "COP" })}
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(venta.fecha_venta)}</td>
										<td className="px-5 py-4">
											<ConPermiso accion="actualizar">
												<Link
													to={`/venta_platos/edit/${venta.id_venta_plato}`}
													className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
												>
													Editar
												</Link>
											</ConPermiso>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-gray-800">
					<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
						Total de ventas:{" "}
						{totalGeneral.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
					</span>
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
