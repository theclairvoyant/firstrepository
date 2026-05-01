import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Circle, CircleDot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { CTA } from '@/types/api';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { Input } from './Input';

export interface CTAPickerProps {
  ctas: CTA[];
  selectedId: string | null;
  onSelect: (ctaId: string | null) => void;
  dynamicUrl: string;
  onChangeDynamicUrl: (url: string) => void;
  dynamicUrlError?: string;
}

interface RowProps {
  selected: boolean;
  label: string;
  subLabel: string;
  onPress: () => void;
}

function Row({ selected, label, subLabel, onPress }: RowProps): React.ReactElement {
  const { colors, radius, spacing, accent } = useTheme();
  const RadioIcon = selected ? CircleDot : Circle;
  const iconColor = selected ? accent.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.bgCard,
          borderColor: selected ? colors.borderFocus : colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.radio, { marginRight: spacing.sm }]}>
        <RadioIcon size={20} color={iconColor} strokeWidth={1.75} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText variant="heading" tone="primary">
          {label}
        </ThemedText>
        <ThemedText
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xxs }}
        >
          {subLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CTAPicker({
  ctas,
  selectedId,
  onSelect,
  dynamicUrl,
  onChangeDynamicUrl,
  dynamicUrlError,
}: CTAPickerProps): React.ReactElement {
  const { spacing } = useTheme();
  const { t } = useTranslation();

  const selectedCta = ctas.find((c) => c.id === selectedId) ?? null;
  const showDynamicInput = selectedCta !== null && selectedCta.kind === 'dynamic';

  return (
    <View style={{ gap: spacing.xs }}>
      {ctas.map((cta) => {
        const isSelected = selectedId === cta.id;
        const subLabel =
          cta.kind === 'static'
            ? t('ctaPicker.staticLabel', { url: cta.url })
            : t('ctaPicker.dynamicLabel');
        return (
          <Row
            key={cta.id}
            selected={isSelected}
            label={cta.label}
            subLabel={subLabel}
            onPress={() => onSelect(cta.id)}
          />
        );
      })}
      <Row
        selected={selectedId === null}
        label={t('ctaPicker.noneLabel')}
        subLabel={t('ctaPicker.noneSubLabel')}
        onPress={() => onSelect(null)}
      />

      {showDynamicInput ? (
        <View style={{ marginTop: spacing.sm }}>
          <Input
            label={t('ctaPicker.linkLabel')}
            placeholder={t('ctaPicker.linkPlaceholder')}
            value={dynamicUrl}
            onChangeText={onChangeDynamicUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={dynamicUrlError}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
});
