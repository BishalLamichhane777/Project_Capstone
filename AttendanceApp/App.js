import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

// ── New teacher screens ──────────────────────────────────────────────────────
import TeacherClassesScreen from './screens/TeacherClassesScreen';
import TeacherReportsScreen from './screens/TeacherReportsScreen';
import TeacherProfileScreen from './screens/TeacherProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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

        {/* ── Teacher ── */}
        <Stack.Screen name="TeacherDashboard"   component={TeacherDashboardScreen} />
        <Stack.Screen name="StartClass"         component={StartClassScreen} />
        <Stack.Screen name="TeacherClasses"     component={TeacherClassesScreen} />
        <Stack.Screen name="TeacherReports"     component={TeacherReportsScreen} />
        <Stack.Screen name="TeacherProfile"     component={TeacherProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}