import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { env } from '../../config/env';

export function ProfileScreen() {
  return (
    <AppScreen eyebrow="Perfil" title="Conta e preferencias">
      <Section title="Sessao">
        <EmptyState
          body={`Ambiente publico: ${env.appEnv}. Autenticacao entra no issue FF-008.`}
          title="Sem usuario autenticado"
        />
      </Section>
    </AppScreen>
  );
}
