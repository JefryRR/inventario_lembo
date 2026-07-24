// Definición de la URL base de la API
const API_URL = "http://localhost:8000";

// Función para normalizar los detalles de error recibidos desde la API
function normalizeErrorDetail(errData) {
  const detail = errData?.detail ?? errData?.message;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object") {
      return first.msg || first.message || "Datos de acceso invalidos";
    }
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || "Datos de acceso invalidos";
  }

  return "Usuario o contraseña no validos";
}

//Enviar el usuario y contraseña 
export async function login(username, password) {
  //crea un nuevo body con el tipo de cuerpo que fastApi pueda leerlo.
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  //se ejecuta la ruta donde se va ha enviar los datos para validar con el formato fastApi
  const response = await fetch(`${API_URL}/access/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });
  // Si la respuesta no es OK intentamos leer el detalle enviado por el backend
  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (e) {
      // ignore JSON parse errors
    }

    throw new Error(normalizeErrorDetail(errData));
  }

  return response.json();
}