import { supabase } from '@/core/supabase';
import { AuthForm } from '@/presentation/components/AuthForm';

/** SCR-03 Sign up (AC-01.1.1, AC-01.1.2). */
export default function SignUp() {
  return (
    <AuthForm
      kind="signUp"
      onSubmit={async ({ email, password }) => {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        // with email enumeration protection, an existing address returns a user without identities
        if (error?.code === 'user_already_exists' || (data.user && data.user.identities?.length === 0)) {
          return { field: 'email', message: 'An account with this email already exists' };
        }
        if (error) return { field: 'email', message: error.message };
        return null;
      }}
    />
  );
}
