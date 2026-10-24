import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const StudentGradesScreen = () => {
  const grades = [
    { code: 'INF301', name: 'Génie Logiciel & Architecture', cc: 15.5, exam: 16.0, average: 15.8, credits: 6, status: 'Validé' },
    { code: 'INF302', name: 'Intelligence Artificielle & ML', cc: 16.0, exam: 17.5, average: 17.0, credits: 6, status: 'Validé' },
    { code: 'MAT301', name: 'Statistiques & Probabilités', cc: 12.0, exam: 13.5, average: 13.0, credits: 4, status: 'Validé' },
    { code: 'RES301', name: 'Réseaux & Protocoles IP', cc: 14.0, exam: 14.5, average: 14.3, credits: 5, status: 'Validé' },
    { code: 'ANG301', name: 'Anglais Professionnel LMD', cc: 17.0, exam: 16.0, average: 16.4, credits: 3, status: 'Validé' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Notes & Crédits LMD" subtitle="Semestre 5 • Licence 3 Informatique" role="student" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Moyenne Générale : 15.30 / 20</Text>
          <Text style={styles.summarySubtitle}>Total Crédits Validés : 24 / 24 ECTS</Text>
        </View>

        <Text style={styles.sectionTitle}>Unités d'Enseignement (UE)</Text>
        {grades.map((item, idx) => (
          <View key={idx} style={styles.gradeCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.courseCode}>{item.code}</Text>
                <Text style={styles.courseName}>{item.name}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.scoreCol}>
                <Text style={styles.colLabel}>Contrôle Continu</Text>
                <Text style={styles.colValue}>{item.cc} / 20</Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.colLabel}>Examen Final</Text>
                <Text style={styles.colValue}>{item.exam} / 20</Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.colLabel}>Moyenne UE</Text>
                <Text style={[styles.colValue, { color: Colors.accentGreen, fontWeight: '900' }]}>{item.average}</Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.colLabel}>Crédits</Text>
                <Text style={styles.colValue}>{item.credits} ECTS</Text>
              </View>
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
  summaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentGreen,
  },
  summaryTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  summarySubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  gradeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  courseCode: { fontSize: 11, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase' },
  courseName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 2 },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: Colors.accentGreen, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  scoreCol: { alignItems: 'center' },
  colLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  colValue: { fontSize: 13, color: Colors.text, fontWeight: '700', marginTop: 2 },
});

export default StudentGradesScreen;
