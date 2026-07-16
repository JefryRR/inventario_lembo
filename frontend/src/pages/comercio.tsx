import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type ComercioRow = {
	id_comercializacion: number;
	producto_id: number;
    lote_id: number | null;
	cantidad: number;
	unid_med_id: number;
	lugar_comercializacion: string;
	fecha_comercializacion: string;
	cant_no_vendida: number | null;
	vendio_todo: boolean;
	simbolo: string;
	nombre_producto: string;
	user_id: number;
	nombre_user: string;
    sublote: string | null;
    observacion: string | null;
};

type ComercioResponse = {
	total_comercializaciones: number;
	page: number;
	page_size: number;
	comercializaciones: ComercioRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

function formatDate(value: string): string {
	if (!value) return "-";

	const [year, month, day] = value.split("-");

	if (!year || !month || !day) return value;

	return `${day}/${month}/${year}`;
}

export default function Comercios() {
	const navigate = useNavigate();
	const [comercializaciones, setComercializaciones] = useState<ComercioRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState<DateRangeState>({
                    fecha_inicio: "",
                    fecha_fin: "",
                });
            const [activeDateRange, setActiveDateRange] = useState<DateRangeState | null>(null);
        
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

	// Vendió todo (switch) state
	const [updatingId, setUpdatingId] = useState<number | null>(null);
	const [editingCantidadId, setEditingCantidadId] = useState<number | null>(null);
	const [cantidadInput, setCantidadInput] = useState<string>("");

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	useEffect(() => {
		let isMounted = true;

		const loadComercializaciones = async () => {
			setLoading(true);
			setError(null);

			try {
                const queryParams = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });

                const endpoint = activeDateRange
                    ? (() => {
                        queryParams.set("fecha_inicio", activeDateRange.fecha_inicio);
                        queryParams.set("fecha_fin", activeDateRange.fecha_fin);
                        return `comercio/rango-fechas?${queryParams.toString()}`;
                    })()
                    : `comercio/paginated-comercializaciones?${queryParams.toString()}`;

				const data = (await apiFetch(endpoint)) as ComercioResponse;

				if (!isMounted) {
					return;
				}

				setComercializaciones(Array.isArray(data?.comercializaciones) ? data.comercializaciones : []);
				setTotal(Number(data?.total_comercializaciones ?? 0));
			} catch (requestError: any) {
				if (!isMounted) {
					return;
				}

				setError(
					requestError?.detail ||
						requestError?.message ||
						"No se pudieron cargar las comercializaciones"
				);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadComercializaciones();

		return () => {
			isMounted = false;
		};
	}, [page, pageSize, activeDateRange]);

	const filteredComercializaciones = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return comercializaciones;
		}
	
		return comercializaciones.filter((comercializacion) => {
			return [
				comercializacion.nombre_producto,
				comercializacion.nombre_user,
				comercializacion.lugar_comercializacion,
				comercializacion.sublote,
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, comercializaciones, activeDateRange]);

	const clearDateFilter = () => {
		setDateRange({ fecha_inicio: "", fecha_fin: "" });
		setActiveDateRange(null);
		setSelectedRange(undefined);
		setPage(1);
		setError(null);
	};

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	// Marca la comercialización como "vendió todo": true y limpia la cantidad no vendida
	const handleMarcarVendioTodo = async (row: ComercioRow) => {
		setUpdatingId(row.id_comercializacion);
		try {
			await apiFetch(`comercio/update/vendio-todo/${row.id_comercializacion}?vendio_todo=true`, {
				method: "PUT",
			});

			setComercializaciones((prev) =>
				prev.map((item) =>
					item.id_comercializacion === row.id_comercializacion
						? { ...item, vendio_todo: true, cant_no_vendida: null }
						: item
				)
			);
			setEditingCantidadId(null);
			setCantidadInput("");
		} catch (requestError: any) {
			alert(requestError?.detail || requestError?.message || "No se pudo actualizar el estado.");
		} finally {
			setUpdatingId(null);
		}
	};

	// Abre el campo para ingresar la cantidad no vendida
	const handleIniciarNoVendioTodo = (row: ComercioRow) => {
		setEditingCantidadId(row.id_comercializacion);
		setCantidadInput(row.cant_no_vendida != null ? String(row.cant_no_vendida) : "");
	};

	const handleCancelarEdicion = () => {
		setEditingCantidadId(null);
		setCantidadInput("");
	};

	// Guarda vendio_todo: false junto con la cantidad no vendida ingresada
	const handleGuardarNoVendioTodo = async (row: ComercioRow) => {
		const parsedCantidad = Number(cantidadInput);

		if (!cantidadInput.trim() || Number.isNaN(parsedCantidad) || parsedCantidad < 0) {
			alert("Ingresa una cantidad válida.");
			return;
		}

		setUpdatingId(row.id_comercializacion);
		try {
			await apiFetch(`comercio/update/comercializacion/${row.id_comercializacion}`, {
				method: "PUT",
				body: {
					vendio_todo: false,
					cant_no_vendida: parsedCantidad,
				},
			});

			setComercializaciones((prev) =>
				prev.map((item) =>
					item.id_comercializacion === row.id_comercializacion
						? { ...item, vendio_todo: false, cant_no_vendida: parsedCantidad }
						: item
				)
			);
			setEditingCantidadId(null);
			setCantidadInput("");
		} catch (requestError: any) {
			alert(requestError?.detail || requestError?.message || "No se pudo actualizar la cantidad.");
		} finally {
			setUpdatingId(null);
		}
	};

	// Controla el switch: si estaba en "Sí" pide la cantidad no vendida, si estaba en "No" limpia y marca vendido
	const handleToggleVendioTodo = (row: ComercioRow) => {
		if (updatingId !== null) return;

		if (row.vendio_todo) {
			handleIniciarNoVendioTodo(row);
		} else {
			handleMarcarVendioTodo(row);
		}
	};

	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	const handleExportarComercializaciones = async (formato: "pdf" | "excel") => {
		setDescargando(formato);
		try {
		const extension = formato === "pdf" ? "pdf" : "xlsx";
		await apiDownload(
			`comercio/exportar/${formato}`,
			`reporte_comercializaciones.${extension}`,
		);
		} catch (err: any) {
		alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
		setDescargando(null);
		}
	};

	return (
		<>
			<PageBreadcrumb pageTitle="Comercializaciones" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/comercializaciones/crear"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
						>
							Nueva comercialización
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar comercializaciones..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>

						<button
							onClick={() => handleExportarComercializaciones("excel")}
							disabled={descargando !== null}
							className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
							>
							{descargando === "excel" ? "Descargando..." : "Exportar Excel"}
							</button>
							<button
							onClick={() => handleExportarComercializaciones("pdf")}
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
							className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm text-gray-800 outline-none focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
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
									Producto
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Cantidad
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Lugar
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Estado
								</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Observación
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
							) : filteredComercializaciones.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay registros de comercializaciones para mostrar.
									</td>
								</tr>
							) : (
								filteredComercializaciones.map((comercializacion) => (
									<tr key={comercializacion.id_comercializacion} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{comercializacion.nombre_producto}</div>
											<div className="text-sm text-gray-800 dark:text-white/90">Lote: {comercializacion.sublote}</div>
										</td>
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{formatDate(comercializacion.fecha_comercializacion)}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{comercializacion.cantidad} {comercializacion.simbolo}
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{comercializacion.lugar_comercializacion}
										</td>

										<td className="px-5 py-4">
											<div className="flex flex-col gap-2">
												<div className="flex items-center gap-2">
													<button
														type="button"
														role="switch"
														aria-checked={comercializacion.vendio_todo}
														onClick={() => handleToggleVendioTodo(comercializacion)}
														disabled={updatingId === comercializacion.id_comercializacion}
														className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
															comercializacion.vendio_todo
																? "bg-green-600"
																: "bg-gray-300 dark:bg-gray-700"
														}`}
													>
														<span
															className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
																comercializacion.vendio_todo ? "translate-x-6" : "translate-x-1"
															}`}
														/>
													</button>
													<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
														{comercializacion.vendio_todo ? "Vendió todo" : "No vendió todo"}
													</span>
												</div>

												{editingCantidadId === comercializacion.id_comercializacion ? (
													<div className="flex items-center gap-2">
														<input
															min={0}
															autoFocus
															value={cantidadInput}
															onChange={(e) => setCantidadInput(e.target.value)}
															placeholder="Cant. no vendida"
															className="h-8 w-28 rounded-md border border-gray-300 bg-transparent px-2 text-xs text-gray-800 outline-none focus:border-gray-400 dark:border-gray-700 dark:text-white/90"
														/>
														<button
															type="button"
															onClick={() => handleGuardarNoVendioTodo(comercializacion)}
															disabled={updatingId === comercializacion.id_comercializacion}
															className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
														>
															Guardar
														</button>
														<button
															type="button"
															onClick={handleCancelarEdicion}
															disabled={updatingId === comercializacion.id_comercializacion}
															className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
														>
															Cancelar
														</button>
													</div>
												) : (
													!comercializacion.vendio_todo &&
													comercializacion.cant_no_vendida != null && (
														<span className="text-xs text-gray-500 dark:text-gray-400">
															No vendido: {comercializacion.cant_no_vendida}
														</span>
													)
												)}
											</div>
										</td>

                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {comercializacion.observacion || "Sin observación"}
                                        </td>

                                        <td className="px-5 py-4">
											<Link
												to={`/comercializaciones/edit/${comercializacion.id_comercializacion}`}
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
