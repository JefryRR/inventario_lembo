// URL base del backend usada por todas las peticiones del frontend.
const api_backend = "http://localhost:8000";

// validar si el usuario exite y la contraseña coincide
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

//estructura para enviar los datos al fastApi para ser leidos

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // SOLO agregar JSON si NO es FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Configuración de la petición
  const config = {
    method: options.method || "GET",
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body
      ? JSON.stringify(options.body)
      : undefined
  };


  //url dinámica para ejecutar la vista principal del usuario
  const response = await fetch(`${api_backend}/${endpoint}`, config);

  // Guardar el nuevo token si el backend lo envía en la cabecera
  const nuevo_token = response.headers.get("X-New-Token");
  if (nuevo_token) {
    localStorage.setItem("token", nuevo_token);
  }
  
  //validación de errores 
  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: "Error en la solicitud" };
    }

    // Solo cerrar sesion cuando el 401 indique token invalido/expirado.
    if (response.status === 401) {
      const detail = typeof errorData?.detail === "string" ? errorData.detail.toLowerCase() : "";
      const tokenErrorHints = [
        "token invalido",
        "invalid token",
        "not authenticated",
        "could not validate credentials",
        "token expired",
      ];

      if (tokenErrorHints.some((hint) => detail.includes(hint))) {
        localStorage.removeItem("token");
        window.location.href = "/signin";
      }
    }

    throw {
      status: response.status,
      ...errorData,
    };
  }
  return response.json();
}

// Cerrar sesión eliminando el token y redirigiendo al inicio de sesión
export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/signin";
}


// Función para descargar archivos desde el backend
export async function apiDownload(endpoint, nombreArchivo) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${api_backend}/${endpoint}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: "Error al descargar el archivo" };
    }
    throw { status: response.status, ...errorData };
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}