import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  LINK_PLATFORM_LABELS,
  LINK_PLATFORMS,
  MAX_WEB_LINKS,
  normalizeLinkUrl,
  toWebLinkInput,
  type LinkFieldErrors,
  type LinkPlatform,
  type WebLink,
  type WebLinkInput,
} from '../lib/profile';
import { colors, radii, spacing, typography } from '../theme';
import { FieldError } from './FieldError';
import { FormTextField } from './FormTextField';
import { Icon } from './Icon';
import { OptionSheet } from './OptionSheet';

export type LinkDraft = {
  key: string;
  platform: LinkPlatform;
  custom_name: string;
  url: string;
};

export type WebLinksEditorProps = {
  links: LinkDraft[];
  onChange: (links: LinkDraft[]) => void;
  /** Keyed by row key, not by the index sent to the server. */
  errors?: Record<string, LinkFieldErrors>;
  disabled?: boolean;
};

const PLATFORM_OPTIONS = LINK_PLATFORMS.map((platform) => ({
  value: platform,
  label: LINK_PLATFORM_LABELS[platform],
}));

let draftCounter = 0;

export function toLinkDrafts(links: WebLink[]): LinkDraft[] {
  return links.map((link) => {
    const input = toWebLinkInput(link);

    return {
      key: `saved-${link.id}`,
      platform: input.platform,
      custom_name: input.custom_name ?? '',
      url: input.url,
    };
  });
}

export function newLinkDraft(): LinkDraft {
  draftCounter += 1;

  return {
    key: `new-${Date.now()}-${draftCounter}`,
    platform: 'website',
    custom_name: '',
    url: '',
  };
}

/**
 * Blank-url rows are skipped (the backend drops them anyway), so
 * `keysBySentIndex[i]` maps a server error index back to its row.
 */
export function toLinkInputs(drafts: LinkDraft[]): {
  inputs: WebLinkInput[];
  keysBySentIndex: string[];
} {
  const inputs: WebLinkInput[] = [];
  const keysBySentIndex: string[] = [];

  drafts.forEach((draft) => {
    const url = normalizeLinkUrl(draft.url);

    if (url === '') return;

    inputs.push({
      platform: draft.platform,
      custom_name: draft.platform === 'other' ? draft.custom_name.trim() : null,
      url,
    });
    keysBySentIndex.push(draft.key);
  });

  return { inputs, keysBySentIndex };
}

function sameInput(a: WebLinkInput, b: WebLinkInput): boolean {
  return (
    a.platform === b.platform &&
    (a.custom_name ?? '') === (b.custom_name ?? '') &&
    normalizeLinkUrl(a.url) === normalizeLinkUrl(b.url)
  );
}

export function hasLinkChanges(
  drafts: LinkDraft[],
  original: WebLink[],
): boolean {
  const { inputs } = toLinkInputs(drafts);
  const saved = original.map(toWebLinkInput);

  return (
    inputs.length !== saved.length ||
    inputs.some((input, index) => !sameInput(input, saved[index]))
  );
}

/** Controlled editor for up to MAX_WEB_LINKS profile links. */
export function WebLinksEditor({
  links,
  onChange,
  errors,
  disabled = false,
}: WebLinksEditorProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openLink = links.find((link) => link.key === openKey);
  const canAdd = links.length < MAX_WEB_LINKS;

  const update = (key: string, patch: Partial<Omit<LinkDraft, 'key'>>) => {
    onChange(
      links.map((link) => (link.key === key ? { ...link, ...patch } : link)),
    );
  };

  return (
    <View style={styles.root} testID="web-links-editor">
      <Text style={styles.sectionLabel}>Links</Text>

      {links.map((link) => {
        const rowErrors = errors?.[link.key];
        const label = LINK_PLATFORM_LABELS[link.platform];

        return (
          <View key={link.key} style={styles.row} testID={`link-${link.key}`}>
            <View style={styles.rowHeader}>
              <Pressable
                accessibilityLabel={`Platform: ${label}`}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => setOpenKey(link.key)}
                style={({ pressed }) => [
                  styles.platformButton,
                  (disabled || pressed) && styles.dim,
                ]}
                testID={`link-${link.key}-platform-button`}
              >
                <Text style={styles.platformText}>{label}</Text>
                <Icon color={colors.secondary} name="chevron" size={12} />
              </Pressable>
              <Pressable
                accessibilityLabel="Remove link"
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={6}
                onPress={() =>
                  onChange(links.filter((other) => other.key !== link.key))
                }
                style={[styles.removeButton, disabled && styles.dim]}
                testID={`link-${link.key}-remove`}
              >
                <Icon color={colors.secondary} name="trash" size={16} />
              </Pressable>
            </View>
            <FieldError
              field={`link-${link.key}-platform`}
              message={rowErrors?.platform}
            />

            {link.platform === 'other' ? (
              <FormTextField
                editable={!disabled}
                error={rowErrors?.custom_name}
                field={`link-${link.key}-name`}
                label="Name"
                onChangeText={(value) =>
                  update(link.key, { custom_name: value })
                }
                value={link.custom_name}
              />
            ) : null}

            <FormTextField
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
              error={rowErrors?.url}
              field={`link-${link.key}-url`}
              keyboardType="url"
              label="URL"
              onChangeText={(value) => update(link.key, { url: value })}
              placeholder="example.com"
              value={link.url}
            />
          </View>
        );
      })}

      {canAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onChange([...links, newLinkDraft()])}
          style={({ pressed }) => [
            styles.addButton,
            (disabled || pressed) && styles.dim,
          ]}
          testID="link-add"
        >
          <Icon color={colors.primaryDark} name="plus" size={14} />
          <Text style={styles.addText}>Add link</Text>
        </Pressable>
      ) : null}

      <Text style={styles.count} testID="link-count">
        {links.length} of {MAX_WEB_LINKS} links
      </Text>

      <OptionSheet<LinkPlatform>
        onClose={() => setOpenKey(null)}
        onSelect={(platform) => {
          if (openLink) update(openLink.key, { platform });
        }}
        options={PLATFORM_OPTIONS}
        title="Platform"
        value={openLink?.platform ?? 'website'}
        visible={openLink !== undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[12],
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
  row: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[12],
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  platformButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
  },
  platformText: {
    color: colors.text,
    ...typography.body,
  },
  removeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  addText: {
    color: colors.primaryDark,
    ...typography.buttonSmall,
  },
  dim: {
    opacity: 0.5,
  },
  count: {
    color: colors.secondary,
    ...typography.meta,
  },
});
