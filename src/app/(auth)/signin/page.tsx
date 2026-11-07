import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function Signin() {
  return <AuthCard mode="signin" />;
}
