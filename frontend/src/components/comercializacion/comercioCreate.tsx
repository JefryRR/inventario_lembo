import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is un module JS sin tipos generados
import { apiFetch } from "@/services/api";

type ProductoOption = {
  id_inventario: number;
  nombre_producto: string;
  cantidad: number;
  simbolo: string;
  lote_id?: number;
  sublote?: string;
  fecha_vencimiento?: string;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

type LoteOption = {
  id_lote: number;
  sublote: string;
};


// Un producto que el usuario ya agregó a la lista, listo para enviarse al backend
type ItemComercializacion = {
  clientId: string; // id temporal solo para el frontend (key de React y para poder eliminarlo)
  producto_id: number;
  lote_id: number;
  nombre_producto: string;
  unid_medida_id: number;
  simbolo_medida: string;
  cantidad: number;
  vendio_todo: boolean;
  cant_no_vendida: number;
  observacion: string;
};

// Campos del producto que se está armando actualmente en el formulario (antes de agregarlo a la lista)
type ProductoFormState = {
  producto_id: number;
  cantidad: number;
  unid_medida_id: number;
  observacion: string;
  vendio_todo: boolean;
  cant_no_vendida: number;
};

const getLocalISODateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const initialProductoForm: ProductoFormState = {
  producto_id: 0,
  cantidad: 0,
  unid_medida_id: 0,
  observacion: "",
  vendio_todo: true,
  cant_no_vendida: 0,
};

export default function ComercioCreate() {
  const navigate = useNavigate();

  // Datos comunes a toda la comercialización (aplican a todos los productos que se agreguen)
  const [fechaComercializacion, setFechaComercializacion] = useState(getLocalISODateTime());
  const [lugarComercializacion, setLugarComercializacion] = useState("");

  // Producto que se está llenando en el formulario ahora mismo
  const [productoForm, setProductoForm] = useState<ProductoFormState>(initialProductoForm);

  // Lista de productos ya agregados (todavía no enviados al backend)
  const [items, setItems] = useState<ItemComercializacion[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCatalogs = async () => {
      setLoadingProductos(true);
      setLoadingMedidas(true);

      try {
        const [productosData, medidasData, lotesData] = await Promise.all([
          apiFetch("inv_produccion/all/produccion"),
          apiFetch("unid-medida/all-unid_medidas"),
          apiFetch("lotes_prod/all-lotes_prod"),
        ]);

        if (!mounted) return;

        const productoList = Array.isArray(productosData?.produccion)
          ? productosData.produccion
          : Array.isArray(productosData?.inv_produccion)
            ? productosData.inv_produccion
            : Array.isArray(productosData)
              ? productosData
              : [];

        const medidaList = Array.isArray(medidasData?.medidas)
          ? medidasData.medidas
          : Array.isArray(medidasData?.unid_medidas)
            ? medidasData.unid_medidas
            : Array.isArray(medidasData)
              ? medidasData
              : [];

        const lotesList = Array.isArray(lotesData?.lotes)
          ? lotesData.lotes
          : Array.isArray(lotesData)
            ? lotesData
            : [];

        const lotesPorId = new Map(lotesList.map((lote: LoteOption) => [lote.id_lote, lote.sublote]));
        const productosActivos = productoList
          .filter((producto: ProductoOption) => Number(producto.cantidad || 0) > 0)
          .map((producto: ProductoOption) => ({
            ...producto,
            sublote: producto.sublote || (producto.lote_id ? lotesPorId.get(producto.lote_id) || "" : ""),
          }));

        const getFechaLocalISO = () => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const productosNoVencidos = productosActivos.filter((producto: ProductoOption) => {
          if (!producto.fecha_vencimiento) return true;
          const fecha_actual = getFechaLocalISO();
          return producto.fecha_vencimiento.slice(0, 10) >= fecha_actual;
        });

        setProductos(productosActivos);
        setProductos(productosNoVencidos);
        setMedidas(medidaList);
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudieron cargar los datos necesarios para la comercialización");
      } finally {
        if (mounted) {
          setLoadingProductos(false);
          setLoadingMedidas(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

  const handleProductoChange =
    (field: keyof ProductoFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;

        if (field === "producto_id" || field === "cantidad" || field === "unid_medida_id" || field === "cant_no_vendida") {
          setProductoForm((current) => ({
            ...current,
            [field]: Number(value),
          }));
          return;
        }

        setProductoForm((current) => ({
          ...current,
          [field]: value,
        }));
      };

  // Cuánto de un producto ya está reservado en la lista (por si el usuario lo agrega en dos tandas)
  const cantidadYaAgregada = (productoId: number) =>
    items
      .filter((item) => item.producto_id === productoId)
      .reduce((total, item) => total + item.cantidad, 0);

  const handleAddProducto = () => {
    setError(null);

    if (!productoForm.producto_id) {
      setError("Selecciona un producto para agregarlo a la lista");
      return;
    }

    if (!productoForm.unid_medida_id) {
      setError("Selecciona una unidad de medida");
      return;
    }

    const cantidadValue = Number(productoForm.cantidad);
    if (Number.isNaN(cantidadValue) || cantidadValue <= 0) {
      setError("La cantidad debe ser un número mayor a 0");
      return;
    }

    if (!productoForm.vendio_todo && Number(productoForm.cant_no_vendida) < 0) {
      setError("La cantidad no vendida no puede ser negativa");
      return;
    }

    const productoSeleccionado = productos.find((producto) => producto.id_inventario === productoForm.producto_id);

    if (productoSeleccionado) {
      const disponible = Number(productoSeleccionado.cantidad || 0) - cantidadYaAgregada(productoForm.producto_id);
      if (cantidadValue > disponible) {
        setError(`Solo hay ${disponible} ${productoSeleccionado.simbolo || ""} disponibles de "${productoSeleccionado.nombre_producto}"`);
        return;
      }
    }

    const medidaSeleccionada = medidas.find((medida) => medida.id_unidad === productoForm.unid_medida_id);

    const nuevoItem: ItemComercializacion = {
      clientId: crypto.randomUUID(),
      producto_id: productoForm.producto_id,
      lote_id: productoSeleccionado?.lote_id || 0,
      nombre_producto: productoSeleccionado?.nombre_producto || "Producto",
      unid_medida_id: productoForm.unid_medida_id,
      simbolo_medida: medidaSeleccionada?.simbolo || "",
      cantidad: cantidadValue,
      vendio_todo: productoForm.vendio_todo,
      cant_no_vendida: productoForm.vendio_todo ? 0 : Number(productoForm.cant_no_vendida || 0),
      observacion: productoForm.observacion.trim(),
    };

    setItems((current) => [...current, nuevoItem]);
    // Reiniciamos solo los campos del producto; fecha y lugar quedan igual para el siguiente
    setProductoForm(initialProductoForm);
  };

  const handleRemoveItem = (clientId: string) => {
    setItems((current) => current.filter((item) => item.clientId !== clientId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (items.length === 0) {
      setError("Agrega al menos un producto antes de guardar la comercialización");
      return;
    }

    setLoading(true);

    const errores: string[] = [];

    // Enviamos un producto a la vez porque el backend registra una comercialización por producto.
    // Si tu endpoint llega a aceptar un arreglo completo, aquí se reemplazaría este for por un solo POST.
    for (const item of items) {
      try {
        const payload = {
          producto_id: item.producto_id,
          lote_id: item.lote_id,
          fecha_comercializacion: fechaComercializacion,
          cantidad: item.cantidad,
          unid_medida_id: item.unid_medida_id,
          lugar_comercializacion: lugarComercializacion.trim() || null,
          observacion: item.observacion || null,
          vendio_todo: item.vendio_todo,
          cant_no_vendida: item.cant_no_vendida,
        };

        await apiFetch("comercio/crear", {
          method: "POST",
          body: payload,
        });

        // Si se guardó bien, lo quitamos de la lista pendiente para que, si algo más falla,
        // el usuario vea claramente qué le falta por reintentar.
        setItems((current) => current.filter((current_item) => current_item.clientId !== item.clientId));
      } catch (requestError: any) {
        errores.push(`${item.nombre_producto}: ${requestError?.detail || requestError?.message || "error desconocido"}`);
      }
    }

    setLoading(false);

    if (errores.length > 0) {
      setError(`No se pudieron guardar algunos productos: ${errores.join(" | ")}`);
      return;
    }

    setSuccess("Comercialización registrada correctamente");
    navigate("/comercializaciones");
  };

  return (
    <>
      <PageMeta title="Crear comercialización | Inventario Lembo" description="Formulario para registrar una comercialización" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nueva comercialización</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registra la salida de uno o varios productos desde inventario de producción.
            </p>
          </div>

          <Link
            to="/comercializaciones"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Volver a comercializaciones
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6">
          {/* Datos comunes a toda la comercialización */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de comercialización <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                value={fechaComercializacion}
                onChange={(event) => setFechaComercializacion(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lugar de comercialización
              </label>
              <input
                type="text"
                value={lugarComercializacion}
                onChange={(event) => setLugarComercializacion(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                maxLength={50}
                placeholder="Tienda, feria, cliente..."
              />
            </div>
          </div>

          <div className="my-6 border-t border-dashed border-gray-200 dark:border-gray-800" />

          {/* Formulario para armar UN producto a la vez */}
          <h4 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Agregar producto</h4>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Producto <span className="text-error-500">*</span>
              </label>
              <select
                value={productoForm.producto_id}
                onChange={handleProductoChange("producto_id")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                disabled={loadingProductos || productos.length === 0}
              >
                <option className="dark:text-black/90" value={0} disabled>
                  {loadingProductos ? "Cargando productos..." : "Selecciona un producto"}
                </option>
                {productos.map((producto) => (
                  <option className="dark:text-black/90" key={producto.id_inventario} value={producto.id_inventario}>
                    {producto.nombre_producto} - stock: {producto.cantidad} {producto.simbolo || ""} {producto.sublote ? `- Lote: ${producto.sublote}` : ""} {producto.fecha_vencimiento ? `- Vence: ${producto.fecha_vencimiento.slice(0, 10)}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidad de medida <span className="text-error-500">*</span>
              </label>
              <select
                value={productoForm.unid_medida_id}
                onChange={handleProductoChange("unid_medida_id")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                disabled={loadingMedidas || medidas.length === 0}
              >
                <option className="dark:text-black/90" value={0} disabled>
                  {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                </option>
                {medidas.map((medida) => (
                  <option className="dark:text-black/90" key={medida.id_unidad} value={medida.id_unidad}>
                    {medida.simbolo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cantidad <span className="text-error-500">*</span>
              </label>
              <input
                min={0}
                step="any"
                value={productoForm.cantidad}
                onChange={handleProductoChange("cantidad")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cantidad no vendida
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={productoForm.cant_no_vendida}
                onChange={handleProductoChange("cant_no_vendida")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                placeholder="0"
                disabled={productoForm.vendio_todo}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observación de este producto
              </label>
              <textarea
                value={productoForm.observacion}
                onChange={(event) =>
                  setProductoForm((current) => ({
                    ...current,
                    observacion: event.target.value,
                  }))
                }
                className="min-h-20 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                maxLength={255}
                placeholder="Observaciones opcionales"
              />
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={productoForm.vendio_todo}
                  onChange={(event) =>
                    setProductoForm((current) => ({
                      ...current,
                      vendio_todo: event.target.checked,
                      cant_no_vendida: event.target.checked ? 0 : current.cant_no_vendida,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Vendió todo
              </label>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddProducto}
              className="inline-flex items-center justify-center rounded-lg border border-green-600 px-5 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-500/10"
            >
              + Agregar producto a la lista
            </button>
          </div>

          {/* Lista de productos ya agregados */}
          {items.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                Productos agregados ({items.length})
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Cantidad</th>
                      <th className="px-4 py-3">Vendió todo</th>
                      <th className="px-4 py-3">No vendida</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.clientId} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-3 text-gray-800 dark:text-white/90">{item.nombre_producto}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {item.cantidad} {item.simbolo_medida}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.vendio_todo ? "Sí" : "No"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {item.vendio_todo ? "-" : item.cant_no_vendida}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.clientId)}
                            className="text-xs font-medium text-error-600 hover:underline dark:text-error-400"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              {success}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Guardando..." : `Guardar comercialización (${items.length})`}
            </button>
            <Link
              to="/comercializaciones"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
