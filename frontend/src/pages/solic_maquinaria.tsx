import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para que el calendario aparezca en español
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type SolicitudRow = {
	id_solicitud_maq: number;
    maquinaria_id: number;
	fecha_solicitud: string;
	fecha_entrega: string;
	fecha_devolucion: string;
	estado: string;
    nombre_maq: string;
    user_id: number;
    nombre_user: string;
    observaciones: string;
};

type SolicitudResponse = {
	total_solicitudes: number;
	page: number;
	page_size: number;
	solicitudes: SolicitudRow[];
};

type DateRangeState = {
    fecha_inicio: string;
    fecha_fin: string;
};

const ESTADO_LABELS: Record<string, string> = {
	pendiente: "Pendiente",
	entregada: "Entregada",
	cancelada: "Cancelada",
	devuelta: "Devuelta"
};

function formatEstado(value: string): string {
	return ESTADO_LABELS[value] || value;
}

function formatDate(value: string): string {
	if (!value) return "-";

	const normalizedValue = value.includes("T") ? value.split("T")[0] : value;
	const [year, month, day] = normalizedValue.split("-");

	if (!year || !month || !day) return value;

	return `${day}/${month}/${year}`;
}

export default function Solicitudes() {
	const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
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

	useEffect(() => {
		let isMounted = true;

		const loadSolicitudes = async () => {
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
                        return `solicitud-maq/rango-fechas?${queryParams.toString()}`;
                    })()
                    : `solicitud-maq/paginated-solicitudes?${queryParams.toString()}`;

				const data = (await apiFetch(endpoint)) as SolicitudResponse;

				if (!isMounted) {
					return;
				}

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
	}, [page, pageSize, activeDateRange]);

	const filteredSolicitudes = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) {
			return solicitudes;
		}
	
		return solicitudes.filter((solicitud) => {
			return [
				solicitud.nombre_maq,
				solicitud.nombre_user,
				solicitud.estado,
				formatEstado(solicitud.estado),
			]
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, solicitudes, activeDateRange]);

	const clearDateFilter = () => {
		setDateRange({ fecha_inicio: "", fecha_fin: "" });
		setActiveDateRange(null);
		setSelectedRange(undefined);
		setPage(1);
		setError(null);
	};

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return (
		<>
			<PageBreadcrumb pageTitle="Solicitudes de máquinas" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/solicitud-maq/crear"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
						>
							Nueva solicitud
						</Link>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar solicitudes..."
							className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800 sm:w-72"
						/>
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
									Solicitante
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fechas
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Máquina
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Estado
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
							) : filteredSolicitudes.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No hay registros de solicitudes para mostrar.
									</td>
								</tr>
							) : (
								filteredSolicitudes.map((solicitud) => (
									<tr key={solicitud.id_solicitud_maq} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
										<td className="px-5 py-4">
											<div className="text-sm font-medium text-gray-800 dark:text-white/90">{solicitud.nombre_user}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											<div>Solicitud: {formatDate(solicitud.fecha_solicitud)}</div>
											<div>Entrega: {formatDate(solicitud.fecha_entrega)}</div>
											<div>Devolución: {formatDate(solicitud.fecha_devolucion)}</div>
										</td>

										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{solicitud.nombre_maq}
										</td>

										<td className="px-5 py-4">
											<span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
												{formatEstado(solicitud.estado)}
											</span>
										</td>

                                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {solicitud.observaciones || "-"}
                                        </td>

										<td className="px-5 py-4">
											{solicitud.estado?.toLowerCase() === "cancelada" || solicitud.estado?.toLowerCase() === "devuelta" ? (
                    						  <span className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500">
                    						    Editar
                    						  </span>
                    						) : (
												<div className="flex flex-col items-center gap-2">
													<Link
														to={`/solicitud-maq/edit/${solicitud.id_solicitud_maq}`}
														className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700">
														Editar
													</Link>
												</div>
											)}
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
