# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AcademicConfigs(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    grading_system = models.CharField(blank=True, null=True)
    min_passing_grade = models.TextField(blank=True, null=True)  # This field type is a guess.
    max_grade = models.TextField(blank=True, null=True)  # This field type is a guess.
    default_cc_coefficient = models.TextField(blank=True, null=True)  # This field type is a guess.
    default_exam_coefficient = models.TextField(blank=True, null=True)  # This field type is a guess.
    allow_compensation = models.BooleanField(blank=True, null=True)
    allow_makeup_exam = models.BooleanField(blank=True, null=True)
    min_gpa_to_pass = models.TextField(blank=True, null=True)  # This field type is a guess.
    current_academic_year = models.CharField(blank=True, null=True)
    semester_system = models.CharField(blank=True, null=True)
    min_attendance_rate = models.TextField(blank=True, null=True)  # This field type is a guess.
    late_threshold_time = models.TimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    penalty_amount = models.TextField(blank=True, null=True)  # This field type is a guess.
    penalty_auto_apply = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'academic_configs'


class AcademicFees(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    level = models.CharField()
    payment_type = models.CharField()
    amount = models.TextField()  # This field type is a guess.
    currency = models.CharField(blank=True, null=True)
    academic_year = models.CharField()
    is_locked = models.BooleanField(blank=True, null=True)
    locked_count = models.IntegerField(blank=True, null=True)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    domain = models.CharField(blank=True, null=True)
    has_monthly_option = models.BooleanField(blank=True, null=True)
    monthly_deposit = models.TextField(blank=True, null=True)  # This field type is a guess.
    monthly_installment = models.TextField(blank=True, null=True)  # This field type is a guess.
    monthly_months_count = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'academic_fees'


class Accounts(models.Model):
    code = models.CharField()
    name = models.CharField()
    account_class = models.CharField()
    is_default = models.IntegerField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'accounts'


class AlumniConnections(models.Model):
    student = models.ForeignKey('Students', models.DO_NOTHING)
    alumni = models.ForeignKey('AlumniProfiles', models.DO_NOTHING)
    connection_type = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    accepted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'alumni_connections'


class AlumniInvitations(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    token = models.CharField(unique=True)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by')
    max_uses = models.IntegerField(blank=True, null=True)
    used_count = models.IntegerField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'alumni_invitations'


class AlumniMessages(models.Model):
    connection = models.ForeignKey(AlumniConnections, models.DO_NOTHING)
    sender = models.ForeignKey('Users', models.DO_NOTHING)
    receiver = models.ForeignKey('Users', models.DO_NOTHING, related_name='alumnimessages_receiver_set')
    content = models.TextField()
    is_read = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'alumni_messages'


class AlumniProfiles(models.Model):
    user = models.ForeignKey('Users', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    first_name = models.CharField()
    last_name = models.CharField()
    email = models.CharField()
    phone = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    filiere = models.CharField(blank=True, null=True)
    domain = models.CharField(blank=True, null=True)
    level = models.CharField(blank=True, null=True)
    graduation_year = models.IntegerField(blank=True, null=True)
    promotion = models.CharField(blank=True, null=True)
    current_position = models.CharField(blank=True, null=True)
    company = models.CharField(blank=True, null=True)
    activity_domain = models.CharField(blank=True, null=True)
    location = models.CharField(blank=True, null=True)
    linkedin_url = models.CharField(blank=True, null=True)
    website = models.CharField(blank=True, null=True)
    career_path = models.TextField(blank=True, null=True)
    difficulties = models.TextField(blank=True, null=True)
    advice = models.TextField(blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    is_open_to_mentoring = models.BooleanField(blank=True, null=True)
    is_open_to_internship = models.BooleanField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    is_visible = models.BooleanField(blank=True, null=True)
    is_verified = models.BooleanField(blank=True, null=True)
    accepted_conditions = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'alumni_profiles'


class Announcements(models.Model):
    title = models.CharField()
    content = models.CharField()
    category = models.CharField()
    priority = models.CharField(blank=True, null=True)
    target_audience = models.CharField(blank=True, null=True)
    is_published = models.BooleanField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    event_date = models.DateField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'announcements'


class AnomalyConfig(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    enable_anomalies = models.BooleanField(blank=True, null=True)
    threshold_exceptional = models.TextField(blank=True, null=True)  # This field type is a guess.
    threshold_very_high = models.TextField(blank=True, null=True)  # This field type is a guess.
    threshold_very_low = models.TextField(blank=True, null=True)  # This field type is a guess.
    threshold_low = models.TextField(blank=True, null=True)  # This field type is a guess.

    class Meta:
        managed = False
        db_table = 'anomaly_config'


class Attendances(models.Model):
    student = models.ForeignKey('Students', models.DO_NOTHING)
    course = models.ForeignKey('Courses', models.DO_NOTHING, blank=True, null=True)
    date = models.DateField()
    check_in_time = models.TimeField(blank=True, null=True)
    check_out_time = models.TimeField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    method = models.CharField(blank=True, null=True)
    scanned_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='scanned_by', blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    comment = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'attendances'


class AuditLogs(models.Model):
    action = models.CharField()
    user_email = models.CharField(blank=True, null=True)
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    ip_address = models.CharField(blank=True, null=True)
    user_agent = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    details = models.TextField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'audit_logs'


class BankAccounts(models.Model):
    name = models.CharField()
    account_type = models.CharField(blank=True, null=True)
    bank_name = models.CharField(blank=True, null=True)
    account_number = models.CharField(blank=True, null=True)
    initial_balance = models.TextField(blank=True, null=True)  # This field type is a guess.
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'bank_accounts'


class BankReconciliations(models.Model):
    bank_account = models.ForeignKey(BankAccounts, models.DO_NOTHING)
    statement_date = models.DateField()
    statement_balance = models.TextField()  # This field type is a guess.
    book_balance = models.TextField()  # This field type is a guess.
    difference = models.TextField()  # This field type is a guess.
    status = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'bank_reconciliations'


class Budgets(models.Model):
    category = models.ForeignKey('ExpenseCategories', models.DO_NOTHING)
    department = models.CharField(blank=True, null=True)
    period = models.CharField()
    allocated_amount = models.TextField()  # This field type is a guess.
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'budgets'


class CashTransactions(models.Model):
    bank_account = models.ForeignKey(BankAccounts, models.DO_NOTHING)
    transaction_type = models.CharField()
    amount = models.TextField()  # This field type is a guess.
    description = models.CharField(blank=True, null=True)
    transaction_date = models.DateField()
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'cash_transactions'


class Censors(models.Model):
    first_name = models.CharField()
    last_name = models.CharField()
    email = models.CharField(unique=True)
    phone = models.CharField(blank=True, null=True)
    department = models.CharField(blank=True, null=True)
    employee_id = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'censors'


class CertificateRequests(models.Model):
    student = models.ForeignKey('Students', models.DB_CASCADE)
    request_type = models.CharField()
    status = models.CharField(blank=True, null=True)
    file_path = models.CharField(blank=True, null=True)
    rejection_reason = models.CharField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'certificate_requests'


class ClassRooms(models.Model):
    name = models.CharField()
    filiere = models.ForeignKey('Filieres', models.DO_NOTHING, blank=True, null=True)
    level = models.CharField()
    room = models.CharField(blank=True, null=True)
    building = models.CharField(blank=True, null=True)
    capacity = models.IntegerField(blank=True, null=True)
    academic_year = models.CharField(blank=True, null=True)
    main_teacher = models.ForeignKey('Teachers', models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'class_rooms'


class ClientInvoices(models.Model):
    invoice_number = models.CharField(unique=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    title = models.CharField()
    description = models.TextField(blank=True, null=True)
    amount = models.TextField()  # This field type is a guess.
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'client_invoices'


class ClientPayments(models.Model):
    invoice = models.ForeignKey(ClientInvoices, models.DO_NOTHING)
    amount = models.TextField()  # This field type is a guess.
    payment_date = models.DateField()
    payment_method = models.CharField(blank=True, null=True)
    reference = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'client_payments'


class CourseHistory(models.Model):
    course = models.ForeignKey('Courses', models.DO_NOTHING)
    action = models.CharField()
    field_changed = models.CharField(blank=True, null=True)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    user_name = models.CharField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'course_history'


class Courses(models.Model):
    title = models.CharField()
    code = models.CharField()
    department = models.CharField()
    level = models.CharField()
    teacher = models.ForeignKey('Teachers', models.DO_NOTHING, blank=True, null=True)
    credits = models.IntegerField(blank=True, null=True)
    hours = models.IntegerField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    filiere = models.ForeignKey('Filieres', models.DO_NOTHING, blank=True, null=True)
    teaching_unit = models.ForeignKey('TeachingUnits', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'courses'


class DeliberationDecisions(models.Model):
    session = models.ForeignKey('DeliberationSessions', models.DO_NOTHING)
    student = models.ForeignKey('Students', models.DO_NOTHING)
    average = models.TextField(blank=True, null=True)  # This field type is a guess.
    failed_courses_count = models.IntegerField(blank=True, null=True)
    decision = models.CharField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'deliberation_decisions'


class DeliberationRules(models.Model):
    name = models.CharField()
    filiere = models.CharField(blank=True, null=True)
    level = models.CharField(blank=True, null=True)
    min_average = models.TextField(blank=True, null=True)  # This field type is a guess.
    max_failed_courses = models.IntegerField(blank=True, null=True)
    catchup_min_average = models.TextField(blank=True, null=True)  # This field type is a guess.
    is_active = models.IntegerField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'deliberation_rules'


class DeliberationSessions(models.Model):
    title = models.CharField()
    filiere = models.CharField()
    level = models.CharField()
    academic_year = models.CharField()
    session_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    jury_members = models.TextField(blank=True, null=True)
    rule = models.ForeignKey(DeliberationRules, models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'deliberation_sessions'


class Documents(models.Model):
    document_type = models.CharField()
    title = models.CharField()
    description = models.TextField(blank=True, null=True)
    file_path = models.CharField(blank=True, null=True)
    student = models.ForeignKey('Students', models.DO_NOTHING, blank=True, null=True)
    generated_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='generated_by', blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    is_downloaded = models.BooleanField(blank=True, null=True)
    download_count = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'documents'


class ExamSchedules(models.Model):
    session = models.ForeignKey('ExamSessions', models.DB_CASCADE)
    class_field = models.ForeignKey(ClassRooms, models.DB_CASCADE, db_column='class_id')  # Field renamed because it was a Python reserved word.
    course = models.ForeignKey(Courses, models.DB_CASCADE)
    exam_date = models.DateField()
    start_time = models.CharField()
    end_time = models.CharField()
    room = models.CharField(blank=True, null=True)
    building = models.CharField(blank=True, null=True)
    supervisor = models.ForeignKey('Teachers', models.DO_NOTHING, blank=True, null=True)
    supervisor_name = models.CharField(blank=True, null=True)
    notes = models.CharField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'exam_schedules'


class ExamSessions(models.Model):
    name = models.CharField()
    session_type = models.CharField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(blank=True, null=True)
    description = models.CharField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'exam_sessions'


class ExpenseCategories(models.Model):
    name = models.CharField()
    description = models.CharField(blank=True, null=True)
    is_default = models.IntegerField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'expense_categories'


class Expenses(models.Model):
    reference = models.CharField()
    category = models.ForeignKey(ExpenseCategories, models.DO_NOTHING)
    supplier = models.ForeignKey('Suppliers', models.DO_NOTHING, blank=True, null=True)
    bank_account = models.ForeignKey(BankAccounts, models.DO_NOTHING, blank=True, null=True)
    title = models.CharField()
    description = models.TextField(blank=True, null=True)
    amount = models.TextField()  # This field type is a guess.
    expense_date = models.DateField()
    payment_method = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    proof_file = models.CharField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'expenses'


class Filieres(models.Model):
    domain = models.CharField()
    name = models.CharField()
    levels = models.CharField()
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'filieres'


class FiscalYears(models.Model):
    period = models.CharField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    closed_at = models.DateTimeField(blank=True, null=True)
    closed_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='closed_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'fiscal_years'


class FixedAssets(models.Model):
    name = models.CharField()
    category = models.CharField()
    purchase_date = models.DateField()
    purchase_value = models.TextField()  # This field type is a guess.
    depreciation_years = models.IntegerField(blank=True, null=True)
    location = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'fixed_assets'


class Grades(models.Model):
    student = models.ForeignKey('Students', models.DO_NOTHING)
    course = models.ForeignKey(Courses, models.DO_NOTHING)
    session = models.ForeignKey(ExamSessions, models.DO_NOTHING)
    cc_score = models.TextField(blank=True, null=True)  # This field type is a guess.
    exam_score = models.TextField(blank=True, null=True)  # This field type is a guess.
    cc_coefficient = models.TextField(blank=True, null=True)  # This field type is a guess.
    exam_coefficient = models.TextField(blank=True, null=True)  # This field type is a guess.
    score = models.TextField(blank=True, null=True)  # This field type is a guess.
    coefficient = models.TextField(blank=True, null=True)  # This field type is a guess.
    status = models.CharField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    validated_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='validated_by', blank=True, null=True)
    validated_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='rejected_by', related_name='grades_rejected_by_set', blank=True, null=True)
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    graded_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='graded_by', related_name='grades_graded_by_set', blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'grades'


class Incidents(models.Model):
    title = models.CharField()
    description = models.TextField()
    incident_type = models.CharField()
    severity = models.CharField(blank=True, null=True)
    location = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    student = models.ForeignKey('Students', models.DO_NOTHING, blank=True, null=True)
    reported_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='reported_by')
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'incidents'


class JournalEntries(models.Model):
    reference = models.CharField()
    entry_date = models.DateField()
    description = models.CharField()
    source = models.CharField(blank=True, null=True)
    source_id = models.IntegerField(blank=True, null=True)
    fiscal_year = models.ForeignKey(FiscalYears, models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'journal_entries'


class JournalEntryLines(models.Model):
    journal_entry = models.ForeignKey(JournalEntries, models.DO_NOTHING)
    account = models.ForeignKey(Accounts, models.DO_NOTHING)
    debit = models.TextField(blank=True, null=True)  # This field type is a guess.
    credit = models.TextField(blank=True, null=True)  # This field type is a guess.
    description = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'journal_entry_lines'


class Materials(models.Model):
    title = models.CharField()
    description = models.TextField(blank=True, null=True)
    file_path = models.CharField()
    file_type = models.CharField()
    file_size = models.IntegerField(blank=True, null=True)
    original_name = models.CharField(blank=True, null=True)
    course = models.ForeignKey(Courses, models.DO_NOTHING, blank=True, null=True)
    teacher = models.ForeignKey('Teachers', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    visibility = models.CharField(blank=True, null=True)
    download_count = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'materials'


class Messages(models.Model):
    sender = models.ForeignKey('Users', models.DO_NOTHING)
    recipient = models.ForeignKey('Users', models.DO_NOTHING, related_name='messages_recipient_set', blank=True, null=True)
    subject = models.CharField()
    content = models.TextField()
    message_type = models.CharField(blank=True, null=True)
    is_read = models.BooleanField(blank=True, null=True)
    is_starred = models.BooleanField(blank=True, null=True)
    is_deleted_sender = models.BooleanField(blank=True, null=True)
    is_deleted_recipient = models.BooleanField(blank=True, null=True)
    parent = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'messages'


class Notifications(models.Model):
    title = models.CharField()
    message = models.TextField()
    notification_type = models.CharField()
    type = models.CharField(blank=True, null=True)
    target_roles = models.TextField(blank=True, null=True)  # This field type is a guess.
    recipient = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', related_name='notifications_created_by_set', blank=True, null=True)
    is_read = models.BooleanField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    metadata = models.TextField(blank=True, null=True)  # This field type is a guess.
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'notifications'


class ParentProfiles(models.Model):
    user = models.ForeignKey('Users', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    phone = models.CharField(blank=True, null=True)
    profession = models.CharField(blank=True, null=True)
    notify_absence = models.BooleanField(blank=True, null=True)
    notify_bad_grade = models.BooleanField(blank=True, null=True)
    notify_payment = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parent_profiles'


class ParentStudentLinks(models.Model):
    parent = models.ForeignKey(ParentProfiles, models.DO_NOTHING)
    student = models.ForeignKey('Students', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    relationship_type = models.CharField(blank=True, null=True)
    is_active = models.BooleanField(blank=True, null=True)
    premium_active = models.BooleanField(blank=True, null=True)
    premium_until = models.DateTimeField(blank=True, null=True)
    premium_status = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parent_student_links'


class PaymentDeadlines(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    academic_year = models.CharField()
    deadline_type = models.CharField()
    deadline_date = models.DateField()
    amount = models.TextField(blank=True, null=True)  # This field type is a guess.
    description = models.CharField(blank=True, null=True)
    created_at = models.CharField(blank=True, null=True)
    updated_at = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payment_deadlines'


class PaymentInstallments(models.Model):
    payment = models.ForeignKey('Payments', models.DO_NOTHING)
    student = models.ForeignKey('Students', models.DO_NOTHING)
    amount_due = models.TextField()  # This field type is a guess.
    amount_paid = models.TextField(blank=True, null=True)  # This field type is a guess.
    balance = models.TextField()  # This field type is a guess.
    installment_number = models.IntegerField()
    total_installments = models.IntegerField()
    due_date = models.DateTimeField()
    paid_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    is_exam_blocked = models.BooleanField(blank=True, null=True)
    description = models.CharField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payment_installments'


class PaymentTranches(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    level = models.CharField()
    payment_type = models.CharField()
    academic_year = models.CharField()
    tranche_number = models.IntegerField()
    tranche_name = models.CharField()
    percentage = models.TextField()  # This field type is a guess.
    amount = models.TextField()  # This field type is a guess.
    due_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    domain = models.CharField(blank=True, null=True)
    plan_type = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payment_tranches'


class Payments(models.Model):
    student = models.ForeignKey('Students', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    amount = models.TextField()  # This field type is a guess.
    currency = models.CharField(blank=True, null=True)
    payment_type = models.CharField()
    payment_method = models.CharField()
    reference = models.CharField()
    receipt_number = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    description = models.CharField(blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    paid_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='paid_by', blank=True, null=True)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', related_name='payments_created_by_set', blank=True, null=True)
    tranche = models.ForeignKey(PaymentTranches, models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments'


class PayrollEntries(models.Model):
    user = models.ForeignKey('Users', models.DO_NOTHING)
    period = models.CharField()
    gross_salary = models.TextField()  # This field type is a guess.
    deductions = models.TextField(blank=True, null=True)  # This field type is a guess.
    net_salary = models.TextField()  # This field type is a guess.
    status = models.CharField(blank=True, null=True)
    paid_date = models.DateField(blank=True, null=True)
    expense = models.ForeignKey(Expenses, models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payroll_entries'


class ReportCards(models.Model):
    student = models.ForeignKey('Students', models.DO_NOTHING)
    session = models.ForeignKey(ExamSessions, models.DO_NOTHING)
    average = models.TextField(blank=True, null=True)  # This field type is a guess.
    rank = models.IntegerField(blank=True, null=True)
    mention = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    total_credits = models.IntegerField(blank=True, null=True)
    obtained_credits = models.IntegerField(blank=True, null=True)
    generated_at = models.DateTimeField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'report_cards'


class Rooms(models.Model):
    name = models.CharField()
    building = models.CharField(blank=True, null=True)
    capacity = models.IntegerField(blank=True, null=True)
    room_type = models.CharField(blank=True, null=True)
    is_available = models.BooleanField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'rooms'


class ScanSessions(models.Model):
    token = models.CharField(unique=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    student = models.ForeignKey('Students', models.DO_NOTHING, blank=True, null=True)
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by')
    recipient_email = models.CharField()
    recipient_name = models.CharField(blank=True, null=True)
    session_type = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    student_name = models.CharField(blank=True, null=True)
    student_level = models.CharField(blank=True, null=True)
    student_filiere = models.CharField(blank=True, null=True)
    documents = models.TextField(blank=True, null=True)  # This field type is a guess.
    ocr_extracted_data = models.TextField(blank=True, null=True)  # This field type is a guess.
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'scan_sessions'


class Schedules(models.Model):
    course = models.ForeignKey(Courses, models.DO_NOTHING)
    class_field = models.ForeignKey(ClassRooms, models.DO_NOTHING, db_column='class_id')  # Field renamed because it was a Python reserved word.
    teacher = models.ForeignKey('Teachers', models.DO_NOTHING)
    room = models.CharField(blank=True, null=True)
    building = models.CharField(blank=True, null=True)
    day_of_week = models.CharField()
    start_time = models.CharField()
    end_time = models.CharField()
    university = models.ForeignKey('Universities', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'schedules'


class SecuritySettings(models.Model):
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    two_factor_enabled = models.IntegerField(blank=True, null=True)
    password_expiry_days = models.IntegerField(blank=True, null=True)
    password_expiry_enabled = models.IntegerField(blank=True, null=True)
    session_timeout_minutes = models.IntegerField(blank=True, null=True)
    max_login_attempts = models.IntegerField(blank=True, null=True)
    ip_whitelist_enabled = models.IntegerField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'security_settings'


class Students(models.Model):
    first_name = models.CharField()
    last_name = models.CharField()
    email = models.CharField()
    date_of_birth = models.DateField(blank=True, null=True)
    place_of_birth = models.CharField(blank=True, null=True)
    gender = models.CharField(blank=True, null=True)
    nationality = models.CharField(blank=True, null=True)
    phone = models.CharField(blank=True, null=True)
    address = models.CharField(blank=True, null=True)
    filiere = models.CharField(blank=True, null=True)
    level = models.CharField(blank=True, null=True)
    domain = models.CharField(blank=True, null=True)
    matricule = models.CharField(blank=True, null=True)
    parent_name = models.CharField(blank=True, null=True)
    parent_phone = models.CharField(blank=True, null=True)
    parent_email = models.CharField(blank=True, null=True)
    qr_code = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING, blank=True, null=True)
    university_name = models.CharField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    locked_fee = models.ForeignKey(AcademicFees, models.DO_NOTHING, blank=True, null=True)
    student_type = models.CharField(blank=True, null=True)
    birth_certificate = models.CharField(blank=True, null=True)
    previous_diploma = models.CharField(blank=True, null=True)
    id_document = models.CharField(blank=True, null=True)
    photo_id = models.CharField(blank=True, null=True)
    bac_diploma = models.CharField(blank=True, null=True)
    bac_transcript = models.CharField(blank=True, null=True)
    medical_certificate = models.CharField(blank=True, null=True)
    previous_transcript = models.CharField(blank=True, null=True)
    success_certificate = models.CharField(blank=True, null=True)
    financial_clearance = models.CharField(blank=True, null=True)
    reenrollment_form = models.CharField(blank=True, null=True)
    file_status = models.CharField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    class_room = models.ForeignKey(ClassRooms, models.DO_NOTHING, blank=True, null=True)
    discount_amount = models.TextField(blank=True, null=True)  # This field type is a guess.
    discount_percentage = models.TextField(blank=True, null=True)  # This field type is a guess.
    discount_reason = models.CharField(blank=True, null=True)
    discount_approved_by = models.CharField(blank=True, null=True)
    net_tuition_amount = models.TextField(blank=True, null=True)  # This field type is a guess.
    payment_plan = models.CharField(blank=True, null=True)
    monthly_deposit = models.TextField(blank=True, null=True)  # This field type is a guess.
    monthly_installment = models.TextField(blank=True, null=True)  # This field type is a guess.
    monthly_months_count = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'students'


class SubscriptionPayments(models.Model):
    subscription = models.ForeignKey('UniversitySubscriptions', models.DO_NOTHING)
    amount = models.TextField()  # This field type is a guess.
    payment_date = models.DateField()
    period_covered = models.CharField(blank=True, null=True)
    payment_method = models.CharField(blank=True, null=True)
    reference = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    confirmed_by = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'subscription_payments'


class SubscriptionPlans(models.Model):
    name = models.CharField()
    display_name = models.CharField()
    description = models.TextField(blank=True, null=True)
    price = models.TextField()  # This field type is a guess.
    billing_cycle = models.CharField(blank=True, null=True)
    max_students = models.IntegerField()
    max_teachers = models.IntegerField()
    features = models.TextField(blank=True, null=True)
    trial_days = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(blank=True, null=True)
    is_popular = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'subscription_plans'


class Suppliers(models.Model):
    name = models.CharField()
    category = models.CharField(blank=True, null=True)
    contact_name = models.CharField(blank=True, null=True)
    phone = models.CharField(blank=True, null=True)
    email = models.CharField(blank=True, null=True)
    address = models.CharField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'suppliers'


class Teachers(models.Model):
    first_name = models.CharField()
    last_name = models.CharField()
    email = models.CharField()
    department = models.CharField()
    speciality = models.CharField()
    phone = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    qr_code = models.CharField(blank=True, null=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    university_name = models.CharField(blank=True, null=True)
    filiere = models.ForeignKey(Filieres, models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'teachers'


class TeachingUnits(models.Model):
    code = models.CharField()
    name = models.CharField()
    credits = models.IntegerField()
    category = models.CharField(blank=True, null=True)
    semester = models.CharField(blank=True, null=True)
    level = models.CharField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    filiere = models.ForeignKey(Filieres, models.DO_NOTHING, blank=True, null=True)
    university = models.ForeignKey('Universities', models.DO_NOTHING)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'teaching_units'


class Universities(models.Model):
    name = models.CharField(blank=True, null=True)
    email = models.CharField(blank=True, null=True)
    country = models.CharField(blank=True, null=True)
    address = models.CharField(blank=True, null=True)
    phone = models.CharField(blank=True, null=True)
    logo = models.CharField(blank=True, null=True)
    slogan = models.CharField(blank=True, null=True)
    website = models.CharField(blank=True, null=True)
    description = models.CharField(blank=True, null=True)
    established_year = models.CharField(blank=True, null=True)
    rector_name = models.CharField(blank=True, null=True)
    academic_year = models.CharField(blank=True, null=True)
    card_config = models.TextField(blank=True, null=True)  # This field type is a guess.
    is_active = models.BooleanField(blank=True, null=True)
    status = models.CharField(blank=True, null=True)
    custom_domain = models.CharField(blank=True, null=True)
    institution_type = models.CharField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'universities'


class UniversitySubscriptions(models.Model):
    university = models.ForeignKey(Universities, models.DO_NOTHING)
    plan = models.ForeignKey(SubscriptionPlans, models.DO_NOTHING)
    status = models.CharField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    trial_ends_at = models.DateField(blank=True, null=True)
    auto_renew = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'university_subscriptions'


class Users(models.Model):
    full_name = models.CharField()
    email = models.CharField()
    hashed_password = models.CharField()
    is_active = models.BooleanField(blank=True, null=True)
    role = models.CharField(blank=True, null=True)
    phone = models.CharField(blank=True, null=True)
    photo = models.CharField(blank=True, null=True)
    last_login = models.DateTimeField(blank=True, null=True)
    is_email_verified = models.BooleanField(blank=True, null=True)
    email_verification_token = models.CharField(blank=True, null=True)
    last_seen = models.DateTimeField(blank=True, null=True)
    is_online = models.BooleanField(blank=True, null=True)
    university = models.ForeignKey(Universities, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'
