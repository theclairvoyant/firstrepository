import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Mail,
  Search,
  Plus,
  Inbox,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import type { ColorScheme } from '@/lib/theme/ThemeProvider';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { GhostButton } from '@/components/GhostButton';
import { DestructiveButton } from '@/components/DestructiveButton';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/Input';
import { OTPInput } from '@/components/OTPInput';
import { StatusBadge } from '@/components/StatusBadge';
import type { StatusBadgeStatus } from '@/components/StatusBadge';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { TagPill } from '@/components/TagPill';
import { TagSection } from '@/components/TagSection';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { showToast } from '@/lib/toast';

const STATUSES: ReadonlyArray<StatusBadgeStatus> = [
  'pending',
  'approved',
  'live',
  'rejected',
  'needs_edits',
  'pending_invite',
  'pending_request',
];

const SAMPLE_TAGS: ReadonlyArray<string> = [
  'product',
  'design',
  'launch',
  'team',
  'q2',
];

function SectionTitle({ children }: { children: string }): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <ThemedText
      variant="heading"
      tone="primary"
      style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
    >
      {children}
    </ThemedText>
  );
}

function Row({ children }: { children: React.ReactNode }): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.sm }]}>{children}</View>
  );
}

function Stack({ children }: { children: React.ReactNode }): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>{children}</View>
  );
}

interface GalleryProps {
  scheme: ColorScheme;
}

function Gallery({ scheme }: GalleryProps): React.ReactElement {
  const { colors, spacing, accent } = useTheme();
  const [otp, setOtp] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('not-an-email');
  const [selectedTags, setSelectedTags] = useState<ReadonlyArray<string>>([
    'design',
  ]);

  const toggleTag = (tag: string): void => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <ThemedView
      style={{
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <ThemedText variant="title" tone="primary">
        {scheme === 'dark' ? 'Dark mode' : 'Light mode'}
      </ThemedText>
      <ThemedText variant="caption" tone="muted">
        forced scheme: {scheme}
      </ThemedText>

      <SectionTitle>Typography</SectionTitle>
      <Stack>
        <ThemedText variant="display">Display 32</ThemedText>
        <ThemedText variant="title">Title 22</ThemedText>
        <ThemedText variant="heading">Heading 18</ThemedText>
        <ThemedText variant="body">Body 15 regular text sample.</ThemedText>
        <ThemedText variant="bodyMed">Body medium 15.</ThemedText>
        <ThemedText variant="caption" tone="secondary">
          Caption 13
        </ThemedText>
        <ThemedText variant="mono" tone="secondary">
          mono caption
        </ThemedText>
        <ThemedText variant="monoLarge" tone="secondary">
          mono14
        </ThemedText>
      </Stack>

      <SectionTitle>Buttons</SectionTitle>
      <Stack>
        <PrimaryButton label="Primary action" onPress={() => undefined} />
        <PrimaryButton label="Loading" loading />
        <PrimaryButton label="Disabled" disabled />
        <SecondaryButton label="Secondary action" onPress={() => undefined} />
        <DestructiveButton label="Sign out" onPress={() => undefined} />
        <Row>
          <GhostButton label="Cancel" />
          <GhostButton
            label="With icon"
            leftIcon={<Plus size={16} color={colors.textPrimary} strokeWidth={1.75} />}
          />
        </Row>
      </Stack>

      <SectionTitle>Card</SectionTitle>
      <Card>
        <ThemedText variant="heading">Card heading</ThemedText>
        <ThemedText variant="body" tone="secondary">
          Card body uses bgCard with a 1px border. No drop shadow in dark mode.
        </ThemedText>
      </Card>

      <SectionTitle>Avatar</SectionTitle>
      <Row>
        <Avatar size={24} name="Ada Lovelace" />
        <Avatar size={32} name="Linus Torvalds" />
        <Avatar size={40} name="Grace Hopper" />
        <Avatar size={56} name="Alan Turing" />
        <Avatar size={80} name="Margaret Hamilton" />
      </Row>

      <SectionTitle>Input</SectionTitle>
      <Stack>
        <Input
          label="Work email"
          placeholder="you@company.com"
          value={text}
          onChangeText={setText}
          keyboardType="email-address"
          autoCapitalize="none"
          rightSlot={<Mail size={18} color={colors.textMuted} strokeWidth={1.75} />}
        />
        <Input
          label="Search"
          placeholder="Search videos"
          leftSlot={<Search size={18} color={colors.textMuted} strokeWidth={1.75} />}
        />
        <Input
          label="Email with error"
          value={errorText}
          onChangeText={setErrorText}
          error="Enter a valid email address"
        />
      </Stack>

      <SectionTitle>OTP</SectionTitle>
      <OTPInput value={otp} onChange={setOtp} />

      <SectionTitle>Status badges over surface</SectionTitle>
      <View style={[styles.row, { flexWrap: 'wrap', gap: spacing.xs }]}>
        {STATUSES.map((s) => (
          <StatusBadge key={s} status={s} surface="overSurface" />
        ))}
      </View>

      <SectionTitle>Status badges over media</SectionTitle>
      <View
        style={{
          backgroundColor: accent.primary,
          padding: spacing.md,
          borderRadius: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
        }}
      >
        {STATUSES.map((s) => (
          <StatusBadge key={s} status={s} surface="overMedia" />
        ))}
      </View>

      <SectionTitle>Workspace type badges</SectionTitle>
      <Row>
        <WorkspaceTypeBadge type="skills" />
        <WorkspaceTypeBadge type="social" />
        <WorkspaceTypeBadge type="partner" />
      </Row>

      <SectionTitle>Tags</SectionTitle>
      <TagSection
        title="Pick tags"
        tags={SAMPLE_TAGS}
        selected={selectedTags}
        onToggle={toggleTag}
      />

      <SectionTitle>Empty state</SectionTitle>
      <Card>
        <EmptyState
          icon={Inbox}
          title="No videos yet"
          description="Upload your first vertical video to start the approval flow."
          cta={
            <PrimaryButton
              label="Upload video"
              onPress={() => undefined}
            />
          }
        />
      </Card>

      <SectionTitle>Toasts</SectionTitle>
      <Stack>
        <SecondaryButton
          label="Show success toast"
          onPress={() =>
            showToast({
              message: 'Saved',
              description: 'Your changes were saved.',
              variant: 'success',
            })
          }
          leftIcon={
            <CheckCircle2 size={18} color={colors.textPrimary} strokeWidth={1.75} />
          }
        />
        <SecondaryButton
          label="Show warning toast"
          onPress={() =>
            showToast({
              message: 'Heads up',
              description: 'Cellular connection detected.',
              variant: 'warning',
            })
          }
          leftIcon={
            <AlertTriangle size={18} color={colors.textPrimary} strokeWidth={1.75} />
          }
        />
      </Stack>
    </ThemedView>
  );
}

function ForcedThemeBlock({ scheme }: GalleryProps): React.ReactElement {
  return (
    <ThemeProvider forcedScheme={scheme}>
      <Gallery scheme={scheme} />
    </ThemeProvider>
  );
}

export default function DesignPreview(): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
      >
        <ThemedText variant="display">Design preview</ThemedText>
        <ThemedText variant="body" tone="secondary">
          Every component rendered in light and dark mode for visual review.
        </ThemedText>
        <ForcedThemeBlock scheme="light" />
        <ForcedThemeBlock scheme="dark" />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
