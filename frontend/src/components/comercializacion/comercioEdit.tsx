import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "@/components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type ComercializacionFormState = {
  producto_id: number;
  lote_id: number;
  fecha_comercializacion: string;
  cantidad: number;
  unid_medida_id: number;
  lugar_comercializacion: string;
  observacion: string;
  vendio_todo: boolean;
  cant_no_vendida: number;
};

type ProductoOption = {
  id_inventario: number;
  nombre_producto: string;
  cantidad: number;
  simbolo?: string;
  lote_id?: number;
  sublote?: string;
};

type MedidaOption = {
  id_unidad: number;
  simbolo: string;
};

type LoteOption = {
  id_lote: number;
  sublote: string;
};

type ComercializacionDetail = {
  id_comercializacion: number;
  producto_id: number;
  lote_id: number;
  fecha_comercializacion: string;
  cantidad: number;
  unid_medida_id: number;
  lugar_comercializacion?: string | null;
  observacion?: string | null;
  vendio_todo: boolean;
  cant_no_vendida?: number | null;
  cant_convertida?: number | null;
  nombre_producto?: string | null;
  simbolo?: string | null;
};

const getLocalISODate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10); // "2026-08-11"
};

const toDateValue = (value?: string | null) => {
  if (!value) return getLocalISODate();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getLocalISODate();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

const initialState: ComercializacionFormState = {
  producto_id: 0,
  lote_id: 0,
  fecha_comercializacion: getLocalISODate(),
  cantidad: 0,
  unid_medida_id: 0,
  lugar_comercializacion: "",
  observacion: "",
  vendio_todo: true,
  cant_no_vendida: 0,
};

export default function ComercioEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id_comercializacion;

  const [form, setForm] = useState<ComercializacionFormState>(initialState);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [medidas, setMedidas] = useState<MedidaOption[]>([]);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [record, setRecord] = useState<ComercializacionDetail | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/signin");
    }
  }, [navigate]);

  useEffect(() => {
    if (!id) {
      setError("No se encontró el identificador de la comercialización");
      return;
    }

    let mounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setLoadingProductos(true);
      setLoadingMedidas(true);
      setLoadingLotes(true);
      setError(null);

      try {
        const [comercioData, productosData, medidasData, lotesData] = await Promise.all([
          apiFetch(`comercio/by-id?id=${id}`),
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

        const loteList = Array.isArray(lotesData?.lotes)
          ? lotesData.lotes
          : Array.isArray(lotesData?.lotes_prod)
            ? lotesData.lotes_prod
            : Array.isArray(lotesData)
              ? lotesData
              : [];

        const lotesPorId = new Map(loteList.map((lote: LoteOption) => [lote.id_lote, lote.sublote]));
        const productosConLote = productoList.map((producto: ProductoOption) => ({
          ...producto,
          sublote: producto.sublote || (producto.lote_id ? lotesPorId.get(producto.lote_id) || "" : ""),
        }));

        setProductos(productosConLote);
        setMedidas(medidaList);
        setLotes(loteList);
        setRecord(comercioData);
        setForm({
          producto_id: Number(comercioData?.producto_id ?? 0),
          lote_id: Number(comercioData?.lote_id ?? 0),
          fecha_comercializacion: toDateValue(comercioData?.fecha_comercializacion),
          cantidad: Number(comercioData?.cantidad ?? 0),
          unid_medida_id: Number(comercioData?.unid_medida_id ?? 0),
          lugar_comercializacion: comercioData?.lugar_comercializacion ?? "",
          observacion: comercioData?.observacion ?? "",
          vendio_todo: Boolean(comercioData?.vendio_todo),
          cant_no_vendida: Number(comercioData?.cant_no_vendida ?? 0),
        });
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.detail || requestError?.message || "No se pudo cargar la comercialización");
      } finally {
        if (mounted) {
          setLoadingData(false);
          setLoadingProductos(false);
          setLoadingMedidas(false);
          setLoadingLotes(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleChange =
    (field: keyof ComercializacionFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      if (field === "producto_id" || field === "cantidad" || field === "unid_medida_id" || field === "cant_no_vendida") {
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

  // Al cambiar de producto, sincroniza automáticamente el lote_id con el del producto seleccionado
  const handleProductoSeleccionado = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const productoId = Number(event.target.value);
    const productoSeleccionado = productos.find((producto) => producto.id_inventario === productoId);

    setForm((current) => ({
      ...current,
      producto_id: productoId,
      lote_id: productoSeleccionado?.lote_id ?? current.lote_id,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      setError("No se encontró el identificador de la comercialización");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const cantidadValue = Number(form.cantidad);

    if (Number.isNaN(cantidadValue) || cantidadValue <= 0) {
      setError("La cantidad debe ser un número mayor a 0");
      setSaving(false);
      return;
    }

    if (!form.producto_id) {
      setError("Debe seleccionar un producto de producción");
      setSaving(false);
      return;
    }

    if (!form.unid_medida_id) {
      setError("Debe seleccionar una unidad de medida");
      setSaving(false);
      return;
    }

    if (!form.vendio_todo && Number(form.cant_no_vendida) < 0) {
      setError("La cantidad no vendida no puede ser negativa");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        producto_id: Number(form.producto_id),
        lote_id: Number(form.lote_id),
        fecha_comercializacion: form.fecha_comercializacion,
        cantidad: cantidadValue,
        unid_medida_id: Number(form.unid_medida_id),
        lugar_comercializacion: form.lugar_comercializacion.trim() || null,
        observacion: form.observacion.trim() || null,
        vendio_todo: form.vendio_todo,
        cant_no_vendida: form.vendio_todo ? 0 : Number(form.cant_no_vendida || 0),
      };

      const data = await apiFetch(`comercio/update/comercializacion/${id}`, {
        method: "PUT",
        body: payload,
      });

      setSuccess(data?.message || "Comercialización actualizada correctamente");
      setTimeout(() => navigate("/comercializaciones"), 800);
    } catch (requestError: any) {
      setError(requestError?.detail || requestError?.message || "Ocurrió un error al actualizar la comercialización");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Editar comercialización | Inventario Lembo" description="Formulario para editar una comercialización" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar comercialización</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ajusta los datos de la comercialización registrada.
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
          {loadingData ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando comercialización...</div>
          ) : error ? (
            <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Producto <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.producto_id}
                    onChange={handleProductoSeleccionado}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                    disabled={loadingProductos || (productos.length === 0 && !record)}
                  >
                    <option className="dark:text-black/90" value={0} disabled>
                      {loadingProductos ? "Cargando productos..." : "Selecciona un producto"}
                    </option>
                    {record && !productos.some((producto) => producto.id_inventario === form.producto_id) && form.producto_id > 0 && (
                      <option className="dark:text-black/90" value={form.producto_id}>
                        {record.nombre_producto || "Producto actual"}
                      </option>
                    )}
                    {productos.map((producto) => (
                      <option className="dark:text-black/90" key={producto.id_inventario} value={producto.id_inventario}>
                        {producto.nombre_producto} - stock: {producto.cantidad} {producto.simbolo || ""} {producto.sublote ? `(${producto.sublote})` : ""}
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
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                    disabled={loadingMedidas || (medidas.length === 0 && !record)}
                  >
                    <option className="dark:text-black/90" value={0} disabled>
                      {loadingMedidas ? "Cargando unidades..." : "Selecciona una unidad de medida"}
                    </option>
                    {record && !medidas.some((medida) => medida.id_unidad === form.unid_medida_id) && form.unid_medida_id > 0 && (
                      <option className="dark:text-black/90" value={form.unid_medida_id}>
                        {record.simbolo || "Unidad asignada"}
                      </option>
                    )}
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
                    value={form.cantidad}
                    onChange={handleChange("cantidad")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de comercialización <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.fecha_comercializacion}
                    onChange={handleChange("fecha_comercializacion")}
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
                    value={form.lugar_comercializacion}
                    onChange={handleChange("lugar_comercializacion")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    maxLength={50}
                    placeholder="Tienda, feria, cliente..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado de venta
                  </label>
                  <div className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:gap-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.vendio_todo}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          vendio_todo: !current.vendio_todo,
                          cant_no_vendida: !current.vendio_todo ? 0 : current.cant_no_vendida,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        form.vendio_todo ? "bg-green-600" : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.vendio_todo ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {form.vendio_todo ? "Vendió todo" : "No vendió todo"}
                    </span>

                    {!form.vendio_todo && (
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="cant_no_vendida">
                          Cantidad no vendida
                        </label>
                        <input
                          id="cant_no_vendida"
                          min={0}
                          step="any"
                          value={form.cant_no_vendida}
                          onChange={handleChange("cant_no_vendida")}
                          className="h-10 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observación
                  </label>
                  <textarea
                    value={form.observacion}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        observacion: event.target.value,
                      }))
                    }
                    className="min-h-28 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-gray-300 focus:ring-gray-500 dark:border-gray-700 dark:text-white/90 dark:focus:border-gray-800"
                    maxLength={255}
                    placeholder="Observaciones opcionales"
                  />
                </div>
              </div>

              {success && (
                <div className="mt-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                  {success}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Actualizar comercialización"}
                </button>
                <Link
                  to="/comercializaciones"
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
