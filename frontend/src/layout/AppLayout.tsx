import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation, Navigate } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../context/AuthContext";
import { getModuloPorRuta } from "../config/rutasModulos";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { tienePermiso, cargandoPermisos } = useAuth();
  const location = useLocation();

  const modulo = getModuloPorRuta(location.pathname);
  const sinPermiso = !cargandoPermisos && modulo && !tienePermiso(modulo, "seleccionar");

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
          {cargandoPermisos ? (
            <p>Cargando...</p>
          ) : sinPermiso ? (
            <Navigate to="/no-autorizado" replace />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;