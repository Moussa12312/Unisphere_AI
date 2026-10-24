import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const TeacherCoursesScreen = () => {
  const courses = [
    { code: 'INF301', name: 'Génie Logiciel & Architecture', class: 'Licence 3 Info', students: 48, hours: '45h', credits: 6 },
    { code: 'INF302', name: 'Intelligence Artificielle & ML', class: 'Master 1 Info', students: 32, hours: '60h', credits: 6 },
    { code: 'INF204', name: 'Algorithmique & Structures', class: 'Licence 2 Info', students: 62, hours: '45h', credits: 5 },
  ];

  return (
    <View style={styles.container}>
      <Header title="Mes Modules d'Enseignement" subtitle="Année Académique 2025-2026" role="teacher" />

      <ScrollView contentContainerStyle={styles.content}>
        {courses.map((c, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.name}>{c.name}</Text>
              </View>
              <View style={styles.creditsBadge}>
                <Text style={styles.creditsText}>{c.credits} ECTS</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.meta}>🎓 {c.class}</Text>
              <Text style={styles.meta}>👥 {c.students} étudiants</Text>
              <Text style={styles.meta}>⏱️ {c.hours}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  code: { fontSize: 11, fontWeight: '800', color: Colors.roleTeacher },
  name: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 2 },
  creditsBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  creditsText: { fontSize: 11, fontWeight: '800', color: Colors.roleTeacher },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  meta: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});

export default TeacherCoursesScreen;
