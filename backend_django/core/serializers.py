from rest_framework import serializers
from .models import (
    Universities, Users, Filieres, ClassRooms, Students, Teachers,
    Courses, TeachingUnits, Grades, Attendances, AcademicFees, Payments,
    Announcements, Notifications, Messages, Rooms
)

class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Universities
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = ['id', 'full_name', 'email', 'role', 'phone', 'photo', 'is_active', 'university', 'last_login', 'is_online']
        read_only_fields = ['id']

class FiliereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filieres
        fields = '__all__'

class ClassRoomSerializer(serializers.ModelSerializer):
    filiere_name = serializers.CharField(source='filiere.name', read_only=True)
    main_teacher_name = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRooms
        fields = '__all__'

    def get_main_teacher_name(self, obj):
        if obj.main_teacher:
            return f"{obj.main_teacher.first_name} {obj.main_teacher.last_name}"
        return ""

    def get_students_count(self, obj):
        return Students.objects.filter(class_room=obj).count()

class StudentSerializer(serializers.ModelSerializer):
    filiere_name = serializers.CharField(source='filiere.name', read_only=True)
    class_room_name = serializers.CharField(source='class_room.name', read_only=True)

    class Meta:
        model = Students
        fields = '__all__'

class TeacherSerializer(serializers.ModelSerializer):
    filiere_name = serializers.CharField(source='filiere.name', read_only=True)

    class Meta:
        model = Teachers
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    filiere_name = serializers.CharField(source='filiere.name', read_only=True)

    class Meta:
        model = Courses
        fields = '__all__'

    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.first_name} {obj.teacher.last_name}"
        return ""

class TeachingUnitSerializer(serializers.ModelSerializer):
    filiere_name = serializers.CharField(source='filiere.name', read_only=True)

    class Meta:
        model = TeachingUnits
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rooms
        fields = '__all__'

class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Grades
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return ""

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendances
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return ""

class AcademicFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicFees
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Payments
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return ""

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcements
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notifications
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Messages
        fields = '__all__'

    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.full_name
        return ""

# ==========================================
# ACCOUNTING & FINANCE
# ==========================================
from .models import (
    Suppliers, ExpenseCategories, Expenses, BankAccounts, CashTransactions,
    Budgets, FixedAssets, PayrollEntries, Accounts, JournalEntries,
    JournalEntryLines, FiscalYears, DeliberationRules, DeliberationSessions,
    DeliberationDecisions, ExamSessions, ExamSchedules, Schedules, Materials,
    PaymentTranches, PaymentDeadlines, AlumniProfiles, ClientInvoices, ClientPayments
)

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suppliers
        fields = '__all__'

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategories
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category = ExpenseCategorySerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)

    class Meta:
        model = Expenses
        fields = '__all__'

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccounts
        fields = '__all__'

class CashTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashTransactions
        fields = '__all__'

class BudgetSerializer(serializers.ModelSerializer):
    category = ExpenseCategorySerializer(read_only=True)

    class Meta:
        model = Budgets
        fields = '__all__'

class FixedAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedAssets
        fields = '__all__'

class PayrollEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollEntries
        fields = '__all__'

# ==========================================
# LEDGER
# ==========================================
class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accounts
        fields = '__all__'

class JournalEntryLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntryLines
        fields = '__all__'

class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntries
        fields = '__all__'

class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYears
        fields = '__all__'

# ==========================================
# DELIBERATIONS
# ==========================================
class DeliberationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliberationRules
        fields = '__all__'

class DeliberationSessionSerializer(serializers.ModelSerializer):
    decisions_count = serializers.SerializerMethodField()

    class Meta:
        model = DeliberationSessions
        fields = '__all__'

    def get_decisions_count(self, obj):
        return DeliberationDecisions.objects.filter(session=obj).count()

class DeliberationDecisionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliberationDecisions
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return ""

# ==========================================
# EXAMS & SCHEDULES
# ==========================================
class ExamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSessions
        fields = '__all__'

class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedules
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.title', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)

    class Meta:
        model = Schedules
        fields = '__all__'

class MaterialSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Materials
        fields = '__all__'

class PaymentTrancheSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTranches
        fields = '__all__'

class PaymentDeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentDeadlines
        fields = '__all__'

class AlumniProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumniProfiles
        fields = '__all__'

class ClientInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientInvoices
        fields = '__all__'

class ClientPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPayments
        fields = '__all__'
