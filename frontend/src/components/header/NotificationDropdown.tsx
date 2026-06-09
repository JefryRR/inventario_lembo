import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type ProduccionAlert = {
  id_inventario: number;
  nombre_producto: string;
  nombre_lote: string;
  fecha_vencimiento: string;
};

type InsumoAlert = {
  id_insumo: number;
  nombre_producto: string;
  fecha_vencimiento: string;
};

type AlertCard = {
  id: number;
  title: string;
  subtitle: string;
  daysLeft: number;
  dateLabel: string;
  origen: "produccion" | "insumo";
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(false);// El estado acepta ambos tipos
  const [alerts, setAlerts] = useState<((ProduccionAlert & { origen: "produccion" }) | (InsumoAlert & { origen: "insumo" }))[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAlerts = async () => {
      setLoadingAlerts(true);
      setAlertsError(null);

      try {
        const data = await apiFetch("inv_produccion/all/produccion");
        if (!mounted) return;

        const dataInsumo = await apiFetch("inv_insumos/all_insumos");
        if (!mounted) return;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.produccion)
            ? data.produccion
            : [];

        const insumosList = Array.isArray(dataInsumo)
          ? dataInsumo
          : Array.isArray(dataInsumo?.insumos)
            ? dataInsumo.insumos
            : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limit = new Date(today);
        limit.setDate(limit.getDate() + 30);

        const filtrarPorVencimiento = (items: any[]) =>
          items.filter((item) => {
            const expiryDate = new Date(item.fecha_vencimiento);
            if (Number.isNaN(expiryDate.getTime())) return false;
            expiryDate.setHours(0, 0, 0, 0);
            return expiryDate >= today && expiryDate <= limit;
          });

        const produccionFiltrada = filtrarPorVencimiento(list).map((item: ProduccionAlert) => ({
          ...item,
          origen: "produccion" as const,
        }));

        const insumosFiltrados = filtrarPorVencimiento(insumosList).map((item: InsumoAlert) => ({
          ...item,
          origen: "insumo" as const,
        }));

        const filteredAlerts = [...produccionFiltrada, ...insumosFiltrados].sort(
          (a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
        );

        setAlerts(filteredAlerts);
        setNotifying(filteredAlerts.length > 0);

      } catch (error: any) {
        if (!mounted) return;
        setAlertsError(error?.detail || error?.message || "No se pudieron cargar las alertas");
      } finally {
        if (mounted) setLoadingAlerts(false);
      }
    };

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  const notificationItems: AlertCard[] = alerts.map((item) => {
    const expiryDate = new Date(item.fecha_vencimiento);
    expiryDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysLeft = Math.max(
      0,
      Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: item.origen === "produccion" ? item.id_inventario : item.id_insumo,
      title: item.nombre_producto,
      subtitle: item.origen === "produccion"
        ? (item as ProduccionAlert).nombre_lote || "Inventario de producción"
        : "Inventario de insumos",         // 👈 etiqueta para insumos
      daysLeft,
      dateLabel: expiryDate.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      origen: item.origen,
    };
  });

  const handleClick = () => {
    setIsOpen((current) => !current);
    setNotifying(false);
  };

  return (
    <div className="relative">
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${notifying ? "flex" : "hidden"
            }`}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notificaciones
          </h5>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {loadingAlerts ? (
            <li className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Cargando alertas...</li>
          ) : alertsError ? (
            <li className="px-4 py-6 text-sm text-error-500">{alertsError}</li>
          ) : notificationItems.length === 0 ? (
            <li className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
              No hay productos por vencer en los próximos 30 días.
            </li>
          ) : (
            notificationItems.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  onItemClick={() => setIsOpen(false)}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                  to={item.origen === "produccion" ? "/invProd" : "/invInsumo"}
                >
                  <span className="relative block h-10 w-full max-w-10 rounded-full z-1">
                    <img
                      width={40}
                      height={40}
                      src="/images/error/warning.svg"
                      alt="Alerta de vencimiento"
                      className="w-full overflow-hidden rounded-full"
                    />
                    <span className="absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white bg-orange-400 dark:border-gray-900"></span>
                  </span>

                  <span className="block">
                    <span className="mb-1.5 block space-x-1 text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.title}</span>
                      <span>vence en</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {item.daysLeft} día{item.daysLeft === 1 ? "" : "s"}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                      <span>{item.subtitle}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                      <span>Vence {item.dateLabel}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        <div className="mt-3 flex gap-2">
          <Link
            to="/invProd"
            className="flex-1 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Producción
          </Link>
          <Link
            to="/invInsumo"
            className="flex-1 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Insumos
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}