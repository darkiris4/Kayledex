# Homeschool Recordkeeping Platform — Product Specification

## 1. Product Overview

**Working Name:** TBD

A self-hosted, open-source homeschool recordkeeping and academic management platform designed to make daily homeschool documentation extremely fast while providing professional, official-looking academic and attendance reports.

The application will be:

- FOSS
- Self-hosted
- Docker-native
- Web-based
- Responsive/mobile-friendly
- PostgreSQL-backed
- Usable without authentication
- Designed for one or multiple students
- Designed to support multiple homeschool approaches and curricula
- Configurable for different state requirements
- Capable of generating formal academic records suitable for submission to appropriate offices

The system must not hard-code Illinois-specific assumptions into the core application. Instead, state-specific requirements will be represented through configurable Compliance Profiles.

## 2. Product Philosophy

The application should follow five principles:

### 2.1 Logging must be effortless

Recording a normal homeschool day should take seconds rather than minutes.

### 2.2 The system records education, not bureaucracy

The core data model should describe what the student actually did. State-specific requirements determine how that information is interpreted and reported.

### 2.3 Flexibility over rigid curriculum models

Homeschoolers frequently mix:

- Multiple curricula
- Self-created lessons
- Projects
- Books
- Online resources
- Field trips
- Informal instruction

The application must support all of these.

### 2.4 Configuration over assumptions

Where homeschool practices vary, behavior should generally be configurable through application settings.

Examples:

- Minimum instructional hours
- Minimum instructional days
- Attendance rules
- Grade calculation
- Curriculum tracking
- Subject requirements

### 2.5 User owns the data

The application must not require a cloud account or external service. Data should be exportable and portable.

## 3. Target Users

Primary users:

- Homeschool parents
- Homeschool families
- Homeschool co-ops
- Independent educators

The initial deployment will support a single family but the architecture must support multiple students.

Future possibilities include:

- Homeschool organizations
- Umbrella schools
- Educational consultants
- Multi-family deployments

These should not complicate the initial user experience.

## 4. Deployment Requirements

### 4.1 Runtime

The application must run using Docker.

Minimum deployment should ideally be:

```
Docker Compose
    │
    ├── Application
    │
    └── PostgreSQL
```

Avoid unnecessary infrastructure in the initial release. Redis, object storage, message queues, etc. should only be introduced when an actual requirement exists.

### 4.2 Database

PostgreSQL is the required persistent database. The database must contain all authoritative application data. Database migrations must be supported from the beginning.

### 4.3 Network

The application is intended to operate primarily on a private/home network. Authentication is not required for the initial product.

The application should not depend on:

- SaaS authentication
- Cloud APIs
- External databases
- Internet connectivity

The application should remain fully functional when Internet access is unavailable.

## 5. User Interface

The UI is a major product requirement. It should be:

- Modern
- Clean
- Minimal
- Responsive
- Touch-friendly
- Tablet-friendly
- Mobile-friendly
- Accessible
- Fast

The UI should avoid looking like traditional school administration software. The primary workflow should feel closer to a modern productivity application.

## 6. Dashboard

The dashboard is the primary landing page. It should provide a quick overview of the current school year.

Example:

```
2026–2027 School Year

Jane Doe
4th Grade

Today
──────────────────────────────────

✓ Math                 45 min
✓ Reading              30 min
✓ Science              50 min
+ Add Subject

──────────────────────────────────

Today
2h 05m instructional time

This Week
5 school days
9h 42m instructional time

This Year
168 instructional days
```

The exact visual design is implementation-specific.

## 7. Quick Logging

A Quick Log workflow is a core feature. The user should be able to record a typical activity with minimal interaction.

Example:

```
+ Log School

Subject
[ Math ]

Activity
[ Saxon Math Lesson 38 ]

Duration
[ 45 minutes ]

Completed
[ ✓ ]

Notes
[ __________________ ]

Save
```

The user should also be able to create a generic record:

```
Subject: Math
Duration: 45 minutes
```

without specifying curriculum or lesson information.

## 8. School Days

A school day is a first-class domain object. Each day should support:

- Date
- Student
- Status
- Instructional time
- Notes
- Instruction records
- Attendance classification

Possible statuses should include at minimum:

- Instructional
- Partial
- Non-instructional
- Holiday
- Vacation
- Sick
- Field Trip
- Other

The exact meaning of each status should be configurable.

## 9. Attendance

The system must support both:

- **Instructional days** — counting a day as a school day.
- **Instructional hours** — tracking the amount of educational time performed.

The user must be able to configure which metric is relevant.

Example:

```
Attendance Settings

Track instructional days       ✓
Track instructional hours      ✓

Minimum hours per day
[ Configurable ]

Minimum instructional days
[ Configurable ]
```

The application must not assume that every state uses a fixed number of instructional days or hours.

## 10. Retroactive Logging

Users must be able to:

- Add previous school days
- Modify previous days
- Add activities to previous days
- Correct attendance
- Modify grades
- Modify curriculum progress

Historical records must remain editable.

## 11. Students

The application must support multiple students. Each student should have:

- Name
- Date of birth
- Grade level
- Student identifier (optional)
- Start date
- Active/inactive status
- School years

The UI should make the active student obvious.

## 12. School Years

A student may have multiple school years. A school year contains:

- Name
- Start date
- End date
- Grade
- Active status
- Attendance configuration
- Subjects
- Courses
- Curriculum
- Reports

Example:

```
2026–2027
Grade 4
August 24, 2026 – May 28, 2027
```

School years must not be tied to calendar years.

## 13. Subjects

Subjects are configurable.

Examples:

- Mathematics
- Language Arts
- Reading
- Science
- Social Studies
- History
- Fine Arts
- Music
- Physical Education
- Health
- Foreign Language
- Religious Studies
- Custom subjects

Subjects must support:

- Name
- Description
- Icon
- Display color
- Active/inactive
- State/compliance mappings

Subjects must not be hard-coded.

## 14. Courses

A course represents an academic course of study.

Example:

```
Mathematics
4th Grade Mathematics
```

A course may use one or more curricula. This allows:

```
4th Grade Mathematics
 ├── Saxon Math 4
 └── Supplemental worksheets
```

## 15. Curriculum

Curriculum tracking is optional. A curriculum may include:

- Name
- Publisher
- Subject
- Course
- Start date
- End date
- Description
- Lessons/items
- Completion status

Example:

```
Saxon Math 4

87 / 120 lessons complete
72.5%
```

Curriculum tracking can be disabled globally or per student/school year.

## 16. Lessons

A curriculum may contain individual lessons.

Examples:

```
Saxon Math 4
 ├── Lesson 1
 ├── Lesson 2
 ├── Lesson 3
 ...
 └── Lesson 120
```

A lesson may contain:

- Name
- Number
- Description
- Expected duration
- Completion status
- Notes
- Assessment
- Attachments

However, lessons must not be required to log an activity.

## 17. General Activities

Users must be able to log activities without curriculum.

Example:

```
Science
Activity:
"Built a model of the solar system"

Duration:
90 minutes

Notes:
"Worked on planet sizes and relative distances."
```

This is a fundamental requirement because homeschool education is not always curriculum-driven.

## 18. Instruction Records

An instruction record represents something that actually occurred. It may contain:

- Student
- School day
- Subject
- Course
- Curriculum
- Lesson
- Activity description
- Duration
- Start time
- End time
- Completion status
- Notes
- Attachments

Most fields should be optional. The simplest valid record should be:

- Date
- Student
- Subject

## 19. Time Tracking

The application must support multiple tracking modes.

- Duration — `45 minutes`
- Start/end — `09:15 → 10:00`
- No time tracking

The user should be able to disable duration tracking. This should be configurable.

## 20. Assessments

Assessments must support:

- Assignment
- Quiz
- Test
- Project
- Oral assessment
- Other/custom

Assessment fields:

- Name
- Date
- Type
- Points earned
- Points possible
- Percentage
- Grade
- Weight
- Notes
- Subject
- Course
- Curriculum/lesson

## 21. Grade Calculation

The application must support automatic grade calculation.

Basic calculation:

```
percentage = points_earned / points_possible × 100
```

The system must support weighted grading.

Example:

```
Assignments    20%
Quizzes        20%
Tests          40%
Projects       20%
```

Letter-grade mappings must be configurable.

Example:

```
A+  97–100
A   93–96.99
A-  90–92.99
B+  87–89.99
...
```

The application must not assume that every homeschool uses the same grading scale.

## 22. Compliance System

Compliance is a core architectural component. The application must support Compliance Profiles.

Example:

```
Compliance Profile
Illinois Homeschool
```

A profile may define:

- Required subjects
- Attendance requirements
- Instructional-hour requirements
- Instructional-day requirements
- Testing requirements
- Recordkeeping recommendations
- Reporting requirements
- Grade-level expectations
- State-specific mappings

## 23. State Profiles

The application should eventually support all U.S. states. State-specific information should be stored separately from the core application.

Example:

```
Compliance Profiles

Illinois
Texas
California
Florida
New York
...
```

Each profile should contain:

- State
- Profile version
- Last verified date
- Source URLs
- Requirements
- Notes
- Disclaimer

State profiles should be version-controlled and ideally stored as data/configuration rather than embedded application logic.

## 24. Compliance Sources

Each legal/compliance requirement should record its source.

Example:

```
Requirement:
Required instructional subjects

Source:
Illinois State Board of Education

Source URL:
...

Last Verified:
2026-08-21
```

The application must distinguish between **official requirements** and **recommended recordkeeping practices**.

The application should include an appropriate disclaimer that compliance information is informational and should not be treated as legal advice.

## 25. Compliance Dashboard

The application should provide a compliance overview.

Example:

```
Illinois Homeschool

✓ Mathematics documented
✓ Language Arts documented
✓ Science documented
✓ Social Science documented
✓ Fine Arts documented
✓ Physical Development & Health documented

Attendance
✓ 168 instructional days recorded

Records
✓ Attendance records
✓ Subject records
✓ Assessments
✓ Grades
```

The exact rules depend on the active compliance profile.

## 26. Reporting

Reporting is a first-class feature. Reports must support filtering by:

- Student
- School year
- Date range
- Subject
- Course
- Curriculum
- Report type
- Custom filters

Built-in reports should include:

**Attendance Report** — shows instructional days, partial days, non-instructional days, instructional hours, date-by-date attendance.

**Subject Report** — shows subjects, time spent, activities, assessments, grades.

**Academic Report Card** — shows courses, grades, percentages, comments.

**Transcript** — shows student, grade level, courses, final grades, credits where applicable.

**Curriculum Progress** — shows curriculum, lessons completed, lessons remaining, completion percentage.

**Daily Activity Log** — shows every instructional record within a selected period.

**Assessment Report** — shows assessment, date, subject, score, grade.

**Portfolio Report** — combines activities, narrative notes, assessments, attachments, work samples.

**State Compliance Report** — generates a report based on the active Compliance Profile.

## 27. Report Appearance

Reports must look professional and suitable for official recordkeeping. Reports should include:

- Student information
- School year
- Report title
- Date generated
- Relevant parent/educator information
- Tables
- Totals
- Page numbers
- Optional signature area

PDF is the primary formal report format. CSV export should also be available. Additional export formats may be added later.

## 28. Data Export

Users must always be able to export their data.

At minimum:

**Full backup** — a portable archive containing structured database data, attachments, metadata, and generated reports where applicable.

**CSV** — for major entities such as attendance, activities, grades, assessments, subjects.

**JSON** — a machine-readable complete export.

## 29. Data Import

The application should eventually support:

- Full application backup restoration
- JSON import
- CSV import

Import operations should validate data before modifying the database.

## 30. Attachments

The architecture should support attachments even if attachment functionality is not part of the first MVP.

Possible attachments:

- PDFs
- Images
- Worksheets
- Scanned assignments
- Photos
- Documents

Attachments may be associated with:

- Activities
- Lessons
- Assessments
- Students
- Reports

## 31. Calendar

A calendar should provide a visual overview of the school year. It should show:

- Instructional days
- Partial days
- Holidays
- Vacation
- Other non-instructional days

Users should be able to click a day to view/edit its records.

The calendar should support:

- Month view
- Year overview

A week view can be added if useful.

## 32. Search

The application should eventually support global search. Searchable content should include:

- Activities
- Notes
- Lessons
- Assessments
- Curriculum
- Students
- Dates

Example:

```
Search "fractions"
```

could return every activity, lesson, assessment, and note mentioning fractions.

## 33. Settings

Settings should control behavior rather than forcing assumptions.

Settings categories:

- **Family** — Family name, Parent/educator information, Students, Student defaults
- **School** — School year, Calendar, Instructional days, Attendance
- **Grading** — Grade scale, Weighted grading, Letter grades
- **Curriculum** — Curriculum tracking enabled/disabled
- **Time Tracking** — Duration, Start/end, Disabled
- **Compliance** — State, Compliance profile, Custom requirements
- **Reports** — Report branding, Header, Footer, Signature information
- **Data** — Export, Import, Backup, Restore

## 34. Branding

Because the application is intended to become a real FOSS product, reports should support basic customization.

Possible settings:

- Family/school name
- Logo
- Address
- Contact information
- Parent/teacher name
- Report footer

The application itself should retain its own product branding.

## 35. Accessibility

Accessibility should be considered from the beginning.

Target:

- Keyboard navigation
- Screen-reader compatibility
- Appropriate ARIA semantics
- Sufficient contrast
- Large touch targets
- Responsive layout
- Clear error messages

## 36. Internationalization

The initial release can target the United States and English. However, the architecture should avoid hard-coding:

- Date formats
- Currency
- Grade names
- State names
- Language strings

Localization can be added later.

## 37. Security

The initial deployment does not require authentication. However, security practices should still include:

- Parameterized database queries
- Input validation
- CSRF protection where applicable
- Secure file handling
- Content-type validation
- Safe PDF generation
- No arbitrary command execution
- No unnecessary external network access

The application should be safe to place behind a reverse proxy later. Authentication should be architecturally possible without requiring it in the MVP.

## 38. Privacy

The application should be privacy-first. By default:

- No analytics
- No telemetry
- No external API calls
- No cloud synchronization
- No user account
- No advertising
- No data collection

All homeschool data remains under the user's control.

## 39. AI

AI is not required for the core product. The architecture may eventually support optional AI-assisted functionality such as:

- Converting natural-language notes into structured activities
- Generating narrative report comments
- Summarizing a school year
- Suggesting subject classifications
- Generating curriculum summaries

AI features must be optional and must not make the application dependent on an external AI provider.

## 40. Technology Direction

The implementation should use modern, well-supported technologies.

Recommended direction:

**Frontend**
- React
- TypeScript
- Tailwind CSS
- Modern component library such as shadcn/ui
- PWA support

**Backend**

A strongly typed API framework. Candidate: TypeScript/Node.js, or another well-supported language/framework if implementation considerations make it preferable.

**Database**
- PostgreSQL

**Containerization**
- Docker
- Docker Compose

**Reporting**

Server-side PDF generation.

## 41. Suggested Initial Domain Model

Core entities:

- Family
- Student
- SchoolYear
- Subject
- Course
- Curriculum
- CurriculumItem
- SchoolDay
- InstructionRecord
- Activity
- Assessment
- Grade
- AttendanceRecord
- ComplianceProfile
- ComplianceRequirement
- Report
- ReportTemplate
- Attachment

Relationships should be designed so that a single student can have multiple school years and a school year can contain multiple courses, curricula, subjects, activities, and assessments.

## 42. MVP

The first release should include:

**Core**
- Docker deployment
- PostgreSQL
- Student management (multiple students)
- School years
- Subject management
- Daily logging (Quick Log, retroactive entry)
- Calendar
- Attendance
- Duration tracking
- Notes
- Dashboard

**Academic**
- Courses
- Basic curriculum tracking
- Lessons
- Assessments
- Basic grades
- Configurable grade scale

**Reports**
- Attendance
- Subject activity
- Academic report card
- Curriculum progress
- Daily activity report
- PDF export

**Configuration**
- School-year settings
- Attendance settings
- Time-tracking settings
- Grade settings
- Curriculum settings

**Data**
- PostgreSQL persistence
- JSON export
- CSV export
- Backup/restore foundation

## 43. Post-MVP

**Release 2**
- Advanced grade calculation
- Transcripts
- Portfolio reports
- Attachments
- Advanced PDF customization
- Search
- State compliance profiles
- Compliance dashboard

**Release 3**
- State-specific report templates
- Additional state profiles
- Import/export improvements
- PWA/offline enhancements
- Advanced curriculum management
- Custom report builder

**Future**
- Optional AI assistance
- Multi-family deployments
- Authentication
- Multiple educators
- Collaboration
- Plugin architecture
- Internationalization

## 44. FOSS Project Requirements

The project should be designed for public GitHub release from the beginning.

The repository should eventually contain:

```
/docs
/src
/database
/compliance
/reports
/docker
/tests
```

Additional documentation:

- README
- Installation guide
- Docker deployment guide
- Configuration guide
- User guide
- Developer guide
- Database architecture
- API documentation
- Compliance profile contribution guide
- State-profile verification methodology
- Backup/restore documentation

The project should use an OSI-approved open-source license. License selection should be made before public release.

## 45. Compliance Data Contribution Model

State profiles should be independently maintainable. A contributor should be able to submit:

```
/compliance
    /US
        /IL
        /TX
        /CA
        /FL
        ...
```

Each profile should include:

- Requirements
- Sources
- Verification date
- Version
- Notes
- Disclaimer

Pull requests modifying legal/compliance information should require explicit review. This prevents random contributors from accidentally changing a legal requirement without review.

## 46. Non-Goals

The initial application is not intended to be:

- A full LMS
- A virtual classroom
- A video-conferencing system
- A curriculum marketplace
- A lesson-planning replacement
- A student social network
- A cloud SaaS product
- A mandatory AI application

The focus is: record what was taught, understand academic progress, document attendance, and produce professional records.

## 47. Product Success Criteria

The application should satisfy the following tests.

**Daily use** — A parent can record a typical subject in under 30 seconds.

**End of day** — A parent can document a complete school day in under two minutes.

**Retroactive entry** — A parent can recreate a previous school day without fighting the interface.

**Reporting** — A parent can generate an official-looking report for an arbitrary date range in a few clicks.

**Flexibility** — The system can represent "Saxon Math + library books + YouTube science + field trip + parent-created activities" without requiring workarounds.

**State support** — Adding a new state's requirements should not require modifying the core education data model.

**Ownership** — A user can export their complete data and move to another installation.

**Deployment** — A technically competent user can deploy the application with `docker compose up -d`.

## 48. Core Design Principle

The most important architectural rule for the entire project is:

> The application records facts; configuration determines interpretation.

For example:

- Fact: Jane received 90% on a mathematics assessment.
- Fact: Jane received 45 minutes of mathematics instruction on August 21.
- Fact: August 21 was marked as an instructional day.

The application doesn't inherently decide whether that constitutes sufficient homeschooling. The active school-year configuration and Compliance Profile determine how those facts are interpreted and presented.

That separation is what allows the same application to work for Illinois, Texas, California, New York, or any other jurisdiction without turning the codebase into a giant collection of state-specific exceptions.
