import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { HeaderCancelButton } from '../components/HeaderCancelButton';
import { ItemForm } from '../components/ItemForm';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { createCreationToken } from '../lib/creationToken';
import { useCreateItemMutation } from '../query/useCreateItemMutation';
import { colors } from '../theme';

export function NewItemScreen() {
  const router = useRouter();
  const createItem = useCreateItemMutation();
  // One token per form, reused on retry so a timed-out create can't duplicate.
  const [creationToken] = useState(createCreationToken);
  const guard = useDiscardGuard();

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'List an item',
          // iOS draws no back button for the first screen of a nested stack.
          headerLeft:
            Platform.OS === 'ios'
              ? () => <HeaderCancelButton onPress={() => router.back()} />
              : undefined,
        }}
      />

      <ItemForm
        error={createItem.error}
        onClearError={() => createItem.reset()}
        onDirtyChange={guard.onDirtyChange}
        onSubmit={(input, photos) =>
          createItem.mutate(
            { input, creationToken, photos: photos.photos },
            {
              onSuccess: (response) => {
                guard.allowLeave();
                router.replace(`/item/${response.item.id}`);
              },
            },
          )
        }
        pending={createItem.isPending}
        submitLabel="List item"
      />

      <ConfirmDialog
        {...guard.dialog}
        confirmLabel="Discard"
        destructive
        message="Your changes won't be saved."
        title="Discard this item?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
