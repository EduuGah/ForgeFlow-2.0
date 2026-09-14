import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

type StatusPillProps = {
  icon?: ReactNode;
  label: string;
  tone?: 'neutral' | 'positive';
};

export function StatusPill({ icon, label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View style={[styles.root, tone === 'positive' && styles.positive]}>
      {icon}
      <Text style={[styles.label, tone === 'positive' && styles.positiveText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  positive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  positiveText: {
    color: colors.successText,
  },
  root: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
});
