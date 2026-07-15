from sqlalchemy import Column, Integer, Boolean, Float, ForeignKey
from app.database.connection import Base


class AnomalyConfig(Base):
    __tablename__ = "anomaly_config"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), unique=True, nullable=False)
    enable_anomalies = Column(Boolean, default=True)
    threshold_exceptional = Column(Float, default=19.0)
    threshold_very_high = Column(Float, default=18.0)
    threshold_very_low = Column(Float, default=3.0)
    threshold_low = Column(Float, default=5.0)