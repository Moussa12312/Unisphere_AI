from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.trailing_slash = '/?'

# Core academic
router.register(r'universities', views.UniversityViewSet, basename='universities')
router.register(r'users', views.UserViewSet, basename='users')
router.register(r'filieres', views.FiliereViewSet, basename='filieres')
router.register(r'classes', views.ClassRoomViewSet, basename='classes')
router.register(r'students', views.StudentViewSet, basename='students')
router.register(r'teachers', views.TeacherViewSet, basename='teachers')
router.register(r'courses', views.CourseViewSet, basename='courses')
router.register(r'teaching-units', views.TeachingUnitViewSet, basename='teaching-units')
router.register(r'rooms', views.RoomViewSet, basename='rooms')
router.register(r'grades', views.GradeViewSet, basename='grades')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'academic-fees', views.AcademicFeeViewSet, basename='academic-fees')
router.register(r'payments', views.PaymentViewSet, basename='payments')
router.register(r'payment-tranches', views.PaymentTrancheViewSet, basename='payment-tranches')
router.register(r'payment-deadlines', views.PaymentDeadlineViewSet, basename='payment-deadlines')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcements')
router.register(r'notifications', views.NotificationViewSet, basename='notifications')
router.register(r'messages', views.MessageViewSet, basename='messages')
router.register(r'materials', views.MaterialViewSet, basename='materials')
router.register(r'schedules', views.ScheduleViewSet, basename='schedules')
router.register(r'exam-sessions', views.ExamSessionViewSet, basename='exam-sessions')
router.register(r'exam-schedules', views.ExamScheduleViewSet, basename='exam-schedules')
router.register(r'alumni', views.AlumniProfileViewSet, basename='alumni')

# Accounting router
router.register(r'accounting/suppliers', views.SupplierViewSet, basename='accounting-suppliers')
router.register(r'accounting/categories', views.ExpenseCategoryViewSet, basename='accounting-categories')
router.register(r'accounting/expenses', views.ExpenseViewSet, basename='accounting-expenses')
router.register(r'accounting/bank-accounts', views.BankAccountViewSet, basename='accounting-bank-accounts')
router.register(r'accounting/cash-transactions', views.CashTransactionViewSet, basename='accounting-cash-transactions')
router.register(r'accounting/budgets', views.BudgetViewSet, basename='accounting-budgets')
router.register(r'accounting/fixed-assets', views.FixedAssetViewSet, basename='accounting-fixed-assets')
router.register(r'accounting/payroll', views.PayrollEntryViewSet, basename='accounting-payroll')

# Ledger router
router.register(r'ledger/accounts', views.AccountViewSet, basename='ledger-accounts')
router.register(r'ledger/journal-entries', views.JournalEntryViewSet, basename='ledger-journal-entries')
router.register(r'ledger/fiscal-years', views.FiscalYearViewSet, basename='ledger-fiscal-years')

# Deliberations router
router.register(r'deliberations/rules', views.DeliberationRuleViewSet, basename='deliberations-rules')
router.register(r'deliberations/sessions', views.DeliberationSessionViewSet, basename='deliberations-sessions')
router.register(r'deliberations/decisions', views.DeliberationDecisionViewSet, basename='deliberations-decisions')

urlpatterns = [
    # Health check
    path('health', views.health_check, name='health_check'),
    path('health/', views.health_check, name='health_check_slash'),

    # Auth JWT endpoints
    path('auth/login', views.login_view, name='login'),
    path('auth/login/', views.login_view, name='login_slash'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh_slash'),
    path('auth/me', views.current_user_view, name='current_user'),
    path('auth/me/', views.current_user_view, name='current_user_slash'),
    path('auth/context', views.auth_context, name='auth_context'),
    path('auth/context/', views.auth_context, name='auth_context_slash'),
    path('download/unisphereai.apk', views.download_apk, name='download_apk'),

    # Settings / University endpoints used by frontend
    path('settings/university/profile', views.university_profile, name='university_profile'),
    path('settings/university/card-config', views.university_card_config, name='university_card_config'),

    # Documents & Certificates
    path('documents/generate-enrollment-certificate/<int:student_id>', views.generate_enrollment_certificate, name='generate_enrollment_certificate'),
    path('documents/generate-success-certificate/<int:student_id>', views.generate_success_certificate, name='generate_success_certificate'),

    # Report Cards
    path('report-cards/calculate/<int:student_id>', views.calculate_student_report_card, name='calculate_student_report_card'),

    # Dashboard & Statistics
    path('dashboard/stats', views.dashboard_stats, name='dashboard_stats'),
    path('statistics/overview', views.statistics_overview, name='statistics_overview'),
    path('statistics/filieres/distribution', views.statistics_filiere_distribution, name='statistics_filiere_distribution'),
    path('statistics/revenue/monthly', views.statistics_monthly_revenue, name='statistics_monthly_revenue'),
    path('statistics/attendance/monthly', views.statistics_monthly_attendance, name='statistics_monthly_attendance'),
    path('statistics/inscriptions/monthly', views.statistics_monthly_revenue, name='statistics_monthly_inscriptions'),
    path('statistics/performance/by-level', views.statistics_filiere_distribution, name='statistics_performance_by_level'),

    # Attendance sub-endpoints
    path('attendance/today/stats', views.attendance_today_stats, name='attendance_today_stats'),
    path('attendance/recent', views.attendance_recent, name='attendance_recent'),
    path('attendance/scan', views.attendance_scan, name='attendance_scan'),
    path('attendance/statistics', views.attendance_statistics, name='attendance_statistics'),

    # Secretary, Grades, Financials & Alumni
    path('certificates/secretary/requests', views.secretary_certificates_requests, name='secretary_certificates_requests'),
    path('grades/anomalies', views.grades_anomalies, name='grades_anomalies'),
    path('financials/overview', views.financials_overview, name='financials_overview'),
    path('alumni/community', views.alumni_community, name='alumni_community'),
    path('alumni/me/profile', views.alumni_me_profile, name='alumni_me_profile'),
    path('alumni/promotions', views.alumni_promotions, name='alumni_promotions'),

    # ViewSets (all mapped automatically)
    path('', include(router.urls)),
]
