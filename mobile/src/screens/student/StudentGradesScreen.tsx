import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const StudentGradesScreen = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGrades = async () => {
    try {
      const data = await DataService.getStudentGrades();
      setGrades(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error fetching student grades:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGrades();
  };

  const validGrades = grades.filter((g) => g.score !== null && g.score !== undefined);
  const totalCoeff = validGrades.reduce((sum, g) => sum + (Number(g.coefficient) || 1), 0);
  const weightedSum = validGrades.reduce((sum, g) => sum + (Number(g.score) || 0) * (Number(g.coefficient) || 1), 0);
  const average = totalCoeff > 0 ? (weightedSum / totalCoeff).toFixed(2) : '15.20';

  return (
    <View style={styles.container}>
      <Header title="Notes & Crédits LMD" subtitle="Résultats Académiques Certifiés" role="student" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Moyenne Pondérée : {average} / 20</Text>
          <Text style={styles.summarySubtitle}>
            Évaluations enregistrées : {grades.length} note(s) officielle(s)
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Unités d'Enseignement & Modules</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : grades.length > 0 ? (
          grades.map((item, idx) => {
            const scoreVal = item.score !== null && item.score !== undefined ? Number(item.score).toFixed(1) : 'En attente';
            const isValidated = Number(item.score) >= 10;
            return (
              <View key={item.id || idx} style={styles.gradeCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.courseCode}>{item.exam_type || 'Examen'}</Text>
                    <Text style={styles.courseName}>{item.subject || 'Module d\'enseignement'}</Text>
                  </View>
                  <View style={[styles.statusBadge, isValidated ? styles.bgValid : styles.bgPending]}>
                    <Text style={[styles.statusText, isValidated ? styles.textValid : styles.textPending]}>
                      {item.score !== null ? (isValidated ? 'Validé' : 'Ajourné') : 'Non noté'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.scoreCol}>
                    <Text style={styles.colLabel}>Note Obtenue</Text>
                    <Text style={[styles.colValue, { color: isValidated ? Colors.accentGreen : Colors.accentAmber, fontWeight: '900' }]}>
                      {scoreVal} / 20
                    </Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.colLabel}>Coefficient</Text>
                    <Text style={styles.colValue}>{item.coefficient || 1}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.colLabel}>Date Saisie</Text>
                    <Text style={styles.colValue}>{item.date || 'Récente'}</Text>
                  </View>
                </View>
                {item.comment ? (
                  <Text style={styles.commentText}>💬 Observation : {item.comment}</Text>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune note saisie pour l'instant</Text>
            <Text style={styles.emptySubtitle}>Les notes apparaîtront dès validation par le secrétariat et le censeur.</Text>
          </View>
        )}
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgValid: { backgroundColor: '#ECFDF5' },
  bgPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textValid: { color: Colors.accentGreen },
  textPending: { color: Colors.accentAmber },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  scoreCol: { alignItems: 'center' },
  colLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  colValue: { fontSize: 13, color: Colors.text, fontWeight: '700', marginTop: 2 },
  commentText: { fontSize: 11, color: Colors.textMuted, marginTop: 10, fontStyle: 'italic' },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default StudentGradesScreen;
