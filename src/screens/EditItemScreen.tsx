import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { ItemForm } from '../components/ItemForm';
import { QueryStateView } from '../components/QueryStateView';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import type { ErrorCopyOverrides } from '../lib/errorCopy';
import { hasPhotoChanges, type PhotoDraft } from '../lib/itemPhotos';
import type { ItemDetail } from '../lib/items';
import { isItemId, useItemDetailQuery } from '../query/useItemDetailQuery';
import { useUpdateItemMutation } from '../query/useUpdateItemMutation';
import { colors } from '../theme';

const TITLE = 'Edit item';

const MISSING_ITEM_COPY = {
  title: 'This item is gone',
  message: 'It may have been given away or removed.',
};

const ERROR_OVERRIDES: ErrorCopyOverrides = {
  NOT_FOUND: { ...MISSING_ITEM_COPY, canRetry: false },
};

const NOT_OWNER_COPY = {
  title: "You can't edit this item",
  message: 'You can only edit your own items.',
};

type EditFormProps = {
  item: ItemDetail;
};

function EditForm({ item }: EditFormProps) {
  const router = useRouter();
  const updateItem = useUpdateItemMutation();
  const guard = useDiscardGuard();
  // The form reads these once on mount, so pin them to the same snapshot.
  const [initialPhotos] = useState<PhotoDraft[]>(() =>
    item.images.map((image) => ({
      kind: 'existing',
      id: image.id,
      url: image.url,
    })),
  );
  const [initialIds] = useState(() => item.images.map((image) => image.id));

  return (
    <>
      <ItemForm
        error={updateItem.error}
        initialValues={{
          name: item.name,
          description: item.description,
          category_id: item.category.id,
          tags: item.tags.map((tag) => tag.name),
          is_giveaway: item.is_giveaway,
          giveaway_visibility: item.giveaway_visibility,
        }}
        initialPhotos={initialPhotos}
        onClearError={() => updateItem.reset()}
        onDirtyChange={guard.onDirtyChange}
        onSubmit={(input, photos) =>
          updateItem.mutate(
            {
              id: item.id,
              input,
              // A text-only edit stays JSON.
              changes: hasPhotoChanges(photos, initialIds) ? photos : undefined,
            },
            {
              onSuccess: () => {
                guard.allowLeave();
                router.back();
              },
            },
          )
        }
        pending={updateItem.isPending}
        submitLabel="Save changes"
      />

      <ConfirmDialog
        {...guard.dialog}
        confirmLabel="Discard"
        destructive
        message="Your changes won't be saved."
        title="Discard changes?"
      />
    </>
  );
}

export function EditItemScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, error, isPending, isFetching, refetch } =
    useItemDetailQuery(rawId);

  if (!isItemId(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: TITLE }} />
        <ErrorState {...MISSING_ITEM_COPY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: TITLE }} />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading item"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          data.viewer.is_owner ? (
            <EditForm item={data.item} />
          ) : (
            <ErrorState {...NOT_OWNER_COPY} />
          )
        ) : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
