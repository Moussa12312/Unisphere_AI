import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const StudentScheduleScreen = () => {
  const [selectedDay, setSelectedDay] = useState('Lundi');

  const scheduleData: Record<string, any[]> = {
    Lundi: [
      { time: '08:30 - 10:30', course: 'Intelligence Artificielle', room: 'Salle B204', teacher: 'Dr. Coulibaly', type: 'Cours Magistral' },
      { time: '11:00 - 13:00', course: 'Bases de Données Relationnelles', room: 'Labo Info 2', teacher: 'Prof. Traoré', type: 'Travaux Pratiques' },
    ],
    Mardi: [
      { time: '09:00 - 12:00', course: 'Algorithmique & Graphes', room: 'Amphi 1', teacher: 'Dr. Keita', type: 'Cours Magistral' },
      { time: '14:00 - 16:00', course: 'Anglais Technique', room: 'Salle C102', teacher: 'M. Smith', type: 'TD' },
    ],
    Mercredi: [
      { time: '08:30 - 11:30', course: 'Réseaux & Sécurité', room: 'Labo Cisco', teacher: 'Dr. Diarra', type: 'TP' },
    ],
    Jeudi: [
      { time: '10:00 - 12:00', course: 'Génie Logiciel LMD', room: 'Salle B101', teacher: 'Dr. Coulibaly', type: 'Cours' },
      { time: '14:00 - 17:00', course: 'Projet Intégrateur & IA', room: 'Incubateur', teacher: 'Équipe Tech', type: 'Projet' },
    ],
    Vendredi: [
      { time: '08:30 - 10:30', course: 'Statistiques & Data Science', room: 'Amphi 2', teacher: 'Prof. Touré', type: 'Cours' },
    ],
    Samedi: [
      { time: '09:00 - 12:00', course: 'Séminaire Professionnel & Entrepreneuriat', room: 'Amphi Principal', teacher: 'Intervenants Externes', type: 'Conférence' },
    ],
  };

  const dayCourses = scheduleData[selectedDay] || [];

  return (
    <View style={styles.container}>
      <Header title="Emploi du Temps" subtitle="Semaine Académique Active" role="student" />

      {/* Bar des jours */}
      <View style={styles.daysScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysContent}>
          {DAYS.map((day) => {
            const active = selectedDay === day;
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayTab, active && styles.dayTabActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Planning du {selectedDay}</Text>

        {dayCourses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun cours programmé ce jour-ci.</Text>
          </View>
        ) : (
          dayCourses.map((c, i) => (
            <View key={i} style={styles.courseCard}>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{c.time}</Text>
              </View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>{c.course}</Text>
                <Text style={styles.courseMeta}>📍 {c.room} • 👤 {c.teacher}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{c.type}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  daysScroll: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  daysContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9' },
  dayTabActive: { backgroundColor: Colors.primary },
  dayText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  dayTextActive: { color: Colors.white },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  courseCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: 14 },
  timeBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timeText: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  courseMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  typeText: { fontSize: 10, fontWeight: '800', color: Colors.accent, textTransform: 'uppercase' },
});

export default StudentScheduleScreen;
