import api from '@/lib/api';
import { Student } from '@/types/student';

export const studentService = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/api/v1/students/');
    return response.data;
  },

  create: async (student: Partial<Student>) => {
    const response = await api.post('/api/v1/students/', student);
    return response.data;
  },

  update: async (id: number, student: Partial<Student>) => {
    const response = await api.put(`/api/v1/students/${id}`, student);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/v1/students/${id}`);
    return response.data;
  },

  getById: async (id: number): Promise<Student> => {
    const response = await api.get(`/api/v1/students/${id}`);
    return response.data;
  },

  getMyProfile: async (): Promise<Student> => {
    const response = await api.get('/api/v1/students/me');
    return response.data;
  },

  resetPassword: async (id: number): Promise<{ temp_password: string; message: string }> => {
    const response = await api.post(`/api/v1/students/${id}/reset-password`);
    return response.data;
  },

  // ✅ Inscription en masse (Tableau / Grille)
  bulkCreate: async (students: any[]) => {
    const response = await api.post('/api/v1/students/bulk-create', { students });
    return response.data;
  },

  // ✅ Import en masse (Fichier CSV ou Excel .xlsx)
  importFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/v1/students/import-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ✅ Télécharger le modèle CSV
  downloadCsvTemplate: async () => {
    const fallbackGenerate = () => {
      const headers = "Nom;Prénom;Email;Filière;Niveau;Domaine;Téléphone;Date de naissance;Lieu de naissance;Genre;Nationalité;Adresse;Nom Parent;Téléphone Parent;Email Parent;Type Inscription;Plan Paiement\n";
      const sample1 = "Traoré;Moussa;moussa.traore@unisphere.edu;Génie Logiciel;L1;Informatique & Technologies;+223 70 00 00 01;2004-05-15;Bamako;M;Malienne;Hamdallaye ACI 2000;Mariam Traoré;+223 60 00 00 01;mariam.traore@gmail.com;Nouveau;Tranches\n";
      const sample2 = "Coulibaly;Fatoumata;fatoumata.coulibaly@unisphere.edu;Sciences Économiques & Gestion;L1;Gestion & Economie;+223 70 00 00 02;2003-09-20;Ségou;F;Malienne;Badalabougou;Ousmane Coulibaly;+223 60 00 00 02;ousmane.c@gmail.com;Nouveau;Mensuel\n";
      const csvContent = "\ufeff" + headers + sample1 + sample2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_etudiants.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    try {
      const response = await api.get('/api/v1/students/template/csv', { responseType: 'blob' });
      if (!response.data || response.data.type === 'application/json') {
        fallbackGenerate();
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_etudiants.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      fallbackGenerate();
    }
  },

  // ✅ Télécharger le modèle Excel (.xlsx)
  downloadExcelTemplate: async () => {
    try {
      const response = await api.get('/api/v1/students/template/excel', { responseType: 'blob' });
      if (!response.data || response.data.type === 'application/json') {
        await studentService.downloadCsvTemplate();
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_etudiants.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      await studentService.downloadCsvTemplate();
    }
  },
};

export default studentService;