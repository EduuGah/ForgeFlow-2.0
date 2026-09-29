import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Ban,
  Check,
  Search,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  FriendProfileView,
  FriendsOverview,
  UserSearchResult,
} from '../../application/useCases/friends';
import { useAppServices } from '../../composition/AppServicesProvider';
import type { SocialProfile } from '../../domain/social/entities';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

type ScreenState =
  | { status: 'error' }
  | { status: 'loading' }
  | { overview: FriendsOverview; status: 'ready' };

export function FriendsScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState({
        overview: await services.friends.getOverview(),
        status: 'ready',
      });
    } catch {
      setState({ status: 'error' });
    }
  }, [services]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    let active = true;
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      return () => {
        active = false;
      };
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      services.friends
        .search(normalized)
        .then((items) => {
          if (active) setResults(items);
        })
        .catch(() => {
          if (active) setMessage('Nao foi possivel pesquisar agora.');
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, services]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    try {
      setMessage(null);
      await action();
      setMessage(success);
      await load();
      if (query.trim().length >= 2) {
        setResults(await services.friends.search(query));
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel concluir.',
      );
    }
  }

  const overview = state.status === 'ready' ? state.overview : null;

  return (
    <AppScreen
      action={
        <IconButton
          label="Voltar ao perfil"
          onPress={() => navigation.navigate('Profile')}
        >
          <ArrowLeft color={colors.text} size={22} />
        </IconButton>
      }
      eyebrow="Perfil"
      title="Amigos"
    >
      <View style={styles.searchBox}>
        <Search color={colors.textMuted} size={20} />
        <TextInput
          accessibilityLabel="Pesquisar por nome ou usuario"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Nome ou @usuario"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <IconButton label="Limpar pesquisa" onPress={() => setQuery('')}>
            <X color={colors.textMuted} size={20} />
          </IconButton>
        ) : null}
      </View>

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}

      {query.trim().length >= 2 ? (
        <Section title="Resultados">
          {searching ? (
            <EmptyState
              body="Buscando perfis."
              kind="loading"
              title="Pesquisando"
            />
          ) : results.length ? (
            results.map((result) => (
              <SearchResult
                key={result.profile.userId}
                result={result}
                onAccept={() =>
                  runAction(
                    () => services.friends.accept(result.friendshipId!),
                    'Pedido aceito.',
                  )
                }
                onBlock={() =>
                  runAction(
                    () => services.friends.block(result.profile.userId),
                    'Usuario bloqueado.',
                  )
                }
                onSend={() =>
                  runAction(
                    () => services.friends.sendRequest(result.profile.userId),
                    'Pedido enviado.',
                  )
                }
              />
            ))
          ) : (
            <EmptyState
              body="Tente outro nome ou nome de usuario. Emails nunca sao usados nesta busca."
              title="Nenhum perfil encontrado"
            />
          )}
        </Section>
      ) : null}

      {state.status === 'loading' ? (
        <EmptyState
          body="Carregando suas conexoes."
          kind="loading"
          title="Amigos"
        />
      ) : state.status === 'error' ? (
        <EmptyState
          body="Seus dados locais continuam salvos. Tente abrir a tela novamente."
          kind="error"
          title="Nao foi possivel carregar"
        />
      ) : (
        <>
          <Section title="Privacidade">
            <PrivacyRow
              body="Seu nome e @usuario continuam visiveis na pesquisa."
              label="Perfil privado"
              value={overview!.profile.isPrivate}
              onValueChange={(value) =>
                runAction(
                  () =>
                    services.friends.updatePrivacy(
                      value,
                      overview!.profile.sharesWorkoutStats,
                    ),
                  'Privacidade atualizada.',
                )
              }
            />
            <PrivacyRow
              body="Amigos aceitos podem consultar seus dados de treino."
              label="Compartilhar estatisticas"
              value={overview!.profile.sharesWorkoutStats}
              onValueChange={(value) =>
                runAction(
                  () =>
                    services.friends.updatePrivacy(
                      overview!.profile.isPrivate,
                      value,
                    ),
                  'Privacidade atualizada.',
                )
              }
            />
          </Section>

          {overview!.incomingRequests.length ? (
            <Section title="Pedidos recebidos">
              {overview!.incomingRequests.map((item) => (
                <ProfileRow
                  key={item.profile.userId}
                  profile={item.profile}
                  detail="Quer adicionar voce"
                  actions={
                    <>
                      <SmallButton
                        icon={<Check color={colors.surface} size={17} />}
                        label="Aceitar"
                        onPress={() =>
                          runAction(
                            () => services.friends.accept(item.friendshipId),
                            'Pedido aceito.',
                          )
                        }
                      />
                      <SmallButton
                        icon={<X color={colors.textMuted} size={17} />}
                        label="Recusar"
                        tone="secondary"
                        onPress={() =>
                          runAction(
                            () => services.friends.decline(item.friendshipId),
                            'Pedido recusado.',
                          )
                        }
                      />
                    </>
                  }
                />
              ))}
            </Section>
          ) : null}

          <Section title={`Amigos (${overview!.friends.length})`}>
            {overview!.friends.length ? (
              overview!.friends.map((item) => (
                <ProfileRow
                  key={item.profile.userId}
                  profile={item.profile}
                  detail={
                    item.canViewWorkoutStats
                      ? 'Estatisticas compartilhadas'
                      : 'Estatisticas privadas'
                  }
                  actions={
                    <>
                      <SmallButton
                        icon={<UserMinus color={colors.textMuted} size={17} />}
                        label="Remover"
                        tone="secondary"
                        onPress={() =>
                          runAction(
                            () => services.friends.remove(item.friendshipId),
                            'Amizade removida.',
                          )
                        }
                      />
                      <SmallButton
                        icon={<Ban color={colors.danger} size={17} />}
                        label="Bloquear"
                        tone="danger"
                        onPress={() =>
                          runAction(
                            () => services.friends.block(item.profile.userId),
                            'Usuario bloqueado.',
                          )
                        }
                      />
                    </>
                  }
                />
              ))
            ) : (
              <EmptyState
                body="Pesquise por nome ou @usuario para enviar um pedido."
                title="Sua lista esta vazia"
              />
            )}
          </Section>

          {overview!.outgoingRequests.length ? (
            <Section title="Pedidos enviados">
              {overview!.outgoingRequests.map((item) => (
                <ProfileRow
                  key={item.profile.userId}
                  profile={item.profile}
                  detail="Aguardando resposta"
                />
              ))}
            </Section>
          ) : null}

          {overview!.blocked.length ? (
            <Section title="Bloqueados">
              {overview!.blocked.map((item) => (
                <ProfileRow
                  key={item.profile.userId}
                  profile={item.profile}
                  detail="Perfil oculto das suas conexoes"
                  actions={
                    <SmallButton
                      icon={<Check color={colors.textMuted} size={17} />}
                      label="Desbloquear"
                      tone="secondary"
                      onPress={() =>
                        runAction(
                          () => services.friends.unblock(item.profile.userId),
                          'Usuario desbloqueado.',
                        )
                      }
                    />
                  }
                />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

function SearchResult({
  onAccept,
  onBlock,
  onSend,
  result,
}: {
  onAccept: () => void;
  onBlock: () => void;
  onSend: () => void;
  result: UserSearchResult;
}) {
  const labels = {
    accepted: 'Amigos',
    incoming: 'Pedido recebido',
    none: result.profile.isPrivate ? 'Perfil privado' : 'Perfil publico',
    outgoing: 'Pedido enviado',
  };
  return (
    <ProfileRow
      profile={result.profile}
      detail={labels[result.relationship]}
      actions={
        <>
          {result.relationship === 'none' ? (
            <SmallButton
              icon={<UserPlus color={colors.surface} size={17} />}
              label="Adicionar"
              onPress={onSend}
            />
          ) : null}
          {result.relationship === 'incoming' ? (
            <SmallButton
              icon={<Check color={colors.surface} size={17} />}
              label="Aceitar"
              onPress={onAccept}
            />
          ) : null}
          <SmallButton
            icon={<Ban color={colors.danger} size={17} />}
            label="Bloquear"
            tone="danger"
            onPress={onBlock}
          />
        </>
      }
    />
  );
}

function ProfileRow({
  actions,
  detail,
  profile,
}: {
  actions?: React.ReactNode;
  detail: string;
  profile: SocialProfile;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{profile.displayName.charAt(0)}</Text>
      </View>
      <View style={styles.profileCopy}>
        <Text style={styles.profileName}>{profile.displayName}</Text>
        <Text style={styles.profileUsername}>@{profile.username}</Text>
        <Text style={styles.profileDetail}>{detail}</Text>
      </View>
      {actions ? <View style={styles.rowActions}>{actions}</View> : null}
    </View>
  );
}

function PrivacyRow({
  body,
  label,
  onValueChange,
  value,
}: {
  body: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.privacyRow}>
      <View style={styles.profileCopy}>
        <Text style={styles.profileName}>{label}</Text>
        <Text style={styles.profileDetail}>{body}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.success }}
        value={value}
      />
    </View>
  );
}

function IconButton({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
    >
      {children}
    </Pressable>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  tone?: 'danger' | 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.smallButton,
        tone === 'primary' && styles.primaryButton,
        tone === 'secondary' && styles.secondaryButton,
        tone === 'danger' && styles.dangerButton,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.smallButtonText,
          tone !== 'primary' && styles.darkButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { ...typography.subtitle, color: colors.accent },
  dangerButton: { backgroundColor: colors.surface, borderColor: colors.danger },
  darkButtonText: { color: colors.textMuted },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  message: { ...typography.body, color: colors.textMuted },
  primaryButton: { backgroundColor: colors.accent, borderColor: colors.accent },
  privacyRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  profileCopy: { flex: 1, gap: 2, minWidth: 120 },
  profileDetail: { ...typography.caption, color: colors.textSubtle },
  profileName: { ...typography.body, color: colors.text, fontWeight: '800' },
  profileRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
  },
  profileUsername: { ...typography.caption, color: colors.accent },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  smallButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '800',
  },
});
