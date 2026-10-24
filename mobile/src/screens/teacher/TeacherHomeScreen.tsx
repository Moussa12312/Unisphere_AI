import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const TeacherHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Espace Enseignant"
        subtitle="Département Informatique & Systèmes"
        userName="Dr. Coulibaly"
        role="teacher"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Mes Cours" value="4 Modules" icon="📚" color={Colors.roleTeacher} subtext="L2 & L3 Informatique" />
          <StatCard label="Étudiants" value="142" icon="👥" color={Colors.accent} subtext="Total inscrits" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Notes à saisir" value="1 Session" icon="📝" color={Colors.accentAmber} subtext="CC2 Algorithmique" />
          <StatCard label="Taux Présence" value="92.4 %" icon="📈" color={Colors.accentGreen} subtext="Moyenne cours" />
        </View>

        <Text style={styles.sectionTitle}>Gestion Pédagogique Rapide</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherCourses')}>
            <Text style={styles.actionIcon}>📖</Text>
            <Text style={styles.actionText}>Mes Modules & Supports</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherGrades')}>
            <Text style={styles.actionIcon}>✍️</Text>
            <Text style={styles.actionText}>Saisie des Notes LMD</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherAttendance')}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Faire l'Appel du Cours</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Prochain Cours Programmé</Text>
        <View style={styles.nextCourseCard}>
          <View style={styles.timeTag}>
            <Text style={styles.timeTagText}>Aujourd'hui • 10:30 - 12:30</Text>
          </View>
          <Text style={styles.courseTitle}>Génie Logiciel & Architecture Modulaire</Text>
          <Text style={styles.courseMeta}>📍 Salle B204 • 48 Étudiants • Licence 3</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 12 },
  actionGrid: { gap: 10, marginBottom: 16 },
  actionBtn: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  nextCourseCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, borderLeftColor: Colors.roleTeacher },
  timeTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  timeTagText: { fontSize: 11, fontWeight: '800', color: Colors.roleTeacher },
  courseTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  courseMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});

export default TeacherHomeScreen;
