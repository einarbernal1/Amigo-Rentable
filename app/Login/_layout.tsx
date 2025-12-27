import { Stack } from 'expo-router';

export default function LoginLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Solo definimos los archivos que viven en esta carpeta */}
      <Stack.Screen name="login" />
      <Stack.Screen name="registro_usuarios" />
    </Stack>
  );
}