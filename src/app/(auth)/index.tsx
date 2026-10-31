import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store';

/** First launch shows onboarding; later launches open Sign in. */
export default function AuthIndex() {
  const onboarded = useAppSelector((s) => s.ui.onboarded);
  return <Redirect href={onboarded ? '/sign-in' : '/onboarding'} />;
}
