import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const TeacherGradesScreen = () => {
  const [grades, setGrades] = useState([
    { id: 1, name: 'Amadou Diallo', matricule: 'ETU-2026-001', cc: '14.5', exam: '15.0' },
    { id: 2, name: 'Fatoumata Koné', matricule: 'ETU-2026-002', cc: '16.0', exam: '17.0' },
    { id: 3, name: 'Ibrahim Touré', matricule: 'ETU-2026-003', cc: '12.0', exam: '13.5' },
    { id: 4, name: 'Mariam Sangaré', matricule: 'ETU-2026-004', cc: '15.0', exam: '16.0' },
  ]);

  const handleSave = () => {
    Alert.alert('Succès', 'Les notes ont été enregistrées avec succès dans la base de données !');
  };

  return (
    <View style={styles.container}>
      <Header title="Saisie des Notes LMD" subtitle="Module : Génie Logiciel (INF301)" role="teacher" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actionHeader}>
          <Text style={styles.sectionTitle}>Liste des Étudiants ({grades.length})</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>💾 Enregistrer</Text>
          </TouchableOpacity>
        </View>

        {grades.map((st, i) => (
          <View key={st.id} style={styles.studentRow}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{st.name}</Text>
              <Text style={styles.studentMat}>{st.matricule}</Text>
            </View>

            <View style={styles.inputsRow}>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>CC</Text>
                <TextInput
                  style={styles.gradeInput}
                  value={st.cc}
                  onChangeText={(val) => {
                    const next = [...grades];
                    next[i].cc = val;
                    setGrades(next);
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Examen</Text>
                <TextInput
                  style={styles.gradeInput}
                  value={st.exam}
                  onChangeText={(val) => {
                    const next = [...grades];
                    next[i].exam = val;
                    setGrades(next);
                  }}
                  keyboardType="numeric"
                />
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
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  studentRow: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  studentMat: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  inputsRow: { flexDirection: 'row', gap: 10 },
  inputBox: { alignItems: 'center' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  gradeInput: { width: 54, height: 38, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, textAlign: 'center', fontSize: 14, fontWeight: '700', color: Colors.text },
});

export default TeacherGradesScreen;
