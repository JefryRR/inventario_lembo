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
//Condición donde si los datos no coinciden, retorna el mensaje
  if (!response.ok) {
    throw new Error("Usuario o contraseña no validos");
  }

  return response.json();
}