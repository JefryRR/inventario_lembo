import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router";
import { getModuloPorRuta } from "@/config/rutasModulos";

// Definimos los tipos de acción permitidos para el componente ConPermiso, 
// nos permite saber que tipo de permiso se requiere para renderizar el contenido según el rol del usuario y el módulo.
type Accion = "seleccionar" | "insertar" | "actualizar" | "borrar";

// Definimos las propiedades que recibirá el componente ConPermiso
type Props = {
  accion: Accion;
  modulo?: string;
  children: ReactNode;
};

// Componente que renderiza su contenido solo si el usuario tiene el permiso requerido para la acción y módulo especificados
export function ConPermiso({ accion, modulo, children }: Props) {
  const { tienePermiso } = useAuth();
  const location = useLocation();

  // Si no se especifica un módulo, se obtiene automáticamente a partir de la ruta actual
  const moduloFinal = modulo ?? getModuloPorRuta(location.pathname);
  if (!moduloFinal || !tienePermiso(moduloFinal, accion)) return null;

  return <>{children}</>;
}