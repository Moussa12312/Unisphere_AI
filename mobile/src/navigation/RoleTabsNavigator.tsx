import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Colors from '../constants/colors';

// Screens Étudiant
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentGradesScreen from '../screens/student/StudentGradesScreen';
import StudentCardScreen from '../screens/student/StudentCardScreen';
import StudentScheduleScreen from '../screens/student/StudentScheduleScreen';
import StudentPaymentsScreen from '../screens/student/StudentPaymentsScreen';

// Screens Enseignant
import TeacherHomeScreen from '../screens/teacher/TeacherHomeScreen';
import TeacherCoursesScreen from '../screens/teacher/TeacherCoursesScreen';
import TeacherGradesScreen from '../screens/teacher/TeacherGradesScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';

// Screens Secrétaire
import SecretaryHomeScreen from '../screens/secretary/SecretaryHomeScreen';
import SecretaryStudentsScreen from '../screens/secretary/SecretaryStudentsScreen';
import SecretaryCertificatesScreen from '../screens/secretary/SecretaryCertificatesScreen';
import SecretarySchedulesScreen from '../screens/secretary/SecretarySchedulesScreen';

// Screens Censeur
import CenseurHomeScreen from '../screens/censeur/CenseurHomeScreen';
import CenseurBulletinsScreen from '../screens/censeur/CenseurBulletinsScreen';
import CenseurAnomaliesScreen from '../screens/censeur/CenseurAnomaliesScreen';

// Screens Admin
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminAccountsScreen from '../screens/admin/AdminAccountsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

// Screens Gardien
import GuardScannerScreen from '../screens/guard/GuardScannerScreen';
import GuardHistoryScreen from '../screens/guard/GuardHistoryScreen';

// Screens Comptable
import AccountantHomeScreen from '../screens/accountant/AccountantHomeScreen';
import AccountantPaymentsScreen from '../screens/accountant/AccountantPaymentsScreen';
import AccountantReportsScreen from '../screens/accountant/AccountantReportsScreen';

// Screens Alumni
import AlumniHomeScreen from '../screens/alumni/AlumniHomeScreen';
import AlumniDirectoryScreen from '../screens/alumni/AlumniDirectoryScreen';
import AlumniProfileScreen from '../screens/alumni/AlumniProfileScreen';

const Tab = createBottomTabNavigator();

const ALL_ROLES = [
  { id: 'student', label: 'Étudiant', icon: '🎓' },
  { id: 'teacher', label: 'Enseignant', icon: '👨‍🏫' },
  { id: 'secretary', label: 'Secrétaire', icon: '📁' },
  { id: 'censeur', label: 'Censeur', icon: '⚖️' },
  { id: 'admin', label: 'Admin', icon: '👑' },
  { id: 'guard', label: 'Gardien', icon: '🛡️' },
  { id: 'accountant', label: 'Comptable', icon: '💰' },
  { id: 'alumni', label: 'Alumni', icon: '🤝' },
];

function ScrollableTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Text style={styles.tabIcon}>{options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : '📌'}</Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const RoleTabsNavigator = ({ initialRole = 'student', onLogout }: { initialRole: string; onLogout: () => void }) => {
  const [currentRole, setCurrentRole] = useState(initialRole.toLowerCase());
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* Barre supérieure rapide de basculement d'espace (8 Rôles) */}
      <View style={styles.roleBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleBarScroll}>
          <Text style={styles.roleBarLabel}>ESPACES :</Text>
          {ALL_ROLES.map((r) => {
            const active = currentRole === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setCurrentRole(r.id)}
                style={[styles.rolePill, active && styles.rolePillActive]}
              >
                <Text style={styles.rolePillIcon}>{r.icon}</Text>
                <Text style={[styles.rolePillText, active && styles.rolePillTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Tab.Navigator
        tabBar={(props) => <ScrollableTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* ESPACE ÉTUDIANT */}
        {currentRole === 'student' && (
          <>
            <Tab.Screen
              name="StudentHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <StudentHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="StudentGrades" component={StudentGradesScreen} options={{ tabBarLabel: 'Notes', tabBarIcon: () => '📊' }} />
            <Tab.Screen name="StudentCard" component={StudentCardScreen} options={{ tabBarLabel: 'Carte QR', tabBarIcon: () => '🪪' }} />
            <Tab.Screen name="StudentSchedule" component={StudentScheduleScreen} options={{ tabBarLabel: 'Planning', tabBarIcon: () => '📅' }} />
            <Tab.Screen name="StudentPayments" component={StudentPaymentsScreen} options={{ tabBarLabel: 'Paiements', tabBarIcon: () => '💳' }} />
          </>
        )}

        {/* ESPACE ENSEIGNANT */}
        {currentRole === 'teacher' && (
          <>
            <Tab.Screen
              name="TeacherHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <TeacherHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="TeacherCourses" component={TeacherCoursesScreen} options={{ tabBarLabel: 'Mes Cours', tabBarIcon: () => '📚' }} />
            <Tab.Screen name="TeacherGrades" component={TeacherGradesScreen} options={{ tabBarLabel: 'Saisie Notes', tabBarIcon: () => '✍️' }} />
            <Tab.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} options={{ tabBarLabel: 'Appel', tabBarIcon: () => '📋' }} />
          </>
        )}

        {/* ESPACE SECRÉTAIRE */}
        {currentRole === 'secretary' && (
          <>
            <Tab.Screen
              name="SecretaryHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <SecretaryHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="SecretaryStudents" component={SecretaryStudentsScreen} options={{ tabBarLabel: 'Dossiers', tabBarIcon: () => '👥' }} />
            <Tab.Screen name="SecretaryCertificates" component={SecretaryCertificatesScreen} options={{ tabBarLabel: 'Certificats', tabBarIcon: () => '📑' }} />
            <Tab.Screen name="SecretarySchedules" component={SecretarySchedulesScreen} options={{ tabBarLabel: 'Salles', tabBarIcon: () => '🏫' }} />
          </>
        )}

        {/* ESPACE CENSEUR */}
        {currentRole === 'censeur' && (
          <>
            <Tab.Screen
              name="CenseurHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <CenseurHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="CenseurBulletins" component={CenseurBulletinsScreen} options={{ tabBarLabel: 'Bulletins', tabBarIcon: () => '📑' }} />
            <Tab.Screen name="CenseurAnomalies" component={CenseurAnomaliesScreen} options={{ tabBarLabel: 'Anomalies', tabBarIcon: () => '🔍' }} />
          </>
        )}

        {/* ESPACE ADMIN */}
        {currentRole === 'admin' && (
          <>
            <Tab.Screen
              name="AdminHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <AdminHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="AdminAccounts" component={AdminAccountsScreen} options={{ tabBarLabel: 'Comptes', tabBarIcon: () => '🛡️' }} />
            <Tab.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ tabBarLabel: 'Paramètres', tabBarIcon: () => '⚙️' }} />
          </>
        )}

        {/* ESPACE GARDIEN */}
        {currentRole === 'guard' && (
          <>
            <Tab.Screen
              name="GuardScanner"
              options={{ tabBarLabel: 'Scanner QR', tabBarIcon: () => '📱' }}
            >
              {(props) => <GuardScannerScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="GuardHistory" component={GuardHistoryScreen} options={{ tabBarLabel: 'Journal Entrées', tabBarIcon: () => '🚪' }} />
          </>
        )}

        {/* ESPACE COMPTABLE */}
        {currentRole === 'accountant' && (
          <>
            <Tab.Screen
              name="AccountantHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <AccountantHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="AccountantPayments" component={AccountantPaymentsScreen} options={{ tabBarLabel: 'Encaissements', tabBarIcon: () => '🧾' }} />
            <Tab.Screen name="AccountantReports" component={AccountantReportsScreen} options={{ tabBarLabel: 'Clôture Caisse', tabBarIcon: () => '📊' }} />
          </>
        )}

        {/* ESPACE ALUMNI */}
        {currentRole === 'alumni' && (
          <>
            <Tab.Screen
              name="AlumniHome"
              options={{ tabBarLabel: 'Accueil', tabBarIcon: () => '🏠' }}
            >
              {(props) => <AlumniHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen name="AlumniDirectory" component={AlumniDirectoryScreen} options={{ tabBarLabel: 'Annuaire', tabBarIcon: () => '📖' }} />
            <Tab.Screen name="AlumniProfile" component={AlumniProfileScreen} options={{ tabBarLabel: 'Mon Profil', tabBarIcon: () => '👤' }} />
          </>
        )}
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  roleBar: { backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingVertical: 8 },
  roleBarScroll: { paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  roleBarLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginRight: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  rolePillActive: { backgroundColor: Colors.primary },
  rolePillIcon: { fontSize: 13 },
  rolePillText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  rolePillTextActive: { color: Colors.white },
  tabBarContainer: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 8 },
  tabScrollContent: { paddingHorizontal: 12, gap: 8 },
  tabItem: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#FFF7ED' },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontWeight: '800' },
});

export default RoleTabsNavigator;
