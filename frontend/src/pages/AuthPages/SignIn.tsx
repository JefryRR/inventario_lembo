import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Inventario Lembo"
        description="Esto es un inventario para la sede El Lembo del SENA"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
