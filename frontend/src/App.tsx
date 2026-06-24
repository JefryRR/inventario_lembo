import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import Users from "./pages/users";
import Roles from "./pages/roles";
import RolesCreate from "./components/roles/rolesCreate"
import RolesEdit from "./components/roles/rolesEdit";
import UsersCreate from "./components/users/usersCreate";
import UsersEdit from "./components/users/usersEdit";
import Permisos from "./pages/permisos";
import PermisosCreate from "./components/permisos/permisosCreate";
import PermisosEdit from "./components/permisos/permisosEdit";
import Modulos from "./pages/modulos";
import ModulosCreate from "./components/modulos/modulosCreate";
import ModulosEdit from "./components/modulos/modulosEdit";
import InvProduccion from "./pages/inv_produccion";
import InvProdCreate from "./components/inv_produccion/inv_prodCreate";
import InvProdEdit from "./components/inv_produccion/inv_prodEdit";
import InvProdReport from "./components/inv_produccion/informes_prod";
import Categorias from "./pages/categorias";
import CategoriasCreate from "./components/categorias/categoriasCreate";
import CategoriasEdit from "./components/categorias/categoriasEdit";
import Especies from "./pages/especies";
import EspeciesCreate from "./components/especies/especiesCreate";
import EspeciesEdit from "./components/especies/especiesEdit";
import Lotes from "./pages/lotes_prod";
import LotesCreate from "./components/lotes_prod/lotesCreate";
import LotesEdit from "./components/lotes_prod/lotesEdit";
import LoteProdReport from "./components/lotes_prod/InformeLote";
import LotesGranja from "./pages/lotes_g";
import LotesGranjaCreate from "./components/lotes_granja/lotesGranjaCreate";
import LotesGranjaEdit from "./components/lotes_granja/lotesGranjaEdit";
import Mortalidad from "./pages/mortalidad";
import MortalidadCreate from "./components/mortalidad/mortalidadCreate";
import MortalidadEdit from "./components/mortalidad/mortalidadEdit";
import Tratamientos from "./pages/tratamientos";
import TratamientoCreate from "./components/tratamiento/tratamientoCreate";
import TratamientoEdit from "./components/tratamiento/tratamientoEdit";
import Ventas from "./pages/ventas";
import VentasCreate from "./components/ventas/ventasCreate";
import VentasEdit from "./components/ventas/ventasEdit";
import DetalleCreate from "./components/detalle_ventas/detalleCreate";
import DetalleEdit from "./components/detalle_ventas/detalleEdit";
import InvPerdidas from "./pages/inv_perdidas";
import InvPerdCreate from "./components/inv_perdida/inv_perdCreate";
import InvPerdEdit from "./components/inv_perdida/inv_perdEdit";
import Unidades from "./pages/unidad";
import UnidadCreate from "./components/unidad_medida/unidadCreate";
import UnidadEdit from "./components/unidad_medida/unidadEdit";
import TiposInsumos from "./pages/tipo-insumos";
import TipoCreate from "./components/tipo_insumos/tipoCreate";
import TipoEdit from "./components/tipo_insumos/tipoEdit";
import Alimentos from "./pages/alimentos";
import AlimentosCreate from "./components/alimentos/alimentoCreate";
import AlimentosEdit from "./components/alimentos/alimentosEdit";
import Invinsumo from "./pages/inv_insumos";
import InvinsumoCreate from "./components/inv_insumos/inv_insumoCreate" 
import InvinsumoEdit from "./components/inv_insumos/inv_insumoEdit";
import InformeInsumo from "./components/inv_insumos/informes_insumo";
import ResetPassword from "./pages/resetPassword";
import ForgotPassword from "./pages/forgotPassword";
import HistorialVentas from "./pages/historial_ventas";
import Solicitud from "./pages/solicitudes";
import SolicitudCreate from "./components/solicitud/solicitudCreate";
import SolicitudEdit from "./components/solicitud/solicitudEdit";
import Platos from "./pages/platos";
import PlatosCreate from "./components/platos/platosCreate";
import PlatosEdit from "./components/platos/platosEdit";
import Ingredientes from "./pages/ingredientes";
import IngredientesCreate from "./components/ingredientes/ingredienteCreate";
import IngredientesEdit from "./components/ingredientes/ingredienteEdit";
import VentaPlatos from "./pages/ventasPlatos";
import VentaPlatosCreate from "./components/ventas_platos/ventasPlatosCreate";
import VentaPlatosEdit from "./components/ventas_platos/ventasPlatosEdit";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public/Auth Layout */}
          <Route path="/" element={<SignIn />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/resetPassword" element={<ResetPassword />} />

          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Home />} />

            {/* Others Page */}
            <Route path="/users" element={<Users />} />
            <Route path="/users/create" element={<UsersCreate />} />
            <Route path="/users/Edit/:id" element={<UsersEdit />} />
            <Route path="/permisos" element={<Permisos />} />
            <Route path="/permisos/create" element={<PermisosCreate />} />
            <Route path="/permisos/edit/:moduloId/:rolId" element={<PermisosEdit />} />
            <Route path="/modulos" element={<Modulos />} />
            <Route path="/modulos/create" element={<ModulosCreate />} />
            <Route path="/modulos/edit/:id" element={<ModulosEdit />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categorias/crear" element={<CategoriasCreate />} />
            <Route path="/categorias/edit/:id" element={<CategoriasEdit />} />
            <Route path="/especies" element={<Especies />} />
            <Route path="/especies/create" element={<EspeciesCreate />} />
            <Route path="/especies/edit/:id" element={<EspeciesEdit />} />
            <Route path="/platos" element={<Platos />} />
            <Route path="/platos/crear" element={<PlatosCreate />} />
            <Route path="/platos/edit/:id" element={<PlatosEdit />} />
            <Route path="/ingredientes" element={<Ingredientes />} />
            <Route path="/ingredientes/crear" element={<IngredientesCreate />} />
            <Route path="/ingredientes/edit/:id" element={<IngredientesEdit />} />
            <Route path="/lotesProd" element={<Lotes />} />
            <Route path="/lotesProd/create" element={<LotesCreate />} />
            <Route path="/lotesProd/edit/:id" element={<LotesEdit />} />
            <Route path="/lotesProd/report/:id" element={<LoteProdReport />} />
            <Route path="/mortalidad" element={<Mortalidad />} />
            <Route path="/mortalidad/create" element={<MortalidadCreate />} />
            <Route path="/mortalidad/edit/:id" element={<MortalidadEdit />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/roles/crear" element={<RolesCreate />} />
            <Route path="/roles/editar/:id_rol" element={<RolesEdit />} />
            <Route path="/tratamientos" element={<Tratamientos />} />
            <Route path="/tratamientos/create" element={<TratamientoCreate />} />
            <Route path="/tratamientos/edit/:id" element={<TratamientoEdit />} />
            <Route path="/invProd" element={<InvProduccion />} />
            <Route path="/invProd/create" element={<InvProdCreate />} />
            <Route path="/invProd/edit/:id_inventario" element={<InvProdEdit />} />
            <Route path="/invProd/report/:id_inventario" element={<InvProdReport />} />
            <Route path="/invPerd" element={<InvPerdidas />} />
            <Route path="/invPerd/create" element={<InvPerdCreate />} />
            <Route path="/invPerd/edit/:id" element={<InvPerdEdit />} />
            <Route path="/lotesGranja" element={<LotesGranja />} />
            <Route path="/lotesGranja/create" element={<LotesGranjaCreate />} />
            <Route path="/lotesGranja/edit/:id_lote_g" element={<LotesGranjaEdit />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/ventas/historial" element={<HistorialVentas />} />
            <Route path="/unidades" element={<Unidades />} />
            <Route path="/unidades/crear" element={<UnidadCreate />} />
            <Route path="/unidades/edit/:id" element={<UnidadEdit />} />
            <Route path="/ventas" element={< Ventas />} />
            <Route path="/ventas/create" element={<VentasCreate />} />
            <Route path="/ventas/edit/:id" element={<VentasEdit />} />
            <Route path="/venta_platos" element={<VentaPlatos />} />
            <Route path="/venta_platos/crear" element={<VentaPlatosCreate />} />
            <Route path="/venta_platos/edit/:id" element={<VentaPlatosEdit />} />
            <Route path="/detalle-ventas/create" element={< DetalleCreate />} />
            <Route path="/detalle-ventas/edit/:id" element={< DetalleEdit />} />
            <Route path="/tipos-insumos" element={<TiposInsumos />} />
            <Route path="/tipos-insumos/crear" element={<TipoCreate />} />
            <Route path="/tipos-insumos/edit/:id" element={<TipoEdit />} />
            <Route path="/alimentos" element={<Alimentos />} />
            <Route path="/alimentos/create" element={<AlimentosCreate />} />
            <Route path="/alimentos/edit/:id" element={<AlimentosEdit />} />
            <Route path="/invInsumo/edit/:id_insumo" element={<InvinsumoEdit />} />
            <Route path="/invInsumo" element={<Invinsumo />} />
            <Route path="/invInsumo/create" element={<InvinsumoCreate />} />
            <Route path="/invInsumo/report/:id_insumo" element={<InformeInsumo />} />
            <Route path="/solicitud" element={<Solicitud />} />
            <Route path="/solicitud/crear" element={<SolicitudCreate />} />
            <Route path="/solicitud/edit/:id" element={<SolicitudEdit />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
