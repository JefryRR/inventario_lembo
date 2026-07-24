import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch, apiDownload } from "@/services/api";

// Definición de tipos para las filas de datos del informe de lote
type LoteRow = {
	id_lote: number;
	nombre_lote: string;
	fecha_siembra: string;
	fecha_cosecha: string;
	cantidad: number;
	estado_lote: string;
	nombre_especie: string;
	nombre_categoria: string;
	nombre_user: string;
};

type MortalidadRow = {
	id_mortalidad: number;
	fecha_reporte: string;
	cantidad: number;
	observacion?: string;
	nombre_user?: string;
};

type HistorialEstadoRow = {
	id_historial: number;
	fecha_cambio: string;
	estado: string;
	usuario_id: number;
	nombre_user?: string;
};

// Mapeo de estados a selectores de etiquetas legibles
const ESTADO_LABELS: Record<string, string> = {
	activo: "Activo",
	finalizado: "Finalizado",
	cuarentena: "Cuarentena",
	listo_cosecha: "Listo para cosecha",
};

// Funciones auxiliares para formatear datos
function formatEstado(value: string): string {
	return ESTADO_LABELS[value] || value;
}

// Función para formatear fechas en formato local
function formatDate(value: string): string {
	if (!value) return "-";
	const normalized = value.endsWith("Z") || value.includes("+") ? value : value + "Z";

	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString("es-CO", {
		timeZone: "America/Bogota",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

type MetricCardProps = {
	label: string;
	value: string | number;
	sub?: string;
	color?: "green" | "red" | "gray" | "yellow";
};

// Componente para mostrar una tarjeta de métrica con etiqueta, valor y color
function MetricCard({ label, value, sub, color = "gray" }: MetricCardProps) {
	const colorMap = {
		green: "text-green-600 dark:text-green-400",
		red: "text-red-500 dark:text-red-400",
		yellow: "text-yellow-500 dark:text-yellow-400",
		gray: "text-gray-800 dark:text-white/90",
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
				{label}
			</p>
			<p className={`mt-1 text-3xl font-bold ${colorMap[color]}`}>{value}</p>
			{sub && (
				<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
			)}
		</div>
	);
}

// Componente principal para mostrar el informe de un lote específico
export default function InformeLote() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [lote, setLote] = useState<LoteRow | null>(null);
	const [mortalidad, setMortalidad] = useState<MortalidadRow[]>([]);
	const [history, setHistory] = useState<HistorialEstadoRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/signin");
		}
	}, [navigate]);

	useEffect(() => {
		if (!id) return;
		let mounted = true;

		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				// Ambas peticiones en paralelo
				const [loteData, mortalidadData, historyData] = await Promise.all([
					apiFetch(`lotes_prod/by-id?lote_id=${id}`) as Promise<LoteRow>,
					apiFetch(`mortalidad/by-lote?lote_id=${id}`) as Promise<MortalidadRow[]>,
					apiFetch(`lotes_prod/history_by-id?id_lote_p=${id}`) as Promise<HistorialEstadoRow[]>,
				]);

				if (!mounted) return;

				setLote(loteData);
				setMortalidad(Array.isArray(mortalidadData) ? mortalidadData : []);
				setHistory(Array.isArray(historyData) ? historyData : []);
			} catch (err: any) {
				if (!mounted) return;
				setError(err?.detail || err?.message || "No se pudo cargar el informe");
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, [id]);

	const totalMuertes = mortalidad.reduce((sum, r) => sum + r.cantidad, 0);
	const cantidad = lote?.cantidad ?? 0;
	const cantidadInicial = cantidad + totalMuertes; // Asumimos que la cantidad inicial es la suma de vivos actuales + muertes registradas
	const vivos = Math.max(0, cantidadInicial - totalMuertes);
	const porcentajeMortalidad =
		cantidadInicial > 0
			? ((totalMuertes / cantidadInicial) * 100).toFixed(1)
			: "0.0";

	if (loading) {
		return (
			<>
				<PageBreadcrumb pageTitle="Informe de lote" />
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
						/>
					))}
				</div>
			</>
		);
	}

	if (error) {
		return (
			<>
				<PageBreadcrumb pageTitle="Informe de lote" />
				<div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-red-500 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
					{error}
				</div>
			</>
		);
	}

	// Función para manejar la exportación del informe en PDF o Excel
	const handleExportar = async (formato: "pdf" | "excel") => {
		if (!id) return;

		setDescargando(formato);
		try {
			const extension = formato === "pdf" ? "pdf" : "xlsx";
			await apiDownload(
				`lotes_prod/reporte/${id}/${formato}`,
				`reporte_lote_${id}.${extension}`
			);
		} catch (err: any) {
			alert(err?.detail || err?.message || "No se pudo descargar el reporte.");
		} finally {
			setDescargando(null);
		}
	};

	return (
		<>
			<PageBreadcrumb pageTitle={`Informe — ${lote?.nombre_lote ?? ""}`} />

			{/* Botón volver */}
			<div className="mb-5 align-right flex justify-end">
				<button
					type="button"
					onClick={() => handleExportar("pdf")}
					disabled={descargando !== null}
					className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
				>
					{descargando === "pdf" ? "Generando..." : "Exportar PDF"}
				</button>
				<button
					type="button"
					onClick={() => handleExportar("excel")}
					disabled={descargando !== null}
					className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
				>
					{descargando === "excel" ? "Generando..." : "Exportar Excel"}
				</button>
				<Link
					to="/lotesProd"
					className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
				>
					Volver a lotes
				</Link>
			</div>

			{/* Info general del lote */}
			{lote && (
				<div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
					<h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
						Información del lote
					</h2>
					<div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Especie: </span>
							{lote.nombre_especie}
						</div>
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Categoría: </span>
							{lote.nombre_categoria}
						</div>
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Responsable: </span>
							{lote.nombre_user}
						</div>
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Siembra: </span>
							{formatDate(lote.fecha_siembra)}
						</div>
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Cosecha: </span>
							{formatDate(lote.fecha_cosecha)}
						</div>
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-200">Estado: </span>
							<span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
								{formatEstado(lote.estado_lote)}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Tarjetas de métricas */}
			<div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
				<MetricCard
					label="Cantidad inicial"
					value={cantidadInicial}
					color="gray"
				/>
				<MetricCard
					label="Vivos actuales"
					value={vivos}
					sub={`de ${cantidadInicial} iniciales`}
					color="green"
				/>
				<MetricCard
					label="Total muertes"
					value={totalMuertes}
					sub={`${mortalidad.length} evento(s) registrado(s)`}
					color="red"
				/>
				<MetricCard
					label="% Mortalidad"
					value={`${porcentajeMortalidad}%`}
					color={Number(porcentajeMortalidad) > 10 ? "red" : "yellow"}
				/>
			</div>

			<div className="rounded-2xl border border-gray-200 mb-8 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
					<h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
						Detalle del lote
					</h2>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Fecha de reporte
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									estado
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Registrado por
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{history.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
									>
										No hay eventos del lote registrados.
									</td>
								</tr>
							) : (
								history.map((row) => (
									<tr
										key={row.id_historial}
										className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
									>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{formatDate(row.fecha_cambio)}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{row.estado ? formatEstado(row.estado) : "-"}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{row.nombre_user || "-"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Tabla de detalle de mortalidad */}
			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
					<h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
						Detalles de mortalidades
					</h2>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y mt-50 divide-gray-200 dark:divide-gray-800">
						<thead className="bg-gray-50 dark:bg-gray-900/40">
							<tr>
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
									Registrado por
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{mortalidad.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
									>
										No hay eventos de mortalidad registrados para este lote.
									</td>
								</tr>
							) : (
								mortalidad.map((row) => (
									<tr
										key={row.id_mortalidad}
										className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
									>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{formatDate(row.fecha_reporte)}
										</td>
										<td className="px-5 py-4 text-sm font-medium text-red-500 dark:text-red-400">
											{row.cantidad}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{row.observacion || "-"}
										</td>
										<td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
											{row.nombre_user || "-"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
