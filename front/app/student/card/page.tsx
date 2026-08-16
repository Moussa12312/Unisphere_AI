'use client';

import { useState, useEffect } from 'react';
import { Loader2, Printer, User, GraduationCap, Hash, Calendar, Mail, Phone } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function StudentCardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadCard();
  }, []);

  const loadCard = async () => {
    try {
      const res = await api.get('/api/v1/students/me/card');
      setData(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur de chargement de la carte');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Impossible de charger la carte.</p>
      </div>
    );
  }

  const { student, university, config } = data;

  // Couleurs par défaut si aucune config n'est sauvegardée
  const primaryColor = config?.header_background_color || '#1e3a8a';
  const accentColor = config?.matricule_background_color || '#FF6B00';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ma Carte Étudiante</h1>
          <p className="text-slate-500 mt-1">Carte officielle {university.academic_year}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] transition-colors shadow-md"
        >
          <Printer size={16} />
          Imprimer / PDF
        </button>
      </div>

      {/* La Carte */}
      <div className="flex justify-center">
        <div
          id="student-card"
          className="relative bg-white shadow-2xl overflow-hidden print:shadow-none"
          style={{
            width: '85.6mm',
            height: '54mm',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {/* HEADER - Bandeau supérieur */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center px-3"
            style={{
              height: '45px',
              backgroundColor: primaryColor,
              borderRadius: '12px 12px 0 0'
            }}
          >
            {/* Logo Université */}
            {university.logo && (
              <img
                src={university.logo}
                alt="Logo"
                className="h-12 w-12 object-contain mr-2  rounded-full p-0.5 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-[10px] leading-tight truncate">
                {university.name}
              </div>
              <div className="text-white/80 text-[9px] truncate">
                {university.academic_year}
              </div>
            </div>
          </div>

          {/* CONTENU PRINCIPAL */}
          <div
            className="absolute left-0 right-0 flex items-stretch"
            style={{
              top: '40px',
              bottom: '25px',
              padding: '0 12px'
            }}
          >
            {/* Photo de l'étudiant */}
            <div className="flex-shrink-0 flex items-center mr-3">
              <div
                className="bg-slate-200 flex items-center justify-center overflow-hidden"
                style={{
                  width: '75px',
                  height: '75px',
                  borderRadius: '8px',
                  border: ' ' + primaryColor
                }}
              >
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt="Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-slate-400" />
                )}
              </div>
            </div>

            {/* Informations */}
            <div className="flex-1 flex flex-col justify-center min-w-0 px-5">
              {/* Nom complet */}
              <div className="mb-1">
                <div className="text-[8px] opacity-70 mb-0.5" style={{ color: primaryColor }}>
                  Nom & Prénom
                </div>
                <div
                  className="font-bold leading-tight truncate"
                  style={{ fontSize: '14px', color: '#0f172a' }}
                >
                  {student.first_name} {student.last_name}
                </div>
              </div>

              {/* Matricule */}
              <div className="mb-1">
                <div className="text-[8px] opacity-70 mb-0.5" style={{ color: primaryColor }}>
                  ID Étudiant
                </div>
                <div
                  className="inline-block px-2 py-0.5 rounded font-mono font-bold"
                  style={{
                    backgroundColor: accentColor,
                    color: 'white',
                    fontSize: '10px'
                  }}
                >
                  {student.matricule}
                </div>
              </div>

              {/* Filière et Niveau */}
              <div className="space-y-0.5">
                <div className="text-[8px] truncate" style={{ color: '#475569' }}>
                  <span className="font-semibold">Filière :</span> {student.filiere || 'N/A'}
                </div>
                <div className="text-[8px] truncate" style={{ color: '#475569' }}>
                  <span className="font-semibold">Niveau :</span> {student.level}
                </div>
              </div>
            </div>

            {/* QR Code */}
            {student.qr_code && (
              <div className="flex-shrink-0 flex items-center ml-2">
                <div
                  className="bg-white p-1 flex items-center justify-center"
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <img
                    src={student.qr_code}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FOOTER - Pied de page */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3"
            style={{
              height: '35px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: '8px',
              borderRadius: '0 0 12px 12px'
            }}
          >
            {/* Zone de signature */}
            <div>
              <div className="uppercase mb-0.5 text-[7px]">Signature</div>
              <div className="w-16 border-b" style={{ borderColor: '#64748b' }}></div>
            </div>

            {/* Année académique */}
            <div className="font-medium">
              {university.academic_year}
            </div>
          </div>
        </div>
      </div>

      {/* Détails supplémentaires (non imprimés) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 print:hidden">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations détaillées</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Hash size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Matricule</p>
              <p className="font-mono font-semibold text-slate-900">{student.matricule}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Filière</p>
              <p className="font-semibold text-slate-900">{student.filiere || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Date de naissance</p>
              <p className="font-semibold text-slate-900">
                {student.date_of_birth || 'Non renseignée'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <User size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Niveau</p>
              <p className="font-semibold text-slate-900">{student.level}</p>
            </div>
          </div>

          {student.email && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Mail size={18} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-semibold text-slate-900 text-sm">{student.email}</p>
              </div>
            </div>
          )}

          {student.phone && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Phone size={18} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Téléphone</p>
                <p className="font-semibold text-slate-900">{student.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styles d'impression */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #student-card,
          #student-card * {
            visibility: visible;
          }
          #student-card {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}