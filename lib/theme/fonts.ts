import {
  useFonts as useSora,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

export function useAppFonts(): boolean {
  const [loaded] = useSora({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    JetBrainsMono_500Medium,
  });
  return loaded;
}
