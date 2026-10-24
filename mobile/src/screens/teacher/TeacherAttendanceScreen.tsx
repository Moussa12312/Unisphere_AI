import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const TeacherAttendanceScreen = () => {
  const [students, setStudents] = useState([
    { id: 1, name: 'Amadou Diallo', matricule: 'ETU-2026-001', status: 'present' },
    { id: 2, name: 'Fatoumata Koné', matricule: 'ETU-2026-002', status: 'present' },
    { id: 3, name: 'Ibrahim Touré', matricule: 'ETU-2026-003', status: 'absent' },
    { id: 4, name: 'Mariam Sangaré', matricule: 'ETU-2026-004', status: 'late' },
    { id: 5, name: 'Oumar Diop', matricule: 'ETU-2026-005', status: 'present' },
  ]);

  const toggleStatus = (idx: number) => {
    const next = [...students];
    const current = next[idx].status;
    next[idx].status = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
    setStudents(next);
  };

  const handleValidate = () => {
    Alert.alert('Appel Validé', 'La feuille de présence de la séance a été transmise au Censeur.');
  };

  const presentCount = students.filter((s) => s.status === 'present').length;

  return (
    <View style={styles.container}>
      <Header title="Appel Numérique" subtitle="Séance active • Licence 3 Info" role="teacher" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <Text style={styles.statusCount}>Présents : {presentCount} / {students.length}</Text>
          <TouchableOpacity style={styles.validateBtn} onPress={handleValidate}>
            <Text style={styles.validateBtnText}>✓ Valider l'appel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Touchez un étudiant pour alterner : Présent ➔ Absent ➔ Retard</Text>

        {students.map((st, idx) => {
          const isPres = st.status === 'present';
          const isAbs = st.status === 'absent';
          return (
            <TouchableOpacity key={st.id} style={styles.card} onPress={() => toggleStatus(idx)} activeOpacity={0.7}>
              <View style={styles.info}>
                <Text style={styles.name}>{st.name}</Text>
                <Text style={styles.mat}>{st.matricule}</Text>
              </View>

              <View
                style={[
                  styles.badge,
                  isPres ? styles.bgPres : isAbs ? styles.bgAbs : styles.bgLate,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isPres ? styles.textPres : isAbs ? styles.textAbs : styles.textLate,
                  ]}
                >
                  {isPres ? 'Présent' : isAbs ? 'Absent' : 'En retard'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  statusCount: { fontSize: 14, fontWeight: '800', color: Colors.text },
  validateBtn: { backgroundColor: Colors.roleTeacher, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  validateBtnText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 12, fontStyle: 'italic' },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text },
  mat: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bgPres: { backgroundColor: '#ECFDF5' },
  bgAbs: { backgroundColor: '#FEF2F2' },
  bgLate: { backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  textPres: { color: Colors.accentGreen },
  textAbs: { color: Colors.accentRed },
  textLate: { color: Colors.accentAmber },
});

export default TeacherAttendanceScreen;
