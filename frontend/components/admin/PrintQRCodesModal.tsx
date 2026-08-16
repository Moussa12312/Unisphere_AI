'use client';

import { useState, useEffect } from 'react';
import { X, Printer, Download, Search, CheckSquare, Square, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  level: string;
  filiere: string;
  qr_code?: string | null;
}

interface PrintQRCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintQRCodesModal({ isOpen, onClose }: PrintQRCodesModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [printing, setPrinting] = useState(false);
  const [qrCodesMap, setQrCodesMap] = useState<Record<number, string>>({}); // ID -> base64

  useEffect(() => {
    if (isOpen) {
      loadStudents();
    } else {
      setSelectedIds(new Set());
      setSearchTerm('');
      setFilterLevel('');
      setQrCodesMap({});
    }
  }, [isOpen]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/students/');
      const data = res.data || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur de chargement des étudiants');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  // ✅ Récupère le QR code d'un étudiant et le convertit en base64
  const fetchQrCodeAsBase64 = async (studentId: number): Promise<string | null> => {
    try {
      // Essaie d'abord avec l'endpoint /qr-code
      const response = await api.get(`/api/v1/students/${studentId}/qr-code`, {
        responseType: 'blob'
      });
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.warn(`QR code non trouvé pour l'étudiant ${studentId}`);
      return null;
    }
  };

  const downloadQR = async (student: Student) => {
    try {
      const response = await api.get(`/api/v1/students/${student.id}/qr-code`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR-${student.matricule}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`QR code de ${student.first_name} téléchargé`);
    } catch (error) {
      toast.error('Erreur de téléchargement');
    }
  };

  const handlePrint = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionnez au moins un étudiant');
      return;
    }

    setPrinting(true);
    
    try {
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      
      // ✅ Récupère TOUS les QR codes en base64 avant l'impression
      toast.loading(`Génération des QR codes...`);
      const qrMap: Record<number, string> = {};
      
      for (const student of selectedStudents) {
        const base64 = await fetchQrCodeAsBase64(student.id);
        if (base64) {
          qrMap[student.id] = base64;
        }
      }
      
      setQrCodesMap(qrMap);
      toast.dismiss();

      // Grille 4×5 = 20 QR par feuille A4
      const PER_PAGE = 20;
      const pages: Student[][] = [];
      for (let i = 0; i < selectedStudents.length; i += PER_PAGE) {
        pages.push(selectedStudents.slice(i, i + PER_PAGE));
      }

      let html = `<!DOCTYPE html>
<html>
<head>
  <title>QR Codes - ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .page { 
      width: 190mm; 
      height: 277mm;
      margin: 0 auto; 
      page-break-after: always;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 3mm;
      padding: 5mm;
    }
    .page:last-child { page-break-after: auto; }
    .qr-cell { 
      border: 1.5px solid #334155; 
      border-radius: 6px; 
      padding: 2mm;
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
      background: #fff;
      height: 52mm;
      page-break-inside: avoid;
    }
    .qr-image { 
      width: 35mm; 
      height: 35mm; 
      object-fit: contain;
      display: block;
    }
    .student-name { 
      font-size: 10px; 
      font-weight: bold; 
      text-align: center; 
      color: #0f172a;
      margin-top: 1.5mm;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .student-matricule { 
      font-size: 9px; 
      font-family: 'Courier New', monospace; 
      text-align: center; 
      color: #475569;
      font-weight: 600;
      margin-top: 0.5mm;
    }
    .student-info { 
      font-size: 8px; 
      text-align: center; 
      color: #64748b;
      margin-top: 0.5mm;
    }
    .empty-cell {
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      height: 52mm;
    }
    .no-qr {
      background: #fef2f2;
      color: #dc2626;
      font-size: 9px;
      padding: 4px;
      border-radius: 4px;
      text-align: center;
    }
    @media print {
      body { margin: 0; background: #fff; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>`;

      pages.forEach((page, pageIndex) => {
        html += `<div class="page" id="page-${pageIndex}">`;
        page.forEach(student => {
          const qrBase64 = qrMap[student.id];
          
          if (qrBase64) {
            html += `
              <div class="qr-cell">
                <img class="qr-image" src="${qrBase64}" alt="QR ${student.matricule}" />
                <div class="student-name">${student.first_name} ${student.last_name}</div>
                <div class="student-matricule">${student.matricule}</div>
                <div class="student-info">${student.level} • ${student.filiere}</div>
              </div>`;
          } else {
            html += `
              <div class="qr-cell">
                <div class="no-qr">QR non disponible</div>
                <div class="student-name">${student.first_name} ${student.last_name}</div>
                <div class="student-matricule">${student.matricule}</div>
                <div class="student-info">${student.level} • ${student.filiere}</div>
              </div>`;
          }
        });
        // Cellules vides pour compléter la grille 4×5
        for (let i = 0; i < PER_PAGE - page.length; i++) {
          html += '<div class="empty-cell"></div>';
        }
        html += '</div>';
      });

      html += `</body></html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les popups pour imprimer');
        setPrinting(false);
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Attendre un peu puis imprimer
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          setPrinting(false);
        }, 1000);
      }, 500);

    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'impression');
      setPrinting(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchSearch = `${student.first_name} ${student.last_name} ${student.matricule}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchLevel = filterLevel ? student.level === filterLevel : true;
    return matchSearch && matchLevel;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Printer size={22} className="text-[#FF6B00]" />
              Imprimer les QR Codes
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Grille 4×5 • 20 QR codes par feuille A4
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6B00] focus:outline-none bg-white"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#FF6B00] focus:outline-none"
          >
            <option value="">Tous les niveaux</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="M1">M1</option>
            <option value="M2">M2</option>
          </select>
          <div className="flex items-center gap-2 text-sm text-slate-600 px-3">
            <CheckSquare size={16} className="text-[#FF6B00]" />
            <span className="font-semibold">{selectedIds.size}</span> sélectionné(s)
            {selectedIds.size > 0 && (
              <span className="text-slate-400">• {Math.ceil(selectedIds.size / 20)} feuille(s)</span>
            )}
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedIds.size === 0 || printing}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
          >
            {printing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Printer size={16} />
                Imprimer
              </>
            )}
          </button>
        </div>

        {/* Tableau */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              Aucun étudiant trouvé
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button onClick={toggleAll} className="text-slate-600 hover:text-[#FF6B00] transition-colors">
                      {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare size={18} className="text-[#FF6B00]" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Étudiant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Matricule</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Niveau</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Filière</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStudent(student.id)} className="text-slate-600 hover:text-[#FF6B00] transition-colors">
                        {selectedIds.has(student.id) ? (
                          <CheckSquare size={18} className="text-[#FF6B00]" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF6B00] font-bold text-xs">
                            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 text-sm">
                          {student.first_name} {student.last_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {student.matricule}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        {student.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.filiere}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => downloadQR(student)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Download size={14} />
                        QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
          <span>
            {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} affiché{filteredStudents.length > 1 ? 's' : ''}
          </span>
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}