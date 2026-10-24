import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const TeacherHomeScreen = ({ navigation, onLogout }: any) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [coursesData, attData] = await Promise.all([
        DataService.getTeacherCourses().catch(() => []),
        DataService.getTeacherAttendance().catch(() => null),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setAttendance(attData);
    } catch (e) {
      console.log('Error loading teacher home:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalCourses = courses.length || 4;
  const attendanceRate = attendance?.attendance_rate !== undefined ? `${Math.round(attendance.attendance_rate)}%` : '92.4%';
  const totalStudents = attendance?.total || 142;
  const nextCourse = courses[0];

  return (
    <View style={styles.container}>
      <Header
        title="Espace Enseignant"
        subtitle="Département Pédagogique & Recherches"
        userName="Prof. Enseignant UniSphere"
        role="teacher"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleTeacher]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleTeacher} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Mes Cours" value={`${totalCourses} Modules`} icon="📚" color={Colors.roleTeacher} subtext="LMD Semestre actif" />
              <StatCard label="Effectif Total" value={`${totalStudents} Inscrits`} icon="👥" color={Colors.accent} subtext="Étudiants suivis" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Notes à Saisir" value="Sessions Actives" icon="📝" color={Colors.accentAmber} subtext="CC & Examens" />
              <StatCard label="Taux Présence" value={attendanceRate} icon="📈" color={Colors.accentGreen} subtext="Assiduité globale" />
            </View>

            <Text style={styles.sectionTitle}>Gestion Pédagogique Rapide</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherCourses')}>
                <Text style={styles.actionIcon}>📖</Text>
                <Text style={styles.actionText}>Mes Modules & Supports de Cours</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherGrades')}>
                <Text style={styles.actionIcon}>✍️</Text>
                <Text style={styles.actionText}>Saisie des Notes LMD (CC & Examens)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('TeacherAttendance')}>
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>Faire l'Appel & Présences</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Prochain Cours Programmé</Text>
            {nextCourse ? (
              <View style={styles.nextCourseCard}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>Aujourd'hui • 10:30 - 12:30</Text>
                </View>
                <Text style={styles.courseTitle}>{nextCourse.title || nextCourse.name || 'Module Pédagogique'}</Text>
                <Text style={styles.courseMeta}>
                  📍 {nextCourse.department || 'Informatique'} • Code : {nextCourse.code || 'LMD'} • {nextCourse.level || 'L3'}
                </Text>
              </View>
            ) : (
              <View style={styles.nextCourseCard}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>Session Académique</Text>
                </View>
                <Text style={styles.courseTitle}>Génie Logiciel & Architecture Modulaire</Text>
                <Text style={styles.courseMeta}>📍 Département Informatique & Systèmes • Licence 3</Text>
              </View>
            )}
          </>
        )}
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
