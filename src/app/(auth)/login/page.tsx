import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/AuthForm/LoginForm';

export const metadata: Metadata = {
  title: 'Intră în cont — FactCheck AI',
  description: 'Autentifică-te în contul tău FactCheck AI',
};

export default function LoginPage() {
  return <LoginForm />;
}
