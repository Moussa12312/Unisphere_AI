from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base

class ClientInvoice(Base):
    __tablename__ = "client_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="pending")  # pending, paid, overdue, cancelled
    invoice_type = Column(String, default="subscription")  # subscription, direct_sale, maintenance, feature_request, other
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    university = relationship("University", backref="client_invoices")
    payments = relationship("ClientPayment", back_populates="invoice", cascade="all, delete-orphan")
    linked_features = relationship("FeatureRequest", back_populates="invoice")


class ClientPayment(Base):
    __tablename__ = "client_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("client_invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String, default="virement")  # virement, mobile_money, cheque, especes
    reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("ClientInvoice", back_populates="payments")


class UniversityBillingConfig(Base):
    __tablename__ = "university_billing_configs"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), unique=True, nullable=False)
    billing_model = Column(String, default="monthly")  # monthly, yearly, direct_sale
    amount = Column(Float, default=250000.0)
    maintenance_enabled = Column(Boolean, default=True)
    maintenance_interval_months = Column(Integer, default=6)  # suivi et maintenance tous les 6 mois
    maintenance_amount = Column(Float, default=350000.0)
    last_maintenance_date = Column(Date, nullable=True)
    next_maintenance_date = Column(Date, nullable=True)
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    university = relationship("University", backref="billing_config", uselist=False)


class FeatureRequest(Base):
    __tablename__ = "feature_requests"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, default=0.0)  # Montant configurable par le superadmin
    status = Column(String, default="pending")  # pending, approved, in_development, completed, billed
    requested_date = Column(Date, nullable=True)
    completed_date = Column(Date, nullable=True)
    invoice_id = Column(Integer, ForeignKey("client_invoices.id"), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    university = relationship("University", backref="feature_requests")
    invoice = relationship("ClientInvoice", back_populates="linked_features")

