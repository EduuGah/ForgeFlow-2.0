import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AuthSession } from '../../domain/auth/entities';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

type AuthStatus =
  | { message?: string; session: AuthSession | null; status: 'ready' }
  | { status: 'loading' };

export function ProfileScreen() {
  const services = useAppServices();
  const [authState, setAuthState] = useState<AuthStatus>({ status: 'loading' });
  const [displayName, setDisplayName] = useState('Carlos Eduardo');
  const [email, setEmail] = useState('carlos@example.com');
  const [password, setPassword] = useState('strong-password');

  useEffect(() => {
    let isMounted = true;

    services.auth
      .restoreSession()
      .then((session) => {
        if (isMounted) {
          setAuthState({ session, status: 'ready' });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthState({
            message: 'Nao foi possivel restaurar a sessao.',
            session: null,
            status: 'ready',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [services]);

  async function runAuthAction(
    action: () => Promise<AuthSession | null | void>,
    message: string,
  ) {
    try {
      const result = await action();
      const session =
        result === undefined ? await services.auth.restoreSession() : result;

      setAuthState({
        message,
        session: session ?? null,
        status: 'ready',
      });
    } catch (error) {
      setAuthState({
        message:
          error instanceof Error ? error.message : 'Falha de autenticacao.',
        session: authState.status === 'ready' ? authState.session : null,
        status: 'ready',
      });
    }
  }

  const session = authState.status === 'ready' ? authState.session : null;

  return (
    <AppScreen eyebrow="Perfil" title="Conta e preferencias">
      <Section title="Sessao">
        {session ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{session.user.displayName}</Text>
            <Text style={styles.panelBody}>{session.user.email}</Text>
            <Text style={styles.panelCaption}>
              Sessao persistida via armazenamento seguro abstrato.
            </Text>
            <ActionButton
              label="Sair"
              tone="danger"
              onPress={() =>
                runAuthAction(() => services.auth.logout(), 'Sessao encerrada.')
              }
            />
          </View>
        ) : (
          <EmptyState
            body="Crie uma conta local de preview ou entre com a conta registrada nesta sessao."
            title="Sem usuario autenticado"
          />
        )}
        {authState.status === 'ready' && authState.message ? (
          <Text style={styles.message}>{authState.message}</Text>
        ) : null}
      </Section>
      <Section title="Autenticacao">
        <View style={styles.form}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setDisplayName}
            placeholder="Nome"
            style={styles.input}
            value={displayName}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Senha"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <View style={styles.actions}>
            <ActionButton
              label="Criar conta"
              onPress={() =>
                runAuthAction(
                  () => services.auth.register(displayName, email, password),
                  'Conta criada e sessao salva.',
                )
              }
            />
            <ActionButton
              label="Entrar"
              onPress={() =>
                runAuthAction(
                  () => services.auth.login(email, password),
                  'Sessao iniciada.',
                )
              }
            />
          </View>
        </View>
      </Section>
    </AppScreen>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'danger' | 'primary';
};

function ActionButton({ label, onPress, tone = 'primary' }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.button,
        tone === 'danger' ? styles.dangerButton : styles.primaryButton,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  panelBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  panelCaption: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  panelTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
});
