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
import Categorias from "./pages/categorias";
import CategoriasCreate from "./components/categorias/categoriasCreate";
import CategoriasEdit from "./components/categorias/categoriasEdit";
import Especies from "./pages/especies";
import EspeciesCreate from "./components/especies/especiesCreate";
import EspeciesEdit from "./components/especies/especiesEdit";
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
            <Route path="/roles" element={<Roles />} />
            <Route path="/roles/crear" element={<RolesCreate />} />
            <Route path="/roles/editar/:id_rol" element={<RolesEdit />} />
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
