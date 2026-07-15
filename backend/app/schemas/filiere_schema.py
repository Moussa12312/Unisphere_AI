from pydantic import BaseModel

class FiliereCreate(BaseModel):
    domain: str
    name: str
    levels: str  # Ex: "L1, L2, L3, M1, M2"

class FiliereUpdate(BaseModel):
    domain: str
    name: str
    levels: str