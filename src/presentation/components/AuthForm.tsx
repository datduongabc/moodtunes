import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { z } from 'zod';
import { MoodArt } from './MoodArt';
import { Screen } from './Screen';
import { Txt } from './Txt';
import { space } from '../theme/tokens';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Use 8 or more characters'),
});
export type Credentials = z.infer<typeof schema>;

/** Shared by SCR-02 Sign in and SCR-03 Sign up (AC-01.1.*). */
export function AuthForm({
  kind,
  onSubmit,
}: {
  kind: 'signIn' | 'signUp';
  onSubmit: (c: Credentials) => Promise<{ field?: 'email' | 'password'; message: string } | null>;
}) {
  const signUp = kind === 'signUp';
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, setError, formState } = useForm<Credentials>({
    resolver: zodResolver(signUp ? schema : schema.extend({ password: z.string().min(1, 'Enter your password') })),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });
  const { errors, isValid } = formState;

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    const err = await onSubmit(values);
    setBusy(false);
    if (err) setError(err.field ?? 'password', { message: err.message });
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="height" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <MoodArt mood="focused" icon="headphones" size={48} />
              <Txt variant="headlineSmall">MoodTunes</Txt>
            </View>
            <View style={styles.pair}>
              <Txt variant="headlineMedium" accessibilityRole="header">
                {signUp ? 'Create your account' : 'Welcome back'}
              </Txt>
              <Txt variant="bodyLarge" muted>
                {signUp ? 'Sign up with your email and a password.' : 'Sign in to continue your mood diary.'}
              </Txt>
            </View>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <View>
                  <TextInput
                    mode="outlined"
                    label="Email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    error={!!errors.email}
                    testID="email"
                  />
                  <HelperText type="error" visible={!!errors.email}>
                    {errors.email?.message ?? ' '}
                  </HelperText>
                </View>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <View>
                  <TextInput
                    mode="outlined"
                    label="Password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry={hidden}
                    autoComplete={signUp ? 'new-password' : 'current-password'}
                    error={!!errors.password}
                    testID="password"
                    right={
                      <TextInput.Icon
                        icon={hidden ? 'eye' : 'eye-off'}
                        onPress={() => setHidden(!hidden)}
                        accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
                      />
                    }
                  />
                  <HelperText type={errors.password ? 'error' : 'info'} visible={!!errors.password || signUp}>
                    {errors.password?.message ?? (signUp ? 'Use 8 or more characters' : ' ')}
                  </HelperText>
                </View>
              )}
            />
          </View>

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => void submit()}
              loading={busy}
              disabled={busy || (signUp && !isValid)}
              testID="submit"
            >
              {signUp ? 'Create account' : 'Sign in'}
            </Button>
            <View style={styles.switch}>
              <Txt muted>{signUp ? 'Already have an account?' : 'New to MoodTunes?'}</Txt>
              <Button onPress={() => router.replace(signUp ? '/sign-in' : '/sign-up')}>
                {signUp ? 'Sign in' : 'Create account'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.margin, paddingTop: space.top, gap: space.area },
  brand: { gap: space.group },
  logo: { flexDirection: 'row', alignItems: 'center', gap: space.grid },
  pair: { gap: space.text },
  form: { gap: space.text },
  actions: { gap: space.tight },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
