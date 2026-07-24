// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";

// Definición de tipos para los permisos y el contexto de autenticación
type Permiso = {
  id_modulo: number;
  modulo: string;
  insertar: boolean;
  actualizar: boolean;
  seleccionar: boolean;
  borrar: boolean;
};

// Definición de tipos para el contexto de autenticación
type AuthContextType = {
  permisos: Permiso[];
  tienePermiso: (modulo: string, accion?: "insertar" | "actualizar" | "seleccionar" | "borrar") => boolean;
  cargandoPermisos: boolean;
  refrescarPermisos: () => Promise<Permiso[]>;
};

// Creación del contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);

  // Función para cargar los permisos del usuario desde la API
  const cargarPermisos = async (): Promise<Permiso[]> => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPermisos([]);
      setCargandoPermisos(false);
      return [];
    }
    setCargandoPermisos(true);
    try {
      const data = await apiFetch("permisos/mios");
      setPermisos(data);
      return data;
    } catch (error) {
      console.error("Error cargando permisos:", error);
      setPermisos([]);
      return [];
    } finally {
      setCargandoPermisos(false);
    }
  };

  useEffect(() => {
    cargarPermisos();
  }, []);

  // Función para verificar si el usuario tiene un permiso específico para un módulo y acción
  const tienePermiso = (modulo: string, accion: "insertar" | "actualizar" | "seleccionar" | "borrar" = "seleccionar") => {
    const permiso = permisos.find((p) => p.modulo === modulo);
    return permiso ? permiso[accion] : false;
  };

  return (
    <AuthContext.Provider value={{ permisos, tienePermiso, cargandoPermisos, refrescarPermisos: cargarPermisos }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para acceder al contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}