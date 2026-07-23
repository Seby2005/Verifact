import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/AuthForm/RegisterForm';

export const metadata: Metadata = {
  title: 'Creează cont gratuit — FactCheck AI',
  description: 'Creează un cont gratuit pe FactCheck AI pentru a verifica știrile.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
