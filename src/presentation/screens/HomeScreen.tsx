import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Droplets,
  FileText,
  Utensils,
  WifiOff,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HomeOverview } from '../../application/useCases/getHomeOverview';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { StatusPill } from '../components/StatusPill';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { RootTabParamList } from '../navigation/types';

type HomeOverviewState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: HomeOverview };

export function HomeScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [overview, setOverview] = useState<HomeOverviewState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    services.homeOverview
      .get()
      .then((value) => {
        if (isMounted) {
          setOverview({ status: 'ready', value });
        }
      })
      .catch(() => {
        if (isMounted) {
          setOverview({ status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [services]);

  const activeSessionState =
    overview.status === 'loading'
      ? {
          body: 'Consultando os dados salvos neste aparelho.',
          kind: 'loading' as const,
          title: 'Carregando treino',
        }
      : overview.status === 'error'
        ? {
            body: 'Nao foi possivel carregar o estado local.',
            kind: 'error' as const,
            title: 'Falha ao carregar',
          }
        : overview.value.activeSession
          ? {
              body: `Iniciado as ${new Date(overview.value.activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
              kind: 'empty' as const,
              title: 'Sessao em andamento',
            }
          : {
              body: 'Nenhuma sessao em andamento.',
              kind: 'empty' as const,
              title: 'Pronto para iniciar',
            };
  const savedWorkoutCount =
    overview.status === 'ready' ? overview.value.savedWorkoutCount : 0;
  const savedWorkoutState =
    overview.status === 'loading'
      ? {
          body: 'Consultando sua biblioteca local.',
          kind: 'loading' as const,
          title: 'Carregando treinos',
        }
      : overview.status === 'error'
        ? {
            body: 'Nao foi possivel carregar os treinos salvos.',
            kind: 'error' as const,
            title: 'Falha ao carregar',
          }
        : {
            body:
              savedWorkoutCount > 0
                ? `${savedWorkoutCount} treino${savedWorkoutCount === 1 ? '' : 's'} salvo${savedWorkoutCount === 1 ? '' : 's'} para escolher.`
                : 'Sem treino criado ainda.',
            kind: 'empty' as const,
            title:
              savedWorkoutCount > 0
                ? 'Treinos disponiveis'
                : 'Biblioteca vazia',
          };
  const syncLabel =
    overview.status === 'ready' && overview.value.pendingSyncOperationCount > 0
      ? `${overview.value.pendingSyncOperationCount} pendente`
      : 'Local-first';

  return (
    <AppScreen
      action={
        <StatusPill
          icon={<WifiOff color={colors.successText} size={16} />}
          label={syncLabel}
          tone="positive"
        />
      }
      eyebrow="ForgeFlow"
      title="Treine, registre, evolua"
    >
      <Section title="Treino ativo">
        <EmptyState {...activeSessionState} />
      </Section>
      <Section title="Proxima sessao">
        <EmptyState {...savedWorkoutState} />
      </Section>
      <Section title="Nutricao">
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Nutrition')}
          style={({ pressed }) => [
            styles.nutritionAction,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.nutritionIcon}>
            <Utensils color={colors.accent} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.nutritionText}>
            <Text style={styles.nutritionTitle}>Diario alimentar</Text>
            <Text style={styles.nutritionBody}>Refeicoes e totais do dia</Text>
          </View>
          <ArrowRight color={colors.textMuted} size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Hydration')}
          style={({ pressed }) => [
            styles.nutritionAction,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.nutritionIcon}>
            <Droplets color={colors.accent} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.nutritionText}>
            <Text style={styles.nutritionTitle}>Hidratacao</Text>
            <Text style={styles.nutritionBody}>
              Agua, meta e historico diario
            </Text>
          </View>
          <ArrowRight color={colors.textMuted} size={20} />
        </Pressable>
      </Section>
      <Section title="Relatorios">
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Reports')}
          style={({ pressed }) => [
            styles.nutritionAction,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.nutritionIcon}>
            <FileText color={colors.accent} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.nutritionText}>
            <Text style={styles.nutritionTitle}>Relatorio consolidado</Text>
            <Text style={styles.nutritionBody}>
              Treino, metas, nutricao e hidratacao
            </Text>
          </View>
          <ArrowRight color={colors.textMuted} size={20} />
        </Pressable>
      </Section>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  nutritionAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
  },
  nutritionBody: { ...typography.caption, color: colors.textMuted },
  nutritionIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  nutritionText: { flex: 1, gap: 2 },
  nutritionTitle: { ...typography.body, color: colors.text, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
