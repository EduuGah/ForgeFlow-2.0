import { WifiOff } from 'lucide-react-native';

import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { StatusPill } from '../components/StatusPill';
import { colors } from '../theme/tokens';

export function HomeScreen() {
  return (
    <AppScreen
      action={
        <StatusPill
          icon={<WifiOff color={colors.successText} size={16} />}
          label="Local-first"
          tone="positive"
        />
      }
      eyebrow="ForgeFlow"
      title="Treine, registre, evolua"
    >
      <Section title="Treino ativo">
        <EmptyState
          body="Nenhuma sessao em andamento."
          title="Pronto para iniciar"
        />
      </Section>
      <Section title="Proxima sessao">
        <EmptyState body="Sem treino criado ainda." title="Biblioteca vazia" />
      </Section>
    </AppScreen>
  );
}
