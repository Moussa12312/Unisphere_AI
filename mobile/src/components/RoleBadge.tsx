import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

interface RoleBadgeProps {
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  student: { label: 'Étudiant', bg: '#EFF6FF', color: Colors.roleStudent },
  teacher: { label: 'Enseignant', bg: '#ECFDF5', color: Colors.roleTeacher },
  secretary: { label: 'Secrétaire', bg: '#F5F3FF', color: Colors.roleSecretary },
  censeur: { label: 'Censeur', bg: '#FDF2F8', color: Colors.roleCenseur },
  admin: { label: 'Admin', bg: '#FFF7ED', color: Colors.roleAdmin },
  guard: { label: 'Gardien', bg: '#EEF2FF', color: Colors.roleGuard },
  accountant: { label: 'Comptable', bg: '#F0FDFA', color: Colors.roleAccountant },
  alumni: { label: 'Alumni', bg: '#FEF3C7', color: Colors.roleAlumni },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const norm = (role || '').toLowerCase();
  const cfg = ROLE_CONFIG[norm] || { label: role, bg: '#F1F5F9', color: '#475569' };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default RoleBadge;
