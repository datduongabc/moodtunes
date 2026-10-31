import { Stack } from 'expo-router';
import { color } from '@/presentation/theme/tokens';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }} />;
}
