import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { RobotoMono_400Regular, RobotoMono_400Regular_Italic, RobotoMono_700Bold } from '@expo-google-fonts/roboto-mono';
import { Rubik_800ExtraBold } from '@expo-google-fonts/rubik/800ExtraBold';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StoreProvider } from '@/lib/store';
import { useTema } from '@/lib/tema';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const { cor } = useTema();
  const [prontas, erro] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, RobotoMono_400Regular, RobotoMono_400Regular_Italic, RobotoMono_700Bold, Rubik_800ExtraBold });
  // Se a fonte não carregar, segue com a fonte do sistema em vez de ficar na tela de abertura.
  useEffect(() => { if (prontas || erro) SplashScreen.hideAsync(); }, [prontas, erro]);
  // No navegador, o fundo da página acompanha o tema (aparece ao puxar a tela além do fim).
  useEffect(() => { if (Platform.OS === 'web') document.body.style.background = cor.fundo; }, [cor.fundo]);
  if (!prontas && !erro) return null;
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cor.fundo }, animation: 'fade' }} />
    </StoreProvider>
  );
}
