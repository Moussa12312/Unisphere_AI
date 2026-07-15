import { useState, useEffect } from 'react';
import api from '@/lib/api';

export interface Conflict {
  field: string;
  message: string;
}

export const useConflictCheck = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [checking, setChecking] = useState(false);

  const checkScheduleConflicts = async (data: {
    course_id?: number;
    class_id?: number;
    teacher_id?: number;
    room?: string;
    day_of_week?: string;
    start_time?: string;
    end_time?: string;
    exclude_id?: number;
  }) => {
    if (!data.day_of_week || !data.start_time || !data.end_time) {
      setConflicts([]);
      return;
    }

    setChecking(true);
    try {
      const response = await api.post('/api/v1/schedules/check-conflicts', data);
      setConflicts(response.data.conflicts || []);
    } catch (error) {
      console.error('Erreur vérification conflits:', error);
      setConflicts([]);
    } finally {
      setChecking(false);
    }
  };

  const hasConflict = (field: string): boolean => {
    return conflicts.some(c => c.field === field);
  };

  const getConflictMessage = (field: string): string => {
    const conflict = conflicts.find(c => c.field === field);
    return conflict?.message || '';
  };

  const clearConflicts = () => setConflicts([]);

  return {
    conflicts,
    checking,
    checkScheduleConflicts,
    hasConflict,
    getConflictMessage,
    clearConflicts
  };
};