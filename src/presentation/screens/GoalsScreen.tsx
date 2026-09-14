import { AppScreen, EmptyState, Section } from '../components/AppScreen';

export function GoalsScreen() {
  return (
    <AppScreen eyebrow="Metas" title="Foco mensuravel">
      <Section title="Ativas">
        <EmptyState
          body="As metas aparecem aqui depois que o motor de metas estiver conectado aos registros locais."
          title="Nenhuma meta ativa"
        />
      </Section>
    </AppScreen>
  );
}
