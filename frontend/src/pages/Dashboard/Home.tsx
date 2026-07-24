import EcommerceMetrics from "@/components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import PageMeta from "@/components/common/PageMeta";
import { useAuth } from "@/context/AuthContext";

// Componente principal de la página de inicio del dashboard
export default function Home() {
  const { tienePermiso } = useAuth();

  // Verifica si el usuario tiene permisos para ver las secciones de ventas y producción
  const puedeVerVentas = tienePermiso("Ventas", "seleccionar");
  const puedeVerProduccion = tienePermiso("Inventario de producción", "seleccionar");

  // Determina si el usuario tiene acceso a alguna de las secciones
  const tieneAlgunAcceso = puedeVerVentas || puedeVerProduccion ;

  // Renderiza un mensaje de bienvenida si el usuario no tiene acceso a ninguna sección
  if (!tieneAlgunAcceso) {
    return (
      <>
        <PageMeta
          title="Inventario Lembo"
          description="Software de gestión de inventarios para la sede El Lembo del SENA"
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200">
            Bienvenido al Inventario de la granja El Lembo
          </h2>
        </div>
      </>
    );
  }

  // Renderiza las métricas y gráficos si el usuario tiene acceso a alguna sección
  if (tieneAlgunAcceso) {
    return (
    <>
      <PageMeta
        title="Inventario Lembo"
        description="Software de gestión de inventarios para la sede El Lembo del SENA"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-12">
            <EcommerceMetrics />
            <MonthlySalesChart />
          </div>

          <div className="col-span-12 xl:col-span-12">
            <RecentOrders />
          </div>

          <div className="col-span-12">
            <StatisticsChart />
          </div>
      </div>
    </>
    );
  }
}