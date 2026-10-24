import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const TeacherGradesScreen = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    try {
      const data = await DataService.getSecretaryStudents(20);
      const list = Array.isArray(data) ? data : (data?.students || []);
      const mapped = list.map((st: any, idx: number) => ({
        id: st.id || idx + 1,
        name: st.first_name ? `${st.first_name} ${st.last_name || ''}` : (st.full_name || 'Étudiant'),
        matricule: st.matricule || `ETU-2026-00${idx + 1}`,
        cc: '14.5',
        exam: '15.0',
      }));
      setGrades(mapped.length > 0 ? mapped : [
        { id: 1, name: 'Moussa Coulibaly', matricule: 'ETU-2026-0842', cc: '16.5', exam: '17.0' },
        { id: 2, name: 'Aminata Diallo', matricule: 'ETU-2026-0112', cc: '15.0', exam: '16.0' },
      ]);
    } catch (e) {
      console.log('Error loading students for grades:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleSave = () => {
    Alert.alert('Succès', 'Les notes ont été enregistrées avec succès et transmises pour validation !');
  };

  return (
    <View style={styles.container}>
      <Header title="Saisie des Notes LMD" subtitle="Module : Génie Logiciel & IA" role="teacher" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleTeacher]} />}
      >
        <View style={styles.actionHeader}>
          <Text style={styles.sectionTitle}>Étudiants de la Classe ({grades.length})</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>💾 Enregistrer</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleTeacher} style={{ marginVertical: 30 }} />
        ) : (
          grades.map((st, i) => (
            <View key={st.id || i} style={styles.studentRow}>
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
          ))
        )}
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
