import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export const TAG_MAX_LENGTH = 50;
export const TAG_SUGGESTION_LIMIT = 6;

export type TagSuggestion = { id: string; name: string };

export type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: TagSuggestion[];
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

// Mirrors the server: trimmed, lowercased, at most 50 characters.
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, TAG_MAX_LENGTH).trim();
}

// Splits a draft on commas into normalized, non-empty, unique tags.
export function splitTagDraft(draft: string): string[] {
  const tags: string[] = [];
  for (const part of draft.split(',')) {
    const tag = normalizeTag(part);
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

// Known tags starting with the draft that aren't already committed.
export function filterTagSuggestions(
  suggestions: TagSuggestion[],
  draft: string,
  committed: string[],
  limit: number = TAG_SUGGESTION_LIMIT,
): TagSuggestion[] {
  const prefix = draft.trim().toLowerCase();
  if (!prefix) {
    return [];
  }
  const taken = new Set(committed.map((tag) => tag.toLowerCase()));
  return suggestions
    .filter((suggestion) => {
      const name = suggestion.name.toLowerCase();
      return name.startsWith(prefix) && !taken.has(name);
    })
    .slice(0, limit);
}

function addTags(value: string[], incoming: string[]): string[] {
  const taken = new Set(value.map((tag) => tag.toLowerCase()));
  const added = incoming.filter((tag) => !taken.has(tag));
  return added.length ? [...value, ...added] : value;
}

// Controlled tag editor: chips for committed tags plus a draft input.
export function TagInput({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  accessibilityLabel = 'Tags',
  testID = 'tag-input',
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (text: string) => {
    const next = addTags(value, splitTagDraft(text));
    if (next !== value) {
      onChange(next);
    }
    setDraft('');
  };

  const handleChangeText = (text: string) => {
    if (text.includes(',')) {
      commit(text);
    } else {
      setDraft(text);
    }
  };

  const remove = (tag: string) => {
    onChange(value.filter((existing) => existing !== tag));
  };

  const matches = filterTagSuggestions(suggestions, draft, value);

  return (
    <View testID={testID}>
      <View style={[styles.field, disabled && styles.disabled]}>
        {value.map((tag) => (
          <View key={tag} style={styles.chip}>
            <Text style={styles.chipText}>{tag}</Text>
            <Pressable
              accessibilityLabel={`Remove ${tag}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={8}
              onPress={() => remove(tag)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Icon color={colors.secondary} name="clear" size={12} />
            </Pressable>
          </View>
        ))}
        <TextInput
          accessibilityLabel={accessibilityLabel}
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          editable={!disabled}
          onBlur={() => commit(draft)}
          onChangeText={handleChangeText}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onSubmitEditing={() => commit(draft)}
          placeholder="Add a tag"
          placeholderTextColor={colors.inputPlaceholder}
          returnKeyType="done"
          style={styles.input}
          testID="tag-input-field"
          value={draft}
        />
      </View>
      {matches.length > 0 ? (
        <View style={styles.suggestions}>
          {matches.map((suggestion) => (
            <Pressable
              accessibilityLabel={`Add ${suggestion.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              key={suggestion.id}
              onPress={() => commit(suggestion.name)}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.suggestionText}>{suggestion.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  chipText: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  disabled: {
    opacity: 0.6,
  },
  field: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  input: {
    color: colors.text,
    flexGrow: 1,
    fontSize: typography.body.fontSize,
    minWidth: 100,
    paddingVertical: spacing[4],
  },
  pressed: {
    opacity: 0.7,
  },
  suggestion: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  suggestionText: {
    color: colors.primaryDark,
    fontSize: typography.itemMeta.fontSize,
    lineHeight: typography.itemMeta.lineHeight,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[8],
  },
});
