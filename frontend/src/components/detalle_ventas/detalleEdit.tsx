import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Tipos de datos para el formulario y las opciones de productos y medidas
type EstadoVenta = "Vendido" | "Separado" | "Anulado";

type DetalleFormState = {
	cantidad: number;
	unid_medida_id: number;
	precio_venta: string;
	inv_prod_id: number;
	venta_id: number;
	estado_venta: EstadoVenta;
	nombre_producto: string;
	nombre_comprador: string;
	simbolo: string;
	cant_convertida: number;
};

type ProductoOption = {
	id_inventario: number;
	nombre_producto: string;
	nombre_lote?: string;
	simbolo?: string;
	cantidad?: number;
};

type MedidaOption = {
	id_unidad: number;
	simbolo: string;
};

// Tipo de respuesta esperada al obtener un detalle de venta por ID
type DetalleVentaResponse = {
	id_detalle_venta: number;
	cantidad: number;
	unid_medida_id: number;
	precio_venta: number;
	inv_prod_id: number;
	venta_id: number;
	estado_venta: EstadoVenta;
	cant_convertida?: number;
	nombre_producto?: string;
	nombre_comprador?: string;
	simbolo?: string;
};

// Opciones de estado de venta para el select
const ESTADO_OPTIONS: Array<{ value: EstadoVenta; label: string }> = [
	{ value: "Vendido", label: "Vendido" },
	{ value: "Separado", label: "Separado" },
	{ value: "Anulado", label: "Anulado" },
];

// Estado inicial del formulario
const initialState: DetalleFormState = {
	cantidad: 0,
	unid_medida_id: 0,
	precio_venta: "",
	inv_prod_id: 0,
	venta_id: 0,
	estado_venta: "Separado",
	nombre_producto: "",
	nombre_comprador: "",
	simbolo: "",
	cant_convertida: 0,
};

// Componente principal para editar un detalle de venta
export default function DetalleEdit() {
	const navigate = useNavigate();
	const params = useParams();
	const id = params.id || params.id_detalle_venta || params.detalle_id;

	const [form, setForm] = useState<DetalleFormState>(initialState);
	const [productos, setProductos] = useState<ProductoOption[]>([]);
	const [medidas, setMedidas] = useState<MedidaOption[]>([]);
	const [originalEstado, setOriginalEstado] = useState<EstadoVenta | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingCatalogs, setLoadingCatalogs] = useState(false);	
    const [loadError, setLoadError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (!id) {
			setError("No se encontró el identificador del detalle de venta");
			return;
		}

		let mounted = true;

		const loadData = async () => {
			setLoading(true);
			setLoadingCatalogs(true);
			setError(null);

			try {
				const [detalleData, productosData, medidasData] = await Promise.all([
					apiFetch(`detalles-venta/by-id/detalle?id=${id}`),
					apiFetch("inv_produccion/all/produccion"),
					apiFetch("unid-medida/all-unid_medidas"),
				]);

				if (!mounted) return;

				const detalle = detalleData as DetalleVentaResponse;

				const productoList = Array.isArray(productosData?.produccion)
					? productosData.produccion
					: Array.isArray(productosData)
						? productosData
						: [];

				const medidaList = Array.isArray(medidasData?.medidas)
					? medidasData.medidas
					: Array.isArray(medidasData)
						? medidasData
						: [];

				setProductos(productoList);
				setMedidas(medidaList);

				// Determinar el estado del detalle de venta, usando "Separado" como valor predeterminado si no está definido
				const estadoDetalle = detalle?.estado_venta ?? "Separado";

				// Establecer el estado inicial del formulario con los datos obtenidos
				setForm({
					cantidad: Number(detalle?.cantidad ?? 0),
					unid_medida_id: Number(detalle?.unid_medida_id ?? 0),
					precio_venta: String(detalle?.precio_venta ?? ""),
					inv_prod_id: Number(detalle?.inv_prod_id ?? 0),
					venta_id: Number(detalle?.venta_id ?? 0),
					estado_venta: estadoDetalle,
					nombre_producto: detalle?.nombre_producto ?? "",
					nombre_comprador: detalle?.nombre_comprador ?? "",
					simbolo: detalle?.simbolo ?? "",
					cant_convertida: Number(detalle?.cant_convertida ?? 0),
				});
				setOriginalEstado(estadoDetalle);
			} catch (requestError: any) {
				if (!mounted) return;
				setLoadError(requestError?.detail || requestError?.message || "No se pudo cargar el detalle de venta");
			} finally {
				if (mounted) {
					setLoading(false);
					setLoadingCatalogs(false);
				}
			}
		};

		loadData();

		return () => {
			mounted = false;
		};
	}, [id]);

	// Función para manejar cambios en los campos del formulario
	const handleChange =
		(field: keyof DetalleFormState) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			const value = event.target.value;

			if (field === "cantidad" || field === "unid_medida_id" || field === "inv_prod_id") {
				setForm((current) => ({
					...current,
					[field]: Number(value),
				}));
				return;
			}

			setForm((current) => ({
				...current,
				[field]: value,
			}));
		};

	// Función para manejar el envío del formulario y actualizar el detalle de venta
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!id) return;

		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const payload = {
				cantidad: Number(form.cantidad),
				unid_medida_id: Number(form.unid_medida_id),
				precio_venta: Number(form.precio_venta),
				inv_prod_id: Number(form.inv_prod_id),
			};

			// Verificar si el estado de venta ha cambiado y si el estado original o el estado destino están bloqueados
			const estadoCambiado = originalEstado !== null && originalEstado !== form.estado_venta;
			const estadoBloqueado = originalEstado === "Vendido" || originalEstado === "Anulado";
			const estadoDestinoBloqueado = form.estado_venta === "Vendido" || form.estado_venta === "Anulado";

			// Si el estado ha cambiado y el estado original estaba bloqueado, actualizar primero el estado de venta
			if (estadoCambiado && estadoBloqueado) {
				await apiFetch(`detalles-venta/estado/${id}?estado=${encodeURIComponent(form.estado_venta)}`, {
					method: "PUT",
				});
			}

			// Si el estado no ha cambiado o si el estado original y el estado destino no están bloqueados, 
			// actualizar los demás campos del detalle de venta
			if (!(estadoCambiado && estadoBloqueado && estadoDestinoBloqueado)) {
				const data = await apiFetch(`detalles-venta/update/detalle/${id}`, {
					method: "PUT",
					body: payload,
				});

				if (estadoCambiado && !estadoBloqueado) {
					await apiFetch(`detalles-venta/estado/${id}?estado=${encodeURIComponent(form.estado_venta)}`, {
						method: "PUT",
					});
				}

				setSuccess(data?.message || "Detalle de venta actualizado correctamente");
			} else {
				setSuccess("Estado del detalle de venta actualizado correctamente");
			}

			setOriginalEstado(form.estado_venta);
			setTimeout(() => navigate("/ventas"), 800);
		} catch (requestError: any) {
			setError(requestError?.detail || requestError?.message || "No se pudo actualizar el detalle de venta");
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<PageMeta title="Editar detalle de venta | Inventario Lembo" description="Editar detalle de venta" />

			<div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar detalle de venta</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">Actualiza los campos permitidos del detalle de venta.</p>
					</div>

					<Link
						to="/ventas"
						className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
					>
						Volver a ventas
					</Link>
				</div>

				<form onSubmit={handleSubmit} className="p-5 lg:p-6">
					{loading ? (
						<div className="p-6 text-center text-sm text-gray-500">Cargando detalle de venta...</div>
					) : loadError ? (
						<div className="p-6 text-center text-sm text-error-500">{loadError}</div>
					) : (
						<>
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Producto</label>
									<div className="flex h-11 items-center rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90">
										{form.nombre_producto || "Producto no disponible"}
									</div>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Venta</label>
									<div className="flex h-11 items-center rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90">
										{form.nombre_comprador || "Venta no disponible"}
									</div>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Cantidad <span className="text-error-500">*</span>
									</label>
									<input
										value={form.cantidad}
										onChange={handleChange("cantidad")}
										min={1}
										className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
										required
									/>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Precio de venta <span className="text-error-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={form.precio_venta}
										onChange={handleChange("precio_venta")}
										className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
										required
									/>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Producto en inventario <span className="text-error-500">*</span>
									</label>
									<select
										value={form.inv_prod_id}
										onChange={handleChange("inv_prod_id")}
										className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
										required
										disabled={loadingCatalogs || productos.length === 0}
									>
										<option className="dark:text-black" value={0} disabled>
											{loadingCatalogs ? "Cargando productos..." : "Selecciona un producto"}
										</option>
										{form.inv_prod_id && !productos.some((producto) => producto.id_inventario === form.inv_prod_id) && (
											<option className="dark:text-black" value={form.inv_prod_id}>
												{form.nombre_producto || "Producto asignado"}
											</option>
										)}
										{productos.map((producto) => (
											<option className="dark:text-black" key={producto.id_inventario} value={producto.id_inventario}>
												{producto.nombre_producto}{producto.nombre_lote ? ` - ${producto.nombre_lote}` : ""} - cantidad: {producto.cantidad ?? "N/A"} {producto.simbolo ?? ""}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Unidad de medida <span className="text-error-500">*</span>
									</label>
									<select
										value={form.unid_medida_id}
										onChange={handleChange("unid_medida_id")}
										className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
										required
										disabled={loadingCatalogs || medidas.length === 0}
									>
										<option className="dark:text-black" value={0} disabled>
											{loadingCatalogs ? "Cargando unidades..." : "Selecciona una unidad de medida"}
										</option>
										{form.unid_medida_id && !medidas.some((medida) => medida.id_unidad === form.unid_medida_id) && (
											<option className="dark:text-black" value={form.unid_medida_id}>
												{form.simbolo || "Unidad asignada"}
											</option>
										)}
										{medidas.map((medida) => (
											<option className="dark:text-black" key={medida.id_unidad} value={medida.id_unidad}>
												{medida.simbolo}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado de venta</label>
									<select
										value={form.estado_venta}
										onChange={handleChange("estado_venta")}
										className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:ring-gray-500 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
									>
										{ESTADO_OPTIONS.map((option) => (
											<option className="dark:text-black" key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>
							</div>

							{success && (
								<div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
									{success}
								</div>
							)}

							{error && (
								<div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
									{error}
								</div>
							)}

							<div className="mt-6 flex flex-wrap gap-3">
								<button
									type="submit"
									disabled={saving}
									className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{saving ? "Guardando..." : "Actualizar detalle"}
								</button>
								<Link
									to="/ventas"
									className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
								>
									Cancelar
								</Link>
							</div>
						</>
					)}
				</form>
			</div>
		</>
	);
}
