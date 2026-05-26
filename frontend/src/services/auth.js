const API_URL = "http://localhost:8000";

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

    const detail = errData?.detail || errData?.message || "Usuario o contraseña no validos";
    throw new Error(detail);
  }

  return response.json();
}