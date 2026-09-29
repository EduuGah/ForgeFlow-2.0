import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppScreen, EmptyState, Section } from './components/AppScreen';
import { colors } from './theme/tokens';

describe('presentation accessibility', () => {
  it('exposes the screen hierarchy and loading state semantically', async () => {
    const view = await render(
      <AppScreen eyebrow="ForgeFlow" title="Resumo">
        <Section title="Treino ativo">
          <EmptyState
            body="Consultando os dados locais."
            kind="loading"
            title="Carregando treino"
          />
        </Section>
      </AppScreen>,
    );

    expect(view.getByRole('header', { name: 'Resumo' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Treino ativo' })).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    );
  });

  it('announces error feedback as an alert', async () => {
    const view = await render(
      <EmptyState
        body="Tente novamente."
        kind="error"
        title="Falha ao carregar"
      />,
    );

    expect(view.getByRole('alert')).toHaveTextContent(
      'Falha ao carregarTente novamente.',
    );
  });

  it.each([
    ['primary text', colors.text, colors.surface],
    ['muted text', colors.textMuted, colors.surface],
    ['subtle text', colors.textSubtle, colors.surface],
    ['accent text', colors.accent, colors.surface],
    ['danger text', colors.danger, colors.surface],
    ['warning text', colors.warning, colors.surface],
    ['success text', colors.successText, colors.successSoft],
    ['accent button', colors.surface, colors.accent],
    ['danger button', colors.surface, colors.danger],
  ])('%s meets the WCAG AA contrast ratio', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps ordinary content available inside the shared screen component', async () => {
    const view = await render(
      <AppScreen eyebrow="ForgeFlow" title="Resumo">
        <Text>Conteudo principal</Text>
      </AppScreen>,
    );

    expect(view.getByText('Conteudo principal')).toBeTruthy();
  });
});

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
