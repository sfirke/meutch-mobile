import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { Outfit_800ExtraBold } from '@expo-google-fonts/outfit/800ExtraBold';

// One family per weight: Android ignores fontWeight on custom fonts, so text
// picks its weight by family and never sets fontWeight.
export const fonts = {
  display: {
    500: 'Outfit_500Medium',
    600: 'Outfit_600SemiBold',
    700: 'Outfit_700Bold',
    800: 'Outfit_800ExtraBold',
  },
  body: {
    400: 'Figtree_400Regular',
    500: 'Figtree_500Medium',
    600: 'Figtree_600SemiBold',
    700: 'Figtree_700Bold',
  },
} as const;

// Passed to useFonts in the root layout; keys are the family names above.
export const fontAssets = {
  [fonts.display[500]]: Outfit_500Medium,
  [fonts.display[600]]: Outfit_600SemiBold,
  [fonts.display[700]]: Outfit_700Bold,
  [fonts.display[800]]: Outfit_800ExtraBold,
  [fonts.body[400]]: Figtree_400Regular,
  [fonts.body[500]]: Figtree_500Medium,
  [fonts.body[600]]: Figtree_600SemiBold,
  [fonts.body[700]]: Figtree_700Bold,
};
