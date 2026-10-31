import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { MiniPlayer } from '@/presentation/components/MiniPlayer';
import { color, font } from '@/presentation/theme/tokens';

function TabIcon({
  name,
  focusedName,
  color: c,
  focused,
}: {
  name: string;
  focusedName: string;
  color: ColorValue;
  focused: boolean;
}) {
  return <MaterialCommunityIcons name={(focused ? focusedName : name) as never} size={24} color={c as string} />;
}

const icon = (name: string, focusedName: string) => {
  const Icon = (p: { color: ColorValue; focused: boolean }) => <TabIcon name={name} focusedName={focusedName} {...p} />;
  Icon.displayName = `TabIcon(${name})`;
  return Icon;
};

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.onSurface,
          tabBarInactiveTintColor: color.onSurfaceVariant,
          tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.outlineVariant, height: 80 },
          tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
          sceneStyle: { backgroundColor: color.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
        <Tabs.Screen name="charts" options={{ title: 'Charts', tabBarIcon: icon('chart-bar', 'chart-bar') }} />
        <Tabs.Screen
          name="game"
          options={{ title: 'Game', tabBarIcon: icon('gamepad-variant-outline', 'gamepad-variant') }}
        />
        <Tabs.Screen name="diary" options={{ title: 'Diary', tabBarIcon: icon('book-outline', 'book') }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account-outline', 'account') }} />
      </Tabs>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 80 }}>
        <MiniPlayer />
      </View>
    </View>
  );
}
