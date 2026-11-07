import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function Signup() {
  return <AuthCard mode="signup" />;
}
