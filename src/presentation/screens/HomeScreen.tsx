import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react-native';

import type { HomeOverview } from '../../application/useCases/getHomeOverview';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { StatusPill } from '../components/StatusPill';
import { colors } from '../theme/tokens';

type HomeOverviewState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: HomeOverview };

export function HomeScreen() {
  const services = useAppServices();
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

  const activeSessionTitle =
    overview.status === 'ready' && overview.value.activeSession
      ? 'Sessao em andamento'
      : 'Pronto para iniciar';
  const activeSessionBody =
    overview.status === 'error'
      ? 'Nao foi possivel carregar o estado local.'
      : 'Nenhuma sessao em andamento.';
  const savedWorkoutCount =
    overview.status === 'ready' ? overview.value.savedWorkoutCount : 0;
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
        <EmptyState body={activeSessionBody} title={activeSessionTitle} />
      </Section>
      <Section title="Proxima sessao">
        <EmptyState
          body={
            savedWorkoutCount > 0
              ? `${savedWorkoutCount} treino salvo para escolher.`
              : 'Sem treino criado ainda.'
          }
          title="Biblioteca vazia"
        />
      </Section>
    </AppScreen>
  );
}
