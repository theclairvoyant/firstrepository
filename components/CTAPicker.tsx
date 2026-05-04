// Picker for selecting which admin-configured CTA the post should attach.
// Each row renders the actual styled CtaButton on the right so the creator
// previews the real artifact, with a "Link · Dynamic" / "Document · Fixed"
// subtype tagline on the left. The None row collapses to a plain label.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Circle, CircleDot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { CTA, CtaType } from '@/types/api';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { CtaButton } from './CtaButton';
import { Input } from './Input';

export interface CTAPickerProps {
  ctas: CTA[];
  selectedId: string | null;
  onSelect: (ctaId: string | null) => void;
  dynamicUrl: string;
  onChangeDynamicUrl: (url: string) => void;
  dynamicUrlError?: string;
}

interface OptionRowProps {
  selected: boolean;
  onPress: () => void;
  cta: CTA;
}

function typeLabel(type: CtaType | undefined, t: (k: string) => string): string {
  if (type === 'document') return t('ctaPicker.typeDocument');
  return t('ctaPicker.typeLink');
}

function subtypeLabel(
  kind: CTA['kind'],
  t: (k: string) => string,
): string {
  return kind === 'static'
    ? t('ctaPicker.subtypeFixed')
    : t('ctaPicker.subtypeDynamic');
}

function OptionRow({
  selected,
  onPress,
  cta,
}: OptionRowProps): React.ReactElement {
  const { colors, radius, spacing, accent } = useTheme();
  const { t } = useTranslation();
  const RadioIcon = selected ? CircleDot : Circle;
  const iconColor = selected ? accent.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={cta.label}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.bgCard,
          borderColor: selected ? colors.borderFocus : colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.radio}>
        <RadioIcon size={20} color={iconColor} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText variant="caption" tone="muted">
          {`${typeLabel(cta.type, t)} · ${subtypeLabel(cta.kind, t)}`}
        </ThemedText>
        <ThemedText
          variant="bodyMed"
          tone="primary"
          numberOfLines={1}
        >
          {cta.label}
        </ThemedText>
      </View>
      <View style={{ flexShrink: 1, maxWidth: '55%' }}>
        <CtaButton cta={cta} fullWidth labelOverride={cta.label} />
      </View>
    </Pressable>
  );
}

interface NoneRowProps {
  selected: boolean;
  onPress: () => void;
}

function NoneRow({ selected, onPress }: NoneRowProps): React.ReactElement {
  const { colors, radius, spacing, accent } = useTheme();
  const { t } = useTranslation();
  const RadioIcon = selected ? CircleDot : Circle;
  const iconColor = selected ? accent.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t('ctaPicker.noneLabel')}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.bgCard,
          borderColor: selected ? colors.borderFocus : colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.radio}>
        <RadioIcon size={20} color={iconColor} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText variant="bodyMed" tone="primary">
          {t('ctaPicker.noneLabel')}
        </ThemedText>
        <ThemedText variant="caption" tone="muted">
          {t('ctaPicker.noneSubLabel')}
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
  const showDynamicInput =
    selectedCta !== null && selectedCta.kind === 'dynamic';

  return (
    <View style={{ gap: spacing.sm }}>
      <NoneRow
        selected={selectedId === null}
        onPress={() => onSelect(null)}
      />
      {ctas.map((cta) => (
        <OptionRow
          key={cta.id}
          selected={selectedId === cta.id}
          onPress={() => onSelect(cta.id)}
          cta={cta}
        />
      ))}

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
    minHeight: 64,
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
});
