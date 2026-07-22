import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router";
import { getModuloPorRuta } from "@/config/rutasModulos";

type Accion = "seleccionar" | "insertar" | "actualizar" | "borrar";

type Props = {
  accion: Accion;
  modulo?: string;
  children: ReactNode;
};

export function ConPermiso({ accion, modulo, children }: Props) {
  const { tienePermiso } = useAuth();
  const location = useLocation();

  const moduloFinal = modulo ?? getModuloPorRuta(location.pathname);
  if (!moduloFinal || !tienePermiso(moduloFinal, accion)) return null;

  return <>{children}</>;
}