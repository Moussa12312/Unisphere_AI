import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const TeacherCoursesScreen = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourses = async () => {
    try {
      const data = await DataService.getTeacherCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading teacher courses:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  return (
    <View style={styles.container}>
      <Header title="Mes Modules d'Enseignement" subtitle="Année Académique 2025-2026" role="teacher" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleTeacher]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleTeacher} style={{ marginVertical: 30 }} />
        ) : courses.length > 0 ? (
          courses.map((c, i) => (
            <View key={c.id || i} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.code}>{c.code || 'COURS'}</Text>
                  <Text style={styles.name}>{c.title || c.name || 'Module Pédagogique'}</Text>
                </View>
                <View style={styles.creditsBadge}>
                  <Text style={styles.creditsText}>{c.credits || 6} ECTS</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>🎓 {c.department || c.level || 'Filière'}</Text>
                <Text style={styles.meta}>⏱️ {c.hours || '45'}h de cours</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun cours assigné</Text>
            <Text style={styles.emptySubtitle}>Les cours créés par l'administration apparaîtront ici.</Text>
          </View>
        )}
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
  meta: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default TeacherCoursesScreen;
