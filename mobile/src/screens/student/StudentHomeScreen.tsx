import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const StudentHomeScreen = ({ navigation, onLogout }: any) => {
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    const data = await DataService.getStudentProfile();
    setProfile(data);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <View style={styles.container}>
      <Header
        title="Espace Étudiant"
        subtitle={profile ? `${profile.filiere} • ${profile.level}` : 'Portail Académique'}
        userName={profile?.full_name || 'Étudiant'}
        role="student"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary]} />}
      >
        {/* Résumé des statistiques */}
        <View style={styles.statsRow}>
          <StatCard label="Moyenne Semestre" value="14.85 / 20" icon="📈" color={Colors.accentGreen} subtext="Admis - Mention Bien" />
          <StatCard label="Présence" value="96.2 %" icon="⏱️" color={Colors.roleStudent} subtext="Assiduité exemplaire" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Crédits LMD" value="28 / 30" icon="🎯" color={Colors.accentPurple} subtext="Semestre 5 validé" />
          <StatCard label="Scolarité" value="À jour" icon="✅" color={Colors.accentGreen} subtext="Tranche 2 acquittée" />
        </View>

        {/* Accès rapide aux services */}
        <Text style={styles.sectionTitle}>Accès direct aux modules</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation?.navigate('StudentGrades')}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuLabel}>Mes Notes & UE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation?.navigate('StudentCard')}>
            <Text style={styles.menuIcon}>🪪</Text>
            <Text style={styles.menuLabel}>Carte Étudiante QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation?.navigate('StudentSchedule')}>
            <Text style={styles.menuIcon}>📅</Text>
            <Text style={styles.menuLabel}>Emploi du Temps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation?.navigate('StudentPayments')}>
            <Text style={styles.menuIcon}>💳</Text>
            <Text style={styles.menuLabel}>Mes Paiements</Text>
          </TouchableOpacity>
        </View>

        {/* Prochains cours du jour */}
        <Text style={styles.sectionTitle}>Cours d'aujourd'hui</Text>
        <View style={styles.card}>
          <View style={styles.courseItem}>
            <View style={styles.courseTimeBadge}>
              <Text style={styles.courseTime}>08:30 - 10:30</Text>
            </View>
            <View style={styles.courseDetails}>
              <Text style={styles.courseName}>Algorithmique Avancée & Graphes</Text>
              <Text style={styles.courseRoom}>Salle B204 • Prof. Coulibaly</Text>
            </View>
          </View>

          <View style={[styles.courseItem, styles.courseItemBorder]}>
            <View style={[styles.courseTimeBadge, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.courseTime, { color: Colors.accent }]}>11:00 - 13:00</Text>
            </View>
            <View style={styles.courseDetails}>
              <Text style={styles.courseName}>Bases de Données & SQL Avancé</Text>
              <Text style={styles.courseRoom}>Amphi 1 • Dr. Traoré</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  menuItem: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: { fontSize: 28, marginBottom: 8 },
  menuLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  courseItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseItemBorder: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  courseTimeBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  courseTime: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark },
  courseDetails: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  courseRoom: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});

export default StudentHomeScreen;
