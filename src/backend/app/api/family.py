import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Family
from app.schemas.family import FamilyCreate, FamilyRead, FamilyUpdate

router = APIRouter(prefix="/api/families", tags=["families"])


@router.get("", response_model=list[FamilyRead])
def list_families(db: Session = Depends(get_db)):
    return db.query(Family).all()


@router.post("", response_model=FamilyRead, status_code=201)
def create_family(payload: FamilyCreate, db: Session = Depends(get_db)):
    family = Family(**payload.model_dump())
    db.add(family)
    db.commit()
    db.refresh(family)
    return family


@router.get("/{family_id}", response_model=FamilyRead)
def get_family(family_id: uuid.UUID, db: Session = Depends(get_db)):
    family = db.get(Family, family_id)
    if not family:
        raise HTTPException(404, "Family not found")
    return family


@router.patch("/{family_id}", response_model=FamilyRead)
def update_family(family_id: uuid.UUID, payload: FamilyUpdate, db: Session = Depends(get_db)):
    family = db.get(Family, family_id)
    if not family:
        raise HTTPException(404, "Family not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(family, key, value)
    db.commit()
    db.refresh(family)
    return family


@router.delete("/{family_id}", status_code=204)
def delete_family(family_id: uuid.UUID, db: Session = Depends(get_db)):
    family = db.get(Family, family_id)
    if not family:
        raise HTTPException(404, "Family not found")
    db.delete(family)
    db.commit()
