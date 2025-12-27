import { Redirect } from 'expo-router';

export default function Index() {
  // Simplemente redirige a la ruta de tu archivo login.tsx
  return <Redirect href="/Login/login" />;
}