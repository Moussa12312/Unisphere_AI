import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const StudentScheduleScreen = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedule = async () => {
    try {
      const data = await DataService.getStudentSchedule();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading student schedule:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  // Grouper par jour si disponible
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <View style={styles.container}>
      <Header title="Emploi du Temps LMD" subtitle="Planning des Cours & Salles" role="student" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 30 }} />
        ) : schedules.length > 0 ? (
          schedules.map((item, idx) => (
            <View key={item.id || idx} style={styles.scheduleCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{item.day_of_week || 'Jour de cours'}</Text>
                </View>
                <Text style={styles.timeText}>
                  {item.start_time || '08:30'} - {item.end_time || '10:30'}
                </Text>
              </View>

              <Text style={styles.courseName}>{item.subject || 'Cours Magistral'}</Text>

              <View style={styles.detailsRow}>
                <Text style={styles.roomText}>📍 Salle : {item.room || 'Non définie'}</Text>
                <Text style={styles.teacherText}>👨‍🏫 {item.teacher || 'Enseignant référent'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Emploi du temps en cours de programmation</Text>
            <Text style={styles.emptySubtitle}>Les créneaux de cours validés par le secrétariat s'afficheront ici.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  scheduleCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  dayText: { color: Colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  timeText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  courseName: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  roomText: { fontSize: 12, color: Colors.accent, fontWeight: '700' },
  teacherText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default StudentScheduleScreen;
