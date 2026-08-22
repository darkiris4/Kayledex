from datetime import date

from app.core.grading import compute_grade
from app.models import (
    Assessment,
    AssessmentType,
    Family,
    GradeScale,
    GradeScaleBand,
    Settings,
    Student,
    Subject,
)


def _make_assessment(db, *, points_earned, points_possible, with_scale):
    family = Family(name="The Test Family")
    db.add(family)
    db.flush()

    student = Student(family_id=family.id, name="Kaylee")
    subject = Subject(family_id=family.id, name="Mathematics")
    db.add_all([student, subject])
    db.flush()

    if with_scale:
        scale = GradeScale(family_id=family.id, name="Standard")
        db.add(scale)
        db.flush()
        db.add(GradeScaleBand(grade_scale_id=scale.id, letter="A", min_percentage=90, max_percentage=100))
        db.add(GradeScaleBand(grade_scale_id=scale.id, letter="B", min_percentage=80, max_percentage=89.99))
        db.add(Settings(family_id=family.id, active_grade_scale_id=scale.id))
    else:
        db.add(Settings(family_id=family.id))

    assessment = Assessment(
        student_id=student.id,
        subject_id=subject.id,
        name="Chapter 4 Test",
        date=date(2026, 9, 1),
        type=AssessmentType.test,
        points_earned=points_earned,
        points_possible=points_possible,
    )
    db.add(assessment)
    db.commit()
    return assessment


def test_compute_grade_with_matching_band(db):
    assessment = _make_assessment(db, points_earned=93, points_possible=100, with_scale=True)

    percentage, letter = compute_grade(assessment, db)

    assert percentage == 93.0
    assert letter == "A"


def test_compute_grade_without_active_scale_returns_percentage_only(db):
    assessment = _make_assessment(db, points_earned=45, points_possible=50, with_scale=False)

    percentage, letter = compute_grade(assessment, db)

    assert percentage == 90.0
    assert letter is None


def test_compute_grade_without_points_returns_none(db):
    assessment = _make_assessment(db, points_earned=None, points_possible=None, with_scale=True)

    percentage, letter = compute_grade(assessment, db)

    assert percentage is None
    assert letter is None
