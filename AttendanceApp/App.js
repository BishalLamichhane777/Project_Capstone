import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SubmitWaiverScreen from './screens/SubmitWaiverScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import ClassesScreen from './screens/ClassesScreen';
import ProfileScreen from './screens/ProfileScreen';
import WaiverStatusScreen from './screens/WaiverStatusScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminWaiversScreen from './screens/AdminWaiversScreen';
import ManageSchedulesScreen from './screens/ManageSchedulesScreen';
import AddStudentFaceScreen from './screens/AddStudentFaceScreen';
import StudentAnalyticsScreen from './screens/StudentAnalyticsScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';
import SendAlertsScreen from './screens/SendAlertsScreen';
import ExportReportsScreen from './screens/ExportReportsScreen';
import TeacherDashboardScreen from './screens/TeacherDashboardScreen';
import StartClassScreen from './screens/StartClassScreen';
import TeacherClassesScreen from './screens/TeacherClassesScreen';
import TeacherReportsScreen from './screens/TeacherReportsScreen';
import TeacherProfileScreen from './screens/TeacherProfileScreen';
import ManageBatchesScreen from './screens/ManageBatchesScreen';
import ManageBatchDetailScreen from './screens/ManageBatchDetailScreen';
import NotificationsScreen from './screens/NotificationsScreen';

import { AuthProvider } from './context/AuthContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* ── Auth ── */}
          <Stack.Screen name="Login"              component={LoginScreen} />

          {/* ── Student ── */}
          <Stack.Screen name="Home"               component={HomeScreen} />
          <Stack.Screen name="SubmitWaiver"       component={SubmitWaiverScreen} />
          <Stack.Screen name="AttendanceHistory"  component={AttendanceHistoryScreen} />
          <Stack.Screen name="Classes"            component={ClassesScreen} />
          <Stack.Screen name="WaiverStatus"       component={WaiverStatusScreen} />
          <Stack.Screen name="Profile"            component={ProfileScreen} />

          {/* ── Admin ── */}
          <Stack.Screen name="AdminDashboard"     component={AdminDashboardScreen} />
          <Stack.Screen name="AdminWaivers"       component={AdminWaiversScreen} />
          <Stack.Screen name="ManageSchedules"    component={ManageSchedulesScreen} />
          <Stack.Screen name="AddStudentFace"     component={AddStudentFaceScreen} />
          <Stack.Screen name="StudentAnalytics"   component={StudentAnalyticsScreen} />
          <Stack.Screen name="AdminSettings"      component={AdminSettingsScreen} />
          <Stack.Screen name="SendAlerts"         component={SendAlertsScreen} />
          <Stack.Screen name="ExportReports"      component={ExportReportsScreen} />
          <Stack.Screen name="AdminReports"       component={ExportReportsScreen} />

          {/* ── Batch Management ── */}
          <Stack.Screen name="ManageBatches"     component={ManageBatchesScreen} />
          <Stack.Screen name="ManageBatchDetail" component={ManageBatchDetailScreen} />

          {/* ── Teacher ── */}
          <Stack.Screen name="TeacherDashboard"   component={TeacherDashboardScreen} />
          <Stack.Screen name="StartClass"         component={StartClassScreen} />
          <Stack.Screen name="TeacherClasses"     component={TeacherClassesScreen} />
          <Stack.Screen name="TeacherReports"     component={TeacherReportsScreen} />
          <Stack.Screen name="TeacherProfile"     component={TeacherProfileScreen} />
          <Stack.Screen name="TeacherStudents"    component={StudentAnalyticsScreen} />

          {/* ── Shared ── */}
          <Stack.Screen name="Notifications"      component={NotificationsScreen} />
        </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}