def get_academic_template_html(doc_type: str, university: dict, student: dict, extra_data: dict = None) -> str:
    """
    Génère un HTML professionnel pour les documents académiques.
    """
    extra = extra_data or {}
    
    # Titres officiels selon le type de document
    titles = {
        "enrollment_certificate": "ATTESTATION DE SCOLARITÉ",
        "transcript": "RELEVÉ DE NOTES",
        "grade_certificate": "CERTIFICAT DE NOTES",
        "achievement": "ATTESTATION DE RÉUSSITE",
        "report_card": "BULLETIN DE NOTES OFFICIEL"
    }
    
    title = titles.get(doc_type, "DOCUMENT OFFICIEL")
    
    # Contenu spécifique selon le document
    content_html = ""
    if doc_type == "enrollment_certificate":
        content_html = f"""
        <p class="text-justify">
            Je soussigné(e), <strong>Prof. {extra.get('director_name', 'Le Directeur')}</strong>, 
            Directeur(trice) de <strong>{university['name']}</strong>, certifie que :
        </p>
        <div class="student-highlight">
            <strong>M./Mme {student['first_name']} {student['last_name']}</strong><br>
            Né(e) le {student['date_of_birth']} à {student['place_of_birth']}<br>
            Titulaire du matricule N° <strong>{student['matricule']}</strong>
        </div>
        <p class="text-justify">
            Est régulièrement inscrit(e) pour l'année académique <strong>{university['academic_year']}</strong> 
            en <strong>{student['level']}</strong>, filière <strong>{student['filiere']}</strong>.
        </p>
        <p class="text-justify">
            Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
        </p>
        """
    elif doc_type == "transcript":
        # Ici, tu pourras injecter un tableau HTML des notes depuis extra_data['grades_table']
        content_html = f"""
        <p class="text-center mb-4">L'étudiant(e) <strong>{student['first_name']} {student['last_name']}</strong> a obtenu les résultats suivants :</p>
        {extra.get('grades_table_html', '<p class="text-center text-red-500">Aucune note enregistrée pour cette session.</p>')}
        <p class="text-center mt-4"><strong>Moyenne Générale : {extra.get('average', 'N/A')} / 20</strong></p>
        """

    # Le Template HTML Complet (Style Académique)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page {{ size: A4; margin: 20mm; }}
            body {{ font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.6; }}
            
            /* En-tête Officiel */
            .header {{ text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 30px; }}
            .republic {{ font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }}
            .university-name {{ font-size: 22px; font-weight: bold; color: #1e3a8a; margin: 10px 0; }}
            .university-details {{ font-size: 12px; color: #555; }}
            
            /* Titre du document */
            .doc-title {{ 
                text-align: center; font-size: 24px; font-weight: bold; 
                text-transform: uppercase; margin: 30px 0; text-decoration: underline; 
                color: #000;
            }}
            
            /* Corps du texte */
            .content {{ font-size: 14px; margin: 20px 40px; text-align: justify; }}
            .student-highlight {{ 
                background-color: #f8fafc; border-left: 4px solid #1e3a8a; 
                padding: 15px; margin: 20px 0; font-size: 15px;
            }}
            
            /* Tableau de notes (si applicable) */
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }}
            th, td {{ border: 1px solid #000; padding: 8px; text-align: center; }}
            th {{ background-color: #f1f5f9; font-weight: bold; }}
            
            /* Pied de page avec signature et cachet */
            .footer {{ margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }}
            .date {{ font-size: 14px; }}
            .signature-block {{ text-align: center; width: 250px; }}
            .signature-line {{ border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; }}
            .stamp {{ 
                width: 100px; height: 100px; border: 2px dashed #999; border-radius: 50%; 
                display: flex; align-items: center; justify-content: center; 
                color: #999; font-size: 10px; transform: rotate(-15deg); margin: 0 auto;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="republic">RÉPUBLIQUE DU MALI</div>
            <div class="republic">Un Peuple - Un But - Une Foi</div>
            <div class="republic">MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE</div>
            <div class="university-name">{university['name'].upper()}</div>
            <div class="university-details">
                {university.get('address', 'Adresse non renseignée')} | 
                Tél: {university.get('phone', 'N/A')} | 
                Email: {university.get('email', 'N/A')}
            </div>
        </div>

        <div class="doc-title">{title}</div>

        <div class="content">
            {content_html}
        </div>

        <div class="footer">
            <div class="date">
                Fait à {university.get('city', 'Bamako')}, le {extra.get('current_date', '...')}
            </div>
            <div class="signature-block">
                <div>Le Directeur / Le Président</div>
                <div class="stamp">CACHET<br>OFFICIEL</div>
                <div class="signature-line">Prof. {extra.get('director_name', 'Signature')}</div>
            </div>
        </div>
    </body>
    </html>
    """
    return html