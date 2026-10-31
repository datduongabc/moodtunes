import { supabase } from '@/core/supabase';
import { AuthForm } from '@/presentation/components/AuthForm';

/** SCR-02 Sign in (FR-01). */
export default function SignIn() {
  return (
    <AuthForm
      kind="signIn"
      onSubmit={async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (!error) return null;
        if (error.status === 400 || error.code === 'invalid_credentials')
          return { message: 'Incorrect email or password' };
        return { message: "Couldn't sign in. Check your connection and try again" };
      }}
    />
  );
}
