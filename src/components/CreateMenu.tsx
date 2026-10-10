import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';

import { colors, spacing } from '../theme';
import { Icon } from './Icon';
import { OptionSheet, type OptionSheetOption } from './OptionSheet';

type CreateRoute = '/item/new';

// "Create a request" joins this list with request writes.
const CREATE_OPTIONS: OptionSheetOption<CreateRoute>[] = [
  { value: '/item/new', label: 'List an item' },
];

// The header "+" that opens the Create sheet, as the web app's nav menu does.
export function CreateMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (route: CreateRoute) => {
      router.push(route);
    },
    [router],
  );

  return (
    <>
      <Pressable
        accessibilityLabel="Create"
        accessibilityRole="button"
        hitSlop={spacing[8]}
        onPress={handleOpen}
      >
        <Icon color={colors.primaryDark} name="plus" size={20} />
      </Pressable>
      <OptionSheet
        onClose={handleClose}
        onSelect={handleSelect}
        options={CREATE_OPTIONS}
        title="Create"
        visible={isOpen}
      />
    </>
  );
}
