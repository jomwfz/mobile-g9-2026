import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import { 
  useFonts, 
  Prompt_400Regular, 
  Prompt_500Medium, 
  Prompt_700Bold 
} from '@expo-google-fonts/prompt';

import { COLORS } from './theme';
import LoginScreen from './screens/LoginScreen'; 
import HomeScreen from './screens/HomeScreen';
import GameDetailScreen from './screens/GameDetailScreen';
import SwipeScreen from './screens/SwipeScreen';
import LibraryScreen from './screens/LibraryScreen';
import CommunityScreen from './screens/CommunityScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchFilterScreen from './screens/SearchFilterScreen';
import AIAdvisorScreen from './screens/AIAdvisorScreen';
import CreatorStudioScreen from './screens/CreatorStudioScreen';
import SettingsScreen from './screens/SettingsScreen';
import CartScreen from './screens/CartScreen';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: styles.tabBar,
      tabBarIcon: ({ focused }) => {
        
        // ทำให้ปุ่ม AI Advisor ลอยเด่นขึ้นมาตรงกลาง
        if (route.name === 'AIAdvisor') {
          return (
            <View style={styles.aiButton}>
              <Ionicons name="hardware-chip" size={28} color={COLORS.background} />
            </View>
          );
        }

        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Swipe') iconName = focused ? 'albums' : 'albums-outline';
        else if (route.name === 'Community') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        
        return <Ionicons name={iconName} size={24} color={focused ? COLORS.primary : COLORS.textDim} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Swipe" component={SwipeScreen} />
    <Tab.Screen name="AIAdvisor" component={AIAdvisorScreen} />
    <Tab.Screen name="Community" component={CommunityScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} /> 
    <Stack.Screen name="TabNavigator" component={TabNavigator} /> 
    <Stack.Screen name="GameDetail" component={GameDetailScreen} />
    <Stack.Screen name="SearchFilter" component={SearchFilterScreen} />
    <Stack.Screen name="Library" component={LibraryScreen} />
    <Stack.Screen name="CreatorStudio" component={CreatorStudioScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
  </Stack.Navigator>
);

export default function App() {
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <MainStack />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.card,
    borderRadius: 30,
    height: 70,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  aiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  }
});