import { AppScreen, EmptyState, Section } from '../components/AppScreen';

export function ProgressScreen() {
  return (
    <AppScreen eyebrow="Progresso" title="Evidencia de evolucao">
      <Section title="Historico">
        <EmptyState
          body="Graficos e tabelas aparecem depois que houver sessoes finalizadas no armazenamento local."
          title="Sem registros suficientes"
        />
      </Section>
    </AppScreen>
  );
}
