import React, { useContext, useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import theme from './src/theme';

import LottieSplashScreen from './screens/LottieSplashScreen';
import LoadingScreen from './components/LoadingScreen';

import LoginScreen from './screens/LoginScreen';
import TeacherHomeScreen from './screens/TeacherHomeScreen';
import TeacherSessionScreen from './screens/TeacherSessionScreen';
import TeacherReportsScreen from './screens/TeacherReportsScreen';
import TeacherAnalyticsScreen from './screens/TeacherAnalyticsScreen';
import StudentHomeScreen from './screens/StudentHomeScreen';
import StudentAttendanceScreen from './screens/StudentAttendanceScreen';
import StudentHistoryScreen from './screens/StudentHistoryScreen';
import StudentSummaryScreen from './screens/StudentSummaryScreen';
import ProfileScreen from './screens/ProfileScreen';
import TimetableScreen from './screens/TimetableScreen';
import ODApplyScreen from './screens/ODApplyScreen';
import AdvisorDashboard from './screens/AdvisorDashboard';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import CreateAnnouncementScreen from './screens/CreateAnnouncementScreen';
import AIChatScreen from './screens/AIChatScreen';
import QuizGenScreen from './screens/QuizGenScreen';
import StudentQuizJoinScreen from './screens/StudentQuizJoinScreen';
import StudentQuizScreen from './screens/StudentQuizScreen';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TeacherTabs = () => {
  const { colors: COLORS } = useTheme();

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Reports') iconName = focused ? 'document-text' : 'document-text-outline';
        else if (route.name === 'Analytics') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarStyle: {
        backgroundColor: COLORS.bgMid,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        elevation: 0,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      headerShown: false,
    })}>
      <Tab.Screen name="Home" component={TeacherHomeScreen} />
      <Tab.Screen name="Reports" component={TeacherReportsScreen} />
      <Tab.Screen name="Analytics" component={TeacherAnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const StudentTabs = () => {
  const { colors: COLORS } = useTheme();

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'History') iconName = focused ? 'calendar' : 'calendar-outline';
        else if (route.name === 'Summary') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarStyle: {
        backgroundColor: COLORS.bgMid,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        elevation: 0,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      headerShown: false,
    })}>
      <Tab.Screen name="Home" component={StudentHomeScreen} />
      <Tab.Screen name="History" component={StudentHistoryScreen} />
      <Tab.Screen name="Summary" component={StudentSummaryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNav = () => {
  const { userToken, userRole, isLoading, splashLoading, setSplashLoading } = useContext(AuthContext);
  const { colors: COLORS } = useTheme();

  // useEffect(() => {
  //   if (!splashLoading) {
  //     SplashScreen.hideAsync();
  //   }
  // }, [splashLoading]);

  if (splashLoading) {
    return <LottieSplashScreen onFinish={() => setSplashLoading(false)} />;
  }

  // if (isLoading) {
  //   return <LoadingScreen visible={true} message="Authenticating..." />;
  // }

  const darkHeader = {
    headerShown: true,
    headerStyle: { backgroundColor: COLORS.bgMid, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
    headerTintColor: COLORS.textPrimary,
    headerTitleStyle: { fontWeight: '700', fontSize: 17, color: COLORS.textPrimary },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken === null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : userRole === 'teacher' ? (
          <>
            <Stack.Screen name="TeacherMain" component={TeacherTabs} />
            <Stack.Screen name="TeacherSession" component={TeacherSessionScreen} options={{ ...darkHeader, title: 'Live Session' }} />
            <Stack.Screen name="Timetable" component={TimetableScreen} options={{ ...darkHeader, title: 'Weekly Schedule' }} />
            <Stack.Screen name="AdvisorDashboard" component={AdvisorDashboard} options={{ ...darkHeader, title: 'Pending Approvals' }} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ ...darkHeader, title: 'Notice Board' }} />
            <Stack.Screen name="CreateAnnouncement" component={CreateAnnouncementScreen} options={{ ...darkHeader, title: 'New Announcement' }} />
            <Stack.Screen name="QuizGen" component={QuizGenScreen} options={{ ...darkHeader, title: 'AI Quiz Gen' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentMain" component={StudentTabs} />
            <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} options={{ ...darkHeader, title: 'Mark Attendance' }} />
            <Stack.Screen name="Timetable" component={TimetableScreen} options={{ ...darkHeader, title: 'Weekly Schedule' }} />
            <Stack.Screen name="ODApply" component={ODApplyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ ...darkHeader, title: 'Notice Board' }} />
            <Stack.Screen name="AIChat" component={AIChatScreen} options={{ ...darkHeader, title: 'AI Assistant' }} />
            <Stack.Screen name="StudentQuizJoin" component={StudentQuizJoinScreen} options={{ ...darkHeader, title: 'Join Live Quiz' }} />
            <Stack.Screen name="StudentQuiz" component={StudentQuizScreen} options={{ title: 'Quiz Time', headerShown: false }} />
            <Stack.Screen name="FaceLiveness" component={require('./screens/FaceLivenessScreen').default} options={{ title: 'Live Verification', headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer >
  );
};

export default function App() {
  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
      try {
        // Expo Go SDK 53 removes support for remote notifications in Go client
        // token = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (e) {
        console.log('Push token fetch failed (Expected in Expo Go):', e);
      }
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (e) {
        console.log('Notification Channel setup failed (Expected in Expo Go):', e);
      }
    }
    return token;
  }

  return (
    <PaperProvider theme={theme}>
      <View style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <AppNav />
          </ThemeProvider>
        </AuthProvider>
      </View>
    </PaperProvider>
  );
}

