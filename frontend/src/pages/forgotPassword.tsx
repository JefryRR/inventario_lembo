import { useState } from "react";
import { Link, useNavigate } from "react-router";
// @ts-ignore: api helper is a JS module without generated declarations
import { apiFetch } from "@/services/api";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Debe ingresar su correo electrónico");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("access/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSent(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col flex-1 mt-40">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Correo enviado
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si el correo existe, recibirás un enlace en breve. Revisa tu bandeja.
              Serás redirigido al inicio de sesión en unos segundos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 mt-40">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label>
                Correo electrónico <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="info@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-center text-error-500">{error}</div>
            )}

            <div>
              <Button
                className="w-full"
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </div>

            <div className="text-center">
              <Link
                to="/signin"
                className="text-sm text-gray-500 hover:text-gray-600 dark:text-gray-400"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}