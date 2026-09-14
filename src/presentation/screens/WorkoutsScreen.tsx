import { AppScreen, EmptyState, Section } from '../components/AppScreen';

export function WorkoutsScreen() {
  return (
    <AppScreen eyebrow="Treinos" title="Planejamento simples">
      <Section title="Salvos">
        <EmptyState
          body="Os treinos salvos aparecem aqui depois que o CRUD offline for implementado."
          title="Nenhum treino salvo"
        />
      </Section>
    </AppScreen>
  );
}
