import uuid
from datetime import date, timedelta

from app.models import (
    Assessment,
    AssessmentType,
    Family,
    GradeScale,
    GradeScaleBand,
    SchoolYear,
    Settings,
    Student,
    Subject,
)


def _make_student(db, *, with_scale=True, with_year=True):
    family = Family(name="The Test Family")
    db.add(family)
    db.flush()

    student = Student(family_id=family.id, name="Kaylee", grade_level="1st")
    db.add(student)
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

    if with_year:
        today = date.today()
        db.add(
            SchoolYear(
                student_id=student.id,
                name="Current",
                start_date=today - timedelta(days=30),
                end_date=today + timedelta(days=30),
            )
        )
    db.commit()
    return family, student


def _grade(db, student, subject, earned, possible, *, days_ago=1):
    db.add(
        Assessment(
            student_id=student.id,
            subject_id=subject.id,
            name="Check",
            date=date.today() - timedelta(days=days_ago),
            type=AssessmentType.quiz,
            points_earned=earned,
            points_possible=possible,
        )
    )


def _subject(db, family, name):
    subject = Subject(family_id=family.id, name=name)
    db.add(subject)
    db.flush()
    return subject


def test_grades_average_overall_and_per_subject(client, db):
    family, student = _make_student(db)
    math = _subject(db, family, "Math")
    reading = _subject(db, family, "Reading")
    _grade(db, student, math, 95, 100)
    _grade(db, student, math, 91, 100)
    _grade(db, student, reading, 85, 100)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["student"] == "Kaylee"
    assert body["grade_level"] == "1st"
    assert body["school_year"] == "Current"
    assert body["assessments"] == 3
    assert body["overall_percentage"] == 90.3
    assert body["overall_letter"] == "A"
    assert body["subjects"] == [{"name": "Math", "grade": "A"}, {"name": "Reading", "grade": "B"}]


def test_grades_ignore_assessments_outside_the_school_year(client, db):
    family, student = _make_student(db)
    math = _subject(db, family, "Math")
    _grade(db, student, math, 100, 100)
    _grade(db, student, math, 50, 100, days_ago=90)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["assessments"] == 1
    assert body["overall_percentage"] == 100.0


def test_grades_skip_assessments_without_points(client, db):
    family, student = _make_student(db)
    math = _subject(db, family, "Math")
    _grade(db, student, math, None, None)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["assessments"] == 0
    assert body["overall_percentage"] is None
    assert body["overall_letter"] is None
    assert body["subjects"] == [{"name": "Math", "grade": "-"}]


def test_grades_without_a_current_school_year(client, db):
    family, student = _make_student(db, with_year=False)
    math = _subject(db, family, "Math")
    _grade(db, student, math, 95, 100)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["school_year"] is None
    assert body["assessments"] == 0
    assert body["subjects"] == [{"name": "Math", "grade": "-"}]


def test_grades_without_an_active_scale_show_percentages(client, db):
    family, student = _make_student(db, with_scale=False)
    math = _subject(db, family, "Math")
    _grade(db, student, math, 92, 100)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["overall_percentage"] == 92.0
    assert body["overall_letter"] is None
    assert body["subjects"] == [{"name": "Math", "grade": "92%"}]


def test_grades_trim_subject_names(client, db):
    family, student = _make_student(db)
    math = _subject(db, family, " Math ")
    _grade(db, student, math, 95, 100)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["subjects"] == [{"name": "Math", "grade": "A"}]


def test_grades_list_ungraded_active_subjects_and_omit_inactive_ones(client, db):
    family, student = _make_student(db)
    math = _subject(db, family, "Math")
    _subject(db, family, "Art")
    gym = _subject(db, family, "Gym")
    gym.active = False
    _grade(db, student, math, 95, 100)
    db.commit()

    body = client.get("/api/dashboard/grades", params={"student_id": str(student.id)}).json()

    assert body["subjects"] == [{"name": "Art", "grade": "-"}, {"name": "Math", "grade": "A"}]


def test_grades_unknown_student_is_404(client):
    response = client.get("/api/dashboard/grades", params={"student_id": str(uuid.uuid4())})

    assert response.status_code == 404
