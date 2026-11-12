import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, outline, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { inputPlaceholderColor, inputStyles, useFocus } from './ui/inputStyles';

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
  const focus = useFocus();

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
      <View style={inputStyles.frame}>
        <View
          style={[
            styles.field,
            focus.focused && inputStyles.focused,
            disabled && styles.disabled,
          ]}
        >
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
                style={({ pressed }) => [
                  styles.remove,
                  pressed && styles.pressed,
                ]}
              >
                <Icon color={colors.ink} name="clear" size={12} />
              </Pressable>
            </View>
          ))}
          <TextInput
            accessibilityLabel={accessibilityLabel}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            editable={!disabled}
            onBlur={() => {
              focus.onBlur(undefined);
              commit(draft);
            }}
            onFocus={focus.onFocus}
            onChangeText={handleChangeText}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onSubmitEditing={() => commit(draft)}
            placeholder="Add a tag"
            placeholderTextColor={inputPlaceholderColor}
            returnKeyType="done"
            style={styles.input}
            testID="tag-input-field"
            value={draft}
          />
        </View>
        {focus.focused ? (
          <View pointerEvents="none" style={inputStyles.ring} />
        ) : null}
      </View>
      {matches.length > 0 ? (
        <View style={styles.suggestions}>
          {matches.map((suggestion) => (
            <Pressable
              accessibilityLabel={`Add ${suggestion.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={4}
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
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderRadius: radii.tag,
    borderWidth: outline,
    flexDirection: 'row',
    gap: spacing[4],
    paddingLeft: spacing[10],
    paddingRight: spacing[4],
  },
  chipText: {
    color: colors.ink,
    ...typography.tag,
  },
  disabled: {
    backgroundColor: colors.paper,
    opacity: 0.6,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.muted,
    borderRadius: radii.control,
    borderWidth: outline,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    minHeight: 44,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
  },
  input: {
    color: colors.ink,
    flexGrow: 1,
    minWidth: 100,
    paddingVertical: spacing[4],
    ...typography.body,
  },
  pressed: {
    opacity: 0.7,
  },
  remove: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  suggestion: {
    backgroundColor: colors.tealWash,
    borderRadius: radii.tag,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
  },
  suggestionText: {
    color: colors.ink,
    ...typography.tag,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[8],
  },
});
