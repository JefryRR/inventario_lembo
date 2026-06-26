import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import esLocale from '@fullcalendar/core/locales/es';
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

type TipoComida = "desayuno" | "almuerzo" | "refrigerio";

interface Plato {
  id_plato: number;
  nombre_plato: string;
  estado: boolean;
}

interface ProgramacionOut {
  id_programacion: number;
  plato_id: number;
  nombre_plato: string;
  tipo_comida: TipoComida;
  cant_personas: number;
  horario_visita: string;
  fecha_programacion: string;
}

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    programacion?: ProgramacionOut;
  };
}

const TIPO_COMIDA_COLOR: Record<TipoComida, string> = {
  desayuno: "Primary",
  almuerzo: "Success",
  refrigerio: "Warning",
};

function programacionToEvent(p: ProgramacionOut): CalendarEvent {
  return {
    id: p.id_programacion.toString(),
    title: `${p.nombre_plato} · ${p.cant_personas} pers.`,
    start: p.fecha_programacion,
    allDay: true,
    extendedProps: {
      calendar: TIPO_COMIDA_COLOR[p.tipo_comida] ?? "Primary",
      programacion: p,
    },
  };
}

const FORM_EMPTY = {
  plato_id: 0,
  tipo_comida: "" as TipoComida | "",
  cant_personas: 1,
  horario_visita: "",
  fecha_programacion: "",
};

const CalendarProgramacion: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    cargarProgramaciones();
    cargarPlatos();
  }, []);

  async function cargarProgramaciones() {
    try {
      const data: ProgramacionOut[] = await apiFetch("prog_platos/all-prog_platos");
      setEvents(data.map(programacionToEvent));
    } catch {
      setError("No se pudieron cargar las programaciones.");
    }
  }

  async function cargarPlatos() {
    try {
      const data: Plato[] = await apiFetch("platos/all-platos");
      setPlatos(data.filter((p) => p.estado === true));
    } catch {
      setError("No se pudieron cargar los platos.");
    }
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedId(null);
    setForm({ ...FORM_EMPTY, fecha_programacion: selectInfo.startStr });
    setError(null);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const prog = clickInfo.event.extendedProps.programacion as ProgramacionOut;
    setSelectedId(prog.id_programacion);
    setForm({
      plato_id: prog.plato_id,
      tipo_comida: prog.tipo_comida,
      cant_personas: prog.cant_personas,
      horario_visita: prog.horario_visita,
      fecha_programacion: prog.fecha_programacion,
    });
    setError(null);
    openModal();
  };

  const handleGuardar = async () => {
    if (!form.plato_id || !form.tipo_comida || !form.fecha_programacion || !form.horario_visita) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (selectedId === null) {
        // Crear — el backend devuelve el objeto completo
        const nueva: ProgramacionOut = await apiFetch("prog_platos/crear", {
          method: "POST",
          body: {
            plato_id: form.plato_id,
            tipo_comida: form.tipo_comida,
            cant_personas: form.cant_personas,
            horario_visita: form.horario_visita,
            fecha_programacion: form.fecha_programacion,
          },
        });
        setEvents((prev) => [...prev, programacionToEvent(nueva)]);
      } else {
        // Actualizar — el backend solo devuelve un mensaje,
        // así que construimos el objeto nosotros con los datos del formulario
        await apiFetch(`prog_platos/by_id/${selectedId}`, {
          method: "PUT",
          body: {
            plato_id: form.plato_id,
            tipo_comida: form.tipo_comida,
            cant_personas: form.cant_personas,
            horario_visita: form.horario_visita,
            fecha_programacion: form.fecha_programacion,
          },
        });

        // Buscamos el nombre del plato en la lista que ya cargamos al inicio
        const platoSeleccionado = platos.find((p) => p.id_plato === form.plato_id);

        const actualizada: ProgramacionOut = {
          id_programacion: selectedId,
          plato_id: form.plato_id,
          nombre_plato: platoSeleccionado?.nombre_plato ?? "",
          tipo_comida: form.tipo_comida as TipoComida,
          cant_personas: form.cant_personas,
          horario_visita: form.horario_visita,
          fecha_programacion: form.fecha_programacion,
        };

        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === selectedId.toString()
              ? programacionToEvent(actualizada)
              : ev
          )
        );
      }
      handleCerrar();
    } catch (err: any) {
      console.error("Error completo:", err);
      setError(err?.message || JSON.stringify(err) || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const handleEliminar = async () => {
    if (selectedId === null) return;

    setLoading(true);
    try {
      await apiFetch(`prog_platos/by_id/${selectedId}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((ev) => ev.id !== selectedId.toString()));
      handleCerrar();
    } catch {
      setError("Error al eliminar. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setConfirmandoEliminar(false);
    }
  };

  const handleCerrar = () => {
    closeModal();
    setSelectedId(null);
    setForm(FORM_EMPTY);
    setError(null);
    setConfirmandoEliminar(false);
  };

  return (
    <>
      <PageMeta
        title="Programación de Platos"
        description="Calendario de programación de platos por fecha"
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            customButtons={{
              addEventButton: {
                text: "Nueva programación +",
                click: () => {
                  setSelectedId(null);
                  setForm(FORM_EMPTY);
                  setError(null);
                  openModal();
                },
              },
            }}
          />
        </div>

        <Modal
          isOpen={isOpen}
          onClose={handleCerrar}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            {/* Cabecera */}
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedId ? "Editar programación" : "Nueva programación"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedId
                  ? "Modifica los datos de esta programación."
                  : "Registra un plato para una fecha específica."}
              </p>
            </div>

            {/* Error global */}
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Plato */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Plato <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.plato_id || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, plato_id: Number(e.target.value) }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Selecciona un plato</option>
                  {platos.map((p) => (
                    <option key={p.id_plato} value={p.id_plato}>
                      {p.nombre_plato}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de comida */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Tipo de comida <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipo_comida}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tipo_comida: e.target.value as TipoComida,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Selecciona el tipo</option>
                  <option value="desayuno">Desayuno</option>
                  <option value="almuerzo">Almuerzo</option>
                  <option value="refrigerio">Refrigerio</option>
                </select>
              </div>

              {/* Cantidad de personas */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Cantidad de personas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.cant_personas}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cant_personas: Math.max(1, Number(e.target.value)),
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Horario de visita */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Horario de visita <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.horario_visita}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, horario_visita: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha_programacion}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fecha_programacion: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            {/* Leyenda de colores */}
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                Desayuno
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"></span>
                Almuerzo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
                Refrigerio
              </span>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex items-center gap-3 sm:justify-end">
              {confirmandoEliminar ? (
                <>
                  <p className="mr-auto text-sm text-gray-600 dark:text-gray-400">
                    ¿Seguro que deseas eliminar esta programación?
                  </p>
                  <button
                    onClick={() => setConfirmandoEliminar(false)}
                    disabled={loading}
                    type="button"
                    className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminar}
                    disabled={loading}
                    type="button"
                    className="flex w-full justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                </>
              ) : (
                <>
                  {selectedId && (
                    <button
                      onClick={() => setConfirmandoEliminar(true)}
                      disabled={loading}
                      type="button"
                      className="flex w-full justify-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-transparent dark:text-red-400 sm:w-auto"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={handleCerrar}
                    disabled={loading}
                    type="button"
                    className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={loading}
                    type="button"
                    className="flex w-full justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? "Guardando..." : selectedId ? "Guardar cambios" : "Crear programación"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default CalendarProgramacion;
