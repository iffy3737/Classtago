/**
 * EDUNIXO Batch 6C R2D
 * Role-wise visible module blueprint.
 *
 * Permanent rule:
 * - One business feature has one canonical owner module.
 * - Dashboard and Unified Approval Inbox entries are shortcuts only.
 * - Multiple visible modules may currently route to an existing parent workspace
 *   while independent screens are split in later implementation batches.
 */

export type CanonicalDashboardTab =
  | 'overview'
  | 'admission_desk'
  | 'accounts'
  | 'security'
  | 'academic_setup'
  | 'language_settings'
  | 'website_studio'
  | 'master_data'
  | 'timetable_v2'
  | 'attendance'
  | 'leave_management'
  | 'exams'
  | 'result_management'
  | 'analytics'
  | 'fees'
  | 'accounting'
  | 'payroll'
  | 'library'
  | 'inventory'
  | 'communication'
  | 'gatekeeper_security'
  | 'erp_admin'
  | 'gov_registers'
  | 'executive_dss'
  | 'staff_master';

export interface RoleModuleFeature {
  id: string;
  label: string;
  targetTab?: CanonicalDashboardTab;
  shortcut?: boolean;
  ownerModuleId?: string;
  ownerFeatureId?: string;
}

export interface RoleVisibleModule {
  id: string;
  label: string;
  tab: CanonicalDashboardTab;
  description?: string;
  badge?: string;
  /** Navigation-only rows expand their child features instead of opening a workspace. */
  navigationOnly?: boolean;
  features: RoleModuleFeature[];
}

export interface RoleModuleCategory {
  id: string;
  label: string;
  modules: RoleVisibleModule[];
  /** Render the single module directly in the drawer without a parent category row. */
  standalone?: boolean;
}

export const ROLE_MODULE_BLUEPRINT: Record<string, RoleModuleCategory[]> = {
  "headmaster": [
    {
      "id": "command",
      "label": "Command & Governance",
      "modules": [
        {
          "id": "hm-command-center",
          "label": "School Command Center",
          "tab": "overview",
          "features": [
            {
              "id": "daily-operations-summary",
              "label": "Daily operations summary"
            },
            {
              "id": "school-alerts",
              "label": "School alerts and exceptions"
            },
            {
              "id": "school-kpis",
              "label": "Current school KPIs"
            },
            {
              "id": "pending-decisions",
              "label": "Pending decisions and approvals"
            },
            {
              "id": "quick-module-shortcuts",
              "label": "Quick links to canonical modules"
            }
          ],
          "description": "Operational summary only; business actions remain in their owner modules."
        },

        {
          "id": "hm-approval-inbox",
          "label": "Unified Approval Inbox",
          "tab": "overview",
          "features": [
            {
              "id": "shortcut-admission-approval",
              "label": "Admission approvals → Admission Confirmation",
              "targetTab": "website_studio",
              "shortcut": true,
              "ownerModuleId": "hm-admission-campaigns",
              "ownerFeatureId": "final-admission-verification"
            },
            {
              "id": "shortcut-student-lifecycle",
              "label": "Student lifecycle requests → Student Lifecycle",
              "targetTab": "master_data",
              "shortcut": true,
              "ownerModuleId": "hm-student-lifecycle",
              "ownerFeatureId": "student-lifecycle-requests"
            },
            {
              "id": "shortcut-student-service-requests",
              "label": "Student service requests → Student Service Requests",
              "targetTab": "master_data",
              "shortcut": true,
              "ownerModuleId": "hm-student-service-requests",
              "ownerFeatureId": "student-service-request-queue"
            },
            {
              "id": "shortcut-leave-approval",
              "label": "Leave requests → Leave Management",
              "targetTab": "leave_management",
              "shortcut": true,
              "ownerModuleId": "hm-leave-management",
              "ownerFeatureId": "staff-leave-review"
            },
            {
              "id": "shortcut-attendance-corrections",
              "label": "Attendance corrections → Student Attendance",
              "targetTab": "attendance",
              "shortcut": true,
              "ownerModuleId": "hm-student-attendance",
              "ownerFeatureId": "attendance-corrections"
            },
            {
              "id": "shortcut-result-publish",
              "label": "Result publication → Result Management",
              "targetTab": "result_management",
              "shortcut": true,
              "ownerModuleId": "hm-result-management",
              "ownerFeatureId": "result-publication-lock"
            },
            {
              "id": "shortcut-certificate-issue",
              "label": "Certificate issue → Certificates & Documents",
              "targetTab": "gov_registers",
              "shortcut": true,
              "ownerModuleId": "hm-certificates",
              "ownerFeatureId": "certificate-approval"
            },
            {
              "id": "shortcut-communication-approval",
              "label": "Communication drafts → Communication Hub",
              "targetTab": "communication",
              "shortcut": true,
              "ownerModuleId": "hm-communication",
              "ownerFeatureId": "school-notices"
            },
            {
              "id": "shortcut-fee-concession",
              "label": "Fee concessions → Smart Fees Desk",
              "targetTab": "fees",
              "shortcut": true,
              "ownerModuleId": "hm-smart-fees-desk",
              "ownerFeatureId": "fees-concessions"
            },
            {
              "id": "shortcut-payroll-finalize",
              "label": "Payroll finalization → Payroll & HRMS",
              "targetTab": "payroll",
              "shortcut": true,
              "ownerModuleId": "hm-payroll",
              "ownerFeatureId": "payroll-processing"
            },
            {
              "id": "shortcut-writeoff",
              "label": "Inventory write-off → Inventory & Assets",
              "targetTab": "inventory",
              "shortcut": true,
              "ownerModuleId": "hm-inventory",
              "ownerFeatureId": "writeoff-disposal-approval"
            }
          ],
          "description": "A pending-action inbox. It links to owner modules and never duplicates approval forms.",
          "badge": "Shortcuts"
        }
      ]
    },
    {
      "id": "executive-dashboard-main",
      "label": "Executive Dashboard",
      "standalone": true,
      "modules": [
        {
          "id": "hm-executive-analytics",
          "label": "Executive Dashboard",
          "tab": "executive_dss",
          "description": "School-scoped executive trends and decision indicators for the Headmaster.",
          "features": [
            {
              "id": "student-strength-trends",
              "label": "Student Strength Trends"
            },
            {
              "id": "attendance-trends",
              "label": "Attendance Trend Analysis"
            },
            {
              "id": "result-trends",
              "label": "Result Performance Trends"
            },
            {
              "id": "fee-position-analysis",
              "label": "Fee Position Analysis"
            },
            {
              "id": "staff-workload-analysis",
              "label": "Staff Workload Analysis"
            }
          ]
        }
      ]
    },
    {
      "id": "admission-review-main",
      "label": "Admissions Review & Confirmation",
      "standalone": true,
      "modules": [
        {
          "id": "hm-admission-campaigns",
          "label": "Admissions Review & Confirmation",
          "tab": "website_studio",
          "description": "Headmaster-only review of submitted admission applications and final admission confirmation. Website Design and Campaign Setup are Clerk-owned workspaces.",
          "features": [
            {
              "id": "application-review-queue",
              "label": "Admission Applications"
            },
            {
              "id": "final-admission-verification",
              "label": "Admission Confirmation"
            },
            {
              "id": "campaign-publish-close",
              "label": "Publish / Close Admission Campaign"
            }
          ]
        }
      ]
    },
    {
      "id": "students-staff",
      "label": "Student Directory",
      "modules": [
        {
          "id": "hm-student-master",
          "label": "Student Master",
          "tab": "master_data",
          "description": "Six dedicated Student Directory pages use one permanent Student Master record.",
          "features": [
            {
              "id": "student-profile-master",
              "label": "Student profile master"
            },
            {
              "id": "guardian-linkage",
              "label": "Parent and guardian linkage"
            },
            {
              "id": "class-division-placement",
              "label": "Class and division placement"
            },
            {
              "id": "student-status-history",
              "label": "Student status and history"
            },
            {
              "id": "student-document-index",
              "label": "Student document index"
            },
            {
              "id": "student-recognition-rankings",
              "label": "Student Recognition Top 5 / Top 10"
            }
          ]
        },
        {
          "id": "hm-student-lifecycle",
          "label": "Student Lifecycle",
          "tab": "master_data",
          "features": [
            {
              "id": "student-lifecycle-requests",
              "label": "Clerk lifecycle requests"
            },
            {
              "id": "execute-promotion",
              "label": "Execute approved promotion → Promotion Engine",
              "targetTab": "analytics",
              "shortcut": true,
              "ownerModuleId": "hm-result-analytics-promotions",
              "ownerFeatureId": "promotion-engine"
            },
            {
              "id": "student-transfer",
              "label": "Transfer student"
            },
            {
              "id": "student-passout",
              "label": "Pass-out processing"
            },
            {
              "id": "student-leaving-status",
              "label": "Leaving status processing"
            },
            {
              "id": "student-archive",
              "label": "Archive inactive student"
            }
          ],
          "description": "Executes final lifecycle status after the academic decision is approved."
        },
        {
          "id": "hm-student-service-requests",
          "label": "Student Service Requests",
          "tab": "master_data",
          "features": [
            { "id": "student-service-request-queue", "label": "Pending Student requests" },
            { "id": "student-service-request-history", "label": "Request decision history" }
          ],
          "description": "Final Headmaster decision queue for Student Portal certificate, library, profile-correction and support requests."
        },
        {
          "id": "hm-parent-accounts",
          "label": "Parent Accounts & Child Links",
          "tab": "master_data",
          "features": [
            { "id": "parent-account-approval-queue", "label": "Parent signup approvals" },
            { "id": "parent-child-link-approvals", "label": "Additional child-link approvals" },
            { "id": "parent-account-decision-history", "label": "Parent account decision history" }
          ],
          "description": "Headmaster-only verification and final approval for Parent Portal accounts and school-scoped Parent-child links."
        }
      ]
    },
    {
      "id": "staff-management",
      "label": "Staff Management",
      "modules": [
        {
          "id": "hm-staff-master",
          "label": "Staff Master",
          "tab": "staff_master",
          "features": [
            {
              "id": "staff-profile",
              "label": "Staff profile"
            },
            {
              "id": "staff-qualification",
              "label": "Qualifications and credentials"
            },
            {
              "id": "staff-service-details",
              "label": "Service details"
            },
            {
              "id": "staff-employment-status",
              "label": "Employment status"
            },
            {
              "id": "staff-documents",
              "label": "Documents & identity readiness"
            }
          ]
        },
        {
          "id": "hm-staff-accounts",
          "label": "Staff Accounts & Access",
          "tab": "accounts",
          "description": "Headmaster-only staff login lifecycle. Staff Master records remain separate and are never deleted with a login account.",
          "features": [
            {
              "id": "staff-account-create",
              "label": "Create new staff login"
            },
            {
              "id": "staff-account-pending",
              "label": "Review pending staff accounts"
            },
            {
              "id": "link-staff-login",
              "label": "Link existing staff login"
            },
            {
              "id": "staff-account-edit",
              "label": "Edit staff account details"
            },
            {
              "id": "activate-deactivate-staff-login",
              "label": "Activate or deactivate login"
            },
            {
              "id": "staff-password-support",
              "label": "Controlled password reset"
            },
            {
              "id": "staff-login-delete",
              "label": "Delete login account only"
            },
            {
              "id": "staff-role-access",
              "label": "Role & access assignment"
            },
            {
              "id": "staff-account-repair",
              "label": "Repair / reconnect account"
            },
            {
              "id": "staff-effective-access",
              "label": "Effective access summary"
            }
          ]
        },

      ]
    },
    {
      "id": "academics",
      "label": "Academics",
      "modules": [
        {
          "id": "hm-academic-setup",
          "label": "Academic Year & Class Setup",
          "tab": "academic_setup",
          "navigationOnly": true,
          "features": [
            {
              "id": "school-profile",
              "label": "School Profile"
            },
            {
              "id": "academic-years",
              "label": "Academic years"
            },
            {
              "id": "classes-divisions",
              "label": "Classes and divisions"
            },
            {
              "id": "school-timings",
              "label": "School timings"
            },
            {
              "id": "academic-term-calendar",
              "label": "Academic term calendar"
            },
            {
              "id": "close-academic-year",
              "label": "Close academic year"
            },
            {
              "id": "erp-defaults",
              "label": "ERP defaults & operational settings"
            }
          ]
        },
        {
          "id": "hm-subjects-curriculum",
          "label": "Subjects & Curriculum",
          "tab": "master_data",
          "navigationOnly": true,
          "features": [
            {
              "id": "subject-master",
              "label": "Subject master"
            },
            {
              "id": "subject-class-mapping",
              "label": "Curriculum Mapping — Class ↔ Subject",
              "targetTab": "academic_setup"
            },
            {
              "id": "subject-groups",
              "label": "Subject groups and electives",
              "targetTab": "academic_setup"
            },
            {
              "id": "medium-language-settings",
              "label": "Medium and academic languages",
              "targetTab": "academic_setup"
            },
            {
              "id": "grading-passing-rules",
              "label": "Grading and passing rules",
              "targetTab": "academic_setup"
            }
          ]
        },
        {
          "id": "hm-duty-assignments",
          "label": "Teacher & Academic Assignments",
          "tab": "master_data",
          "navigationOnly": true,
          "description": "Canonical current-year Teacher assignments. These records drive Teacher access, Result ownership and academic data scope. Timetable workload inputs remain scheduling configuration and do not replace or mutate these permission assignments.",
          "features": [
            {
              "id": "class-teacher-duty",
              "label": "Class Teacher Assignment — Teacher ↔ Class/Division"
            },
            {
              "id": "subject-teacher-assignment",
              "label": "Teaching Assignment — Teacher ↔ Class/Division ↔ Subject"
            },
            {
              "id": "assignment-validity",
              "label": "Academic-year assignment validity"
            }
          ]
        },
        {
          "id": "hm-smart-timetable",
          "label": "Smart AI Timetable",
          "tab": "timetable_v2",
          "features": [
            {
              "id": "teacher-workload",
              "label": "Teacher workload"
            },
            {
              "id": "timetable-generation",
              "label": "Whole-school timetable generation"
            },
            {
              "id": "timetable-conflicts",
              "label": "Conflict resolution"
            },
            {
              "id": "substitute-management",
              "label": "Substitute management"
            },
            {
              "id": "publish-lock-timetable",
              "label": "Publish and lock timetable"
            }
          ]
        },
        {
          "id": "hm-bell-timing",
          "label": "Bell Timing & Alarm",
          "tab": "timetable_v2",
          "description": "Headmaster-controlled school bell source for Peon Android alarm devices.",
          "features": [
            {"id":"bell-source","label":"Timetable / Manual bell source"},
            {"id":"manual-bell-schedule","label":"Manual bell schedule"},
            {"id":"bell-publish","label":"Publish bell timing to Peon devices"}
          ]
        }      ]
    },
    {
      "id": "headmaster-teaching-duty",
      "label": "My Teaching Work",
      "modules": [
        {
          "id": "tr-dashboard",
          "label": "My Teaching Dashboard",
          "tab": "overview",
          "description": "Subject Teacher dashboard for the Headmaster's own assigned teaching scope; administrative Dashboard remains separate.",
          "features": []
        },
        {
          "id": "tr-my-assignments",
          "label": "My Teaching Assignment",
          "tab": "overview",
          "description": "Headmaster's own current-year Subject Teacher assignment. Administrative authority remains unchanged.",
          "features": []
        },
        {
          "id": "tr-study-material",
          "label": "Study Material",
          "tab": "overview",
          "description": "Headmaster-owned teaching material only for subjects personally assigned to the Headmaster.",
          "features": []
        },
        {
          "id": "tr-ai-year-plan",
          "label": "AI Year Plan",
          "tab": "overview",
          "description": "Year planning for the Headmaster's own assigned teaching subjects.",
          "features": []
        },
        {
          "id": "tr-ai-daily-plan",
          "label": "AI Daily Teaching Plan",
          "tab": "overview",
          "description": "Daily teaching plan for the Headmaster's own assigned periods.",
          "features": []
        },
        {
          "id": "tr-ai-lesson-plan",
          "label": "AI Lesson Plan",
          "tab": "overview",
          "description": "Lesson plans scoped only to the Headmaster's own Subject Teacher assignments.",
          "features": []
        },
        {
          "id": "tr-ai-homework",
          "label": "AI Homework",
          "tab": "overview",
          "description": "Generate, edit, save and publish Homework for the Headmaster's own assigned class/subject scope.",
          "features": []
        },
        {
          "id": "tr-ai-teaching-diary",
          "label": "AI Teaching Diary",
          "tab": "overview",
          "description": "Actual teaching diary for the Headmaster's own periods.",
          "features": []
        },
        {
          "id": "tr-ai-classwork",
          "label": "AI Classwork & Assignments",
          "tab": "overview",
          "description": "Classwork and assignments for personally assigned subjects only.",
          "features": []
        },
        {
          "id": "tr-question-paper-first-term",
          "label": "Question Paper — First Term",
          "tab": "overview",
          "description": "First Unit Test / First Term paper for the Headmaster's own assigned subject.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-first-unit-test", "label": "First Unit Test" },
            { "id": "tr-question-first-term-examination", "label": "First Term Examination" }
          ]
        },
        {
          "id": "tr-question-paper-second-term",
          "label": "Question Paper — Second Term",
          "tab": "overview",
          "description": "Second Unit Test / Second Term paper for the Headmaster's own assigned subject.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-second-unit-test", "label": "Second Unit Test" },
            { "id": "tr-question-second-term-examination", "label": "Second Term Examination" }
          ]
        },
        {
          "id": "tr-result-subject-marks",
          "label": "My Subject Marks List",
          "tab": "result_management",
          "description": "Subject Teacher mark entry, draft, correction and submission flow only for the Headmaster's own assigned teaching subjects.",
          "features": []
        },
        {
          "id": "tr-my-students-list",
          "label": "My Subject Students",
          "tab": "overview",
          "description": "Student roster only from the Headmaster's own assigned Class / Division / Subject teaching scopes.",
          "features": []
        },
        {
          "id": "tr-my-students-performance",
          "label": "My Students Performance",
          "tab": "overview",
          "description": "Subject evidence and recognition for students inside the Headmaster's own assigned teaching scope.",
          "features": []
        },
        {
          "id": "tr-school-notices",
          "label": "Teaching Notices",
          "tab": "communication",
          "description": "Teacher-visible school notices available while working in the Headmaster's teaching identity.",
          "features": []
        },
        {
          "id": "tr-class-subject-announcements",
          "label": "Class / Subject Announcements",
          "tab": "communication",
          "description": "Send announcements only to students/parents within the Headmaster's own assigned subject scope.",
          "features": []
        },
        {
          "id": "tr-homework-notifications",
          "label": "Homework Notifications",
          "tab": "communication",
          "description": "Send notifications from already-published Homework within the Headmaster's own assigned subject scope.",
          "features": []
        },
        {
          "id": "tr-parent-student-communication",
          "label": "Parent / Student Communication",
          "tab": "communication",
          "description": "Controlled communication only with students/parents in the Headmaster's own assigned teaching scope.",
          "features": []
        },
        {
          "id": "tr-my-timetable",
          "label": "My Teaching Timetable",
          "tab": "overview",
          "description": "Read-only published periods assigned personally to the Headmaster.",
          "features": []
        },
        {
          "id": "tr-my-workload",
          "label": "My Teaching Workload",
          "tab": "overview",
          "description": "Automatic workload summary from the Headmaster's own published timetable.",
          "features": []
        },
        {
          "id": "tr-substitute-duties",
          "label": "My Substitute / Adjustment Duties",
          "tab": "overview",
          "description": "Approved substitute periods personally assigned to the Headmaster.",
          "features": []
        }
      ]
    },
    {
      "id": "attendance-leave",
      "label": "Attendance & Leave",
      "modules": [
        {
          "id": "hm-student-attendance",
          "label": "Student Attendance & Registers",
          "tab": "attendance",
          "description": "Canonical student-attendance workspace for daily roll-call, subject attendance, monthly registers and attendance reports. Leave approvals are owned only by Leave Management.",
          "features": [
            {
              "id": "attendance-dashboard",
              "label": "Attendance dashboard"
            },
            {
              "id": "daily-roll-call",
              "label": "Daily roll-call desk"
            },
            {
              "id": "subject-attendance",
              "label": "Subject-wise attendance"
            },
            {
              "id": "monthly-attendance-register",
              "label": "Monthly attendance register"
            },
            {
              "id": "attendance-reports",
              "label": "Attendance reports and analytics"
            },
            {
              "id": "attendance-corrections",
              "label": "Attendance correction approvals"
            }
          ]
        },
        {
          "id": "hm-leave-management",
          "label": "Leave Management",
          "tab": "leave_management",
          "features": [
            {
              "id": "student-leave-review",
              "label": "Student leave review"
            },
            {
              "id": "staff-leave-review",
              "label": "Staff leave review"
            },
            {
              "id": "leave-escalations",
              "label": "Leave escalation cases"
            },
            {
              "id": "leave-history",
              "label": "Leave history"
            },
            {
              "id": "leave-policy-reports",
              "label": "Leave policy & rules"
            },
            {
              "id": "headmaster-my-leave-application",
              "label": "My Leave Application — Chairman Print"
            }
          ],
          "description": "Canonical leave-approval workspace. Student and staff review, escalations, history and policy open as focused leave pages and never fall back to Attendance."
        }
      ]
    },
    {
      "id": "exams-results",
      "label": "Examination & Result",
      "modules": [
        {
          "id": "hm-exam-control",
          "label": "Exams & Question Papers",
          "tab": "exams",
          "description": "Exam configuration stays with Academic Setup; this workspace reviews the same cloud Question Papers saved by Teachers.",
          "features": [
            {
              "id": "exam-term-setup",
              "label": "Exam Terms → Academic Setup",
              "targetTab": "academic_setup",
              "shortcut": true,
              "ownerModuleId": "hm-academic-setup",
              "ownerFeatureId": "academic-term-calendar"
            },
            {
              "id": "exam-grading-rules",
              "label": "Grading & Passing Rules → Subjects & Curriculum",
              "targetTab": "academic_setup",
              "shortcut": true,
              "ownerModuleId": "hm-subjects-curriculum",
              "ownerFeatureId": "grading-passing-rules"
            },
            {
              "id": "exam-schedule-control",
              "label": "Official Exam Schedule"
            },
            {
              "id": "question-paper-review",
              "label": "Question Paper Review & Finalization"
            }
          ]
        },
        {
          "id": "hm-result-management",
          "label": "Result Management",
          "tab": "result_management",
          "description": "The complete working result workspace for Headmaster review, monitoring, curriculum Result Pack approval and result workflow oversight.",
          "features": [
            {
              "id": "result-overview",
              "label": "Result management overview"
            },
            {
              "id": "result-curriculum-approvals",
              "label": "Curriculum Result Pack Approvals"
            },
            {
              "id": "result-publication-lock",
              "label": "Result Publication & Final Lock"
            },
            {
              "id": "completed-result-records",
              "label": "Completed result records"
            },
            {
              "id": "draft-result-records",
              "label": "Draft result records"
            },
            {
              "id": "pending-result-work",
              "label": "Pending result work"
            },
            {
              "id": "returned-result-corrections",
              "label": "Returned correction cases"
            },
            {
              "id": "result-workflow-progress",
              "label": "Overall result workflow progress"
            },
            {
              "id": "pending-marks-entry",
              "label": "Marks Monitoring · Pending marks entry"
            },
            {
              "id": "missing-marks-cases",
              "label": "Marks Monitoring · Missing marks cases"
            },
            {
              "id": "returned-mark-lists",
              "label": "Marks Monitoring · Returned mark lists"
            },
            {
              "id": "teacher-entry-progress",
              "label": "Marks Monitoring · Teacher entry progress"
            },
            {
              "id": "marks-correction-status",
              "label": "Marks Monitoring · Correction status"
            },
            {
              "id": "class-result-verification",
              "label": "Result Compilation · Class verification"
            },
            {
              "id": "result-book-compilation",
              "label": "Result Compilation · Result books"
            },
            {
              "id": "master-result-book",
              "label": "Result Compilation · Master book index"
            },
            {
              "id": "progress-card-generation",
              "label": "Result Compilation · Progress card batches"
            },
            {
              "id": "result-anomaly-checks",
              "label": "Result Compilation · Validation & anomalies"
            },
            {
              "id": "result-compilation-history",
              "label": "Result Compilation · History"
            }
          ]
        }
      ]
    },
    {
      "id": "result-analytics-promotions-main",
      "label": "Result Analytics & Promotions",
      "standalone": true,
      "modules": [
        {
          "id": "hm-result-analytics-promotions",
          "label": "Result Analytics & Promotions",
          "tab": "analytics",
          "description": "Whole-school result analysis, merit review, student performance, promotion decisions, academic history and reports. Certificate issuance remains in Certificates & Documents.",
          "features": [
            {
              "id": "result-analytics-overview",
              "label": "Analytics Overview"
            },
            {
              "id": "class-result-analysis",
              "label": "Class Analysis"
            },
            {
              "id": "subject-result-analysis",
              "label": "Subject Analysis"
            },
            {
              "id": "teacher-result-analysis",
              "label": "Teacher Analysis"
            },
            {
              "id": "toppers-merit-analysis",
              "label": "Toppers & Merit"
            },
            {
              "id": "student-performance-analysis",
              "label": "Student Performance"
            },
            {
              "id": "promotion-engine",
              "label": "Promotion Engine"
            },
            {
              "id": "academic-history",
              "label": "Academic History"
            },
            {
              "id": "result-certificates",
              "label": "Certificates → Certificates & Documents",
              "targetTab": "gov_registers",
              "shortcut": true,
              "ownerModuleId": "hm-certificates",
              "ownerFeatureId": "multilingual-document-print"
            },
            {
              "id": "result-reports",
              "label": "Reports"
            }
          ]
        }
      ]
    },
    {
      "id": "smart-fees-desk-main",
      "label": "Smart Fees Desk",
      "standalone": true,
      "modules": [
        {
          "id": "hm-smart-fees-desk",
          "label": "Smart Fees Desk",
          "tab": "fees",
          "description": "Whole-school fee configuration, collection, concessions, receipts and analytical reporting in one canonical workspace.",
          "features": [
            {
              "id": "fees-dashboard",
              "label": "Dashboard"
            },
            {
              "id": "fees-collection-desk",
              "label": "Collection Desk"
            },
            {
              "id": "fees-master-config",
              "label": "Fee Master Config"
            },
            {
              "id": "fees-concessions",
              "label": "Concessions"
            },
            {
              "id": "fees-receipt-ledger",
              "label": "Receipt Ledger"
            },
            {
              "id": "fees-reports-desk",
              "label": "Reports Desk"
            }
          ]
        }
      ]
    },
    {
      "id": "accounting-finance-main",
      "label": "Accounting & Finance",
      "standalone": true,
      "modules": [
        {
          "id": "hm-accounting",
          "label": "Accounting & Finance",
          "tab": "accounting",
          "description": "Whole-school financial overview, vouchers, chart of accounts, ledgers, cash and bank registers, reconciliation, statements, year closing and audit trail.",
          "features": [
            {
              "id": "accounting-overview",
              "label": "Financial Overview"
            },
            {
              "id": "voucher-review",
              "label": "Vouchers Journal"
            },
            {
              "id": "chart-of-accounts",
              "label": "Chart of Accounts"
            },
            {
              "id": "account-ledger-books",
              "label": "Account Ledger Books"
            },
            {
              "id": "cash-bank-registers",
              "label": "Cash / Bank Registers"
            },
            {
              "id": "bank-reconciliation-review",
              "label": "Bank Reconciliation"
            },
            {
              "id": "financial-statements",
              "label": "Financial Statements"
            },
            {
              "id": "finance-year-close",
              "label": "Financial Year Close"
            },
            {
              "id": "audit-safety-logs",
              "label": "Audit & Safety Logs"
            }
          ]
        }
      ]
    },
    {
      "id": "payroll-hr-main",
      "label": "Payroll & HRMS",
      "standalone": true,
      "modules": [
        {
          "id": "hm-payroll",
          "label": "Payroll & HRMS",
          "tab": "payroll",
          "description": "Salary processing, structure configuration, digital service books, increments, loans, certificates and statutory payroll reports.",
          "features": [
            {
              "id": "payroll-processing",
              "label": "Payroll Processing"
            },
            {
              "id": "salary-structure-setup",
              "label": "Salary Structure Setup"
            },
            {
              "id": "digital-service-book",
              "label": "Digital Service Book"
            },
            {
              "id": "increment-desk",
              "label": "Increment Desk"
            },
            {
              "id": "loans-advances",
              "label": "Loans & Advances"
            },
            {
              "id": "payroll-certificates",
              "label": "Certificates Desk"
            },
            {
              "id": "payroll-reports",
              "label": "Payroll Reports"
            }
          ]
        }
      ]
    },
    {
      "id": "resources-communication",
      "label": "Resources & Communication",
      "modules": [
        {
          "id": "hm-library",
          "label": "Digital Library",
          "tab": "library",
          "features": [
            {
              "id": "library-catalogue-oversight",
              "label": "Library catalogue oversight"
            },
            {
              "id": "library-circulation",
              "label": "Issue and return monitoring"
            },
            {
              "id": "library-stock-verification",
              "label": "Library stock verification"
            },
            {
              "id": "library-purchases",
              "label": "Library purchase review"
            },
            {
              "id": "library-reports",
              "label": "Library reports"
            }
          ]
        },
        {
          "id": "hm-inventory",
          "label": "Inventory & Assets",
          "tab": "inventory",
          "features": [
            {
              "id": "asset-inventory-overview",
              "label": "Asset and inventory overview"
            },
            {
              "id": "procurement-review",
              "label": "Procurement review"
            },
            {
              "id": "asset-maintenance",
              "label": "Asset maintenance monitoring"
            },
            {
              "id": "stock-audit",
              "label": "Stock audit"
            },
            {
              "id": "writeoff-disposal-approval",
              "label": "Write-off and disposal approval"
            }
          ]
        },
        {
          "id": "hm-communication",
          "label": "Communication Hub",
          "tab": "communication",
          "features": [
            {
              "id": "school-notices",
              "label": "School notices"
            },
            {
              "id": "audience-messages",
              "label": "Audience-targeted messages"
            },
            {
              "id": "scheduled-communications",
              "label": "Scheduled communications"
            },
            {
              "id": "communication-templates",
              "label": "Communication templates"
            },
            {
              "id": "delivery-history",
              "label": "Delivery and read history"
            }
          ]
        },
        {
          "id": "hm-certificates",
          "label": "Certificates & Documents",
          "tab": "gov_registers",
          "features": [
            {
              "id": "certificate-approval",
              "label": "Certificate approval"
            },
            {
              "id": "leaving-certificate-issue",
              "label": "Leaving Certificate issue"
            },
            {
              "id": "official-document-vault",
              "label": "Official document vault"
            },
            {
              "id": "document-issue-history",
              "label": "Document issue history"
            },
            {
              "id": "multilingual-document-print",
              "label": "Multilingual document printing"
            }
          ]
        }
      ]
    },
    {
      "id": "system-administration-main",
      "label": "System & Administration",
      "standalone": true,
      "modules": [
        {
          "id": "hm-system-admin",
          "label": "System & Administration",
          "tab": "erp_admin",
          "navigationOnly": true,
          "description": "Security administration and safe data tools. Canonical School Profile, ERP defaults and Promotions remain in their owner modules.",
          "features": [
            {
              "id": "system-school-profile",
              "label": "School Profile → Academic Setup",
              "targetTab": "academic_setup",
              "shortcut": true,
              "ownerModuleId": "hm-academic-setup",
              "ownerFeatureId": "school-profile"
            },
            {
              "id": "system-settings",
              "label": "ERP Defaults → Academic Setup",
              "targetTab": "academic_setup",
              "shortcut": true,
              "ownerModuleId": "hm-academic-setup",
              "ownerFeatureId": "erp-defaults"
            },
            {
              "id": "system-users-permissions",
              "label": "Users & Permissions"
            },
            {
              "id": "system-backup-restore",
              "label": "Backup & Restore"
            },
            {
              "id": "system-bulk-import-export",
              "label": "Bulk Import / CSV"
            },
            {
              "id": "system-academic-promotions",
              "label": "Academic Promotions → Promotion Engine",
              "targetTab": "analytics",
              "shortcut": true,
              "ownerModuleId": "hm-result-analytics-promotions",
              "ownerFeatureId": "promotion-engine"
            },
            {
              "id": "system-duplicate-detection",
              "label": "Duplicate Detection"
            },
            {
              "id": "system-diagnostics",
              "label": "System Diagnostics"
            },
            {
              "id": "system-audit-trail",
              "label": "Audit Trail Logs"
            }
          ]
        }
      ]
    },
    {
      "id": "administration",
      "label": "Campus & Compliance",
      "modules": [
        {
          "id": "hm-campus-security",
          "label": "Campus Security & Gate Pass",
          "tab": "gatekeeper_security",
          "features": [
            {
              "id": "visitor-security",
              "label": "Visitor security"
            },
            {
              "id": "student-gate-passes",
              "label": "Student gate passes"
            },
            {
              "id": "staff-gate-passes",
              "label": "Staff gate passes"
            },
            {
              "id": "vehicle-register",
              "label": "Vehicle register"
            },
            {
              "id": "security-alerts",
              "label": "Security alerts"
            }
          ]
        },
        {
          "id": "hm-statutory-registers",
          "label": "Statutory Registers",
          "tab": "gov_registers",
          "features": [
            {
              "id": "operational-registers",
              "label": "Operational statutory registers"
            },
            {
              "id": "register-certification",
              "label": "Register certification"
            },
            {
              "id": "register-locking",
              "label": "Register period locking"
            },
            {
              "id": "inspection-exports",
              "label": "Inspection-ready exports"
            },
            {
              "id": "register-history",
              "label": "Register history"
            }
          ]
        },
        {
          "id": "hm-audit-compliance",
          "label": "Audit & Compliance",
          "tab": "erp_admin",
          "features": [
            {
              "id": "sensitive-action-audit",
              "label": "Sensitive-action audit"
            },
            {
              "id": "permission-change-audit",
              "label": "Permission-change audit"
            },
            {
              "id": "policy-exception-review",
              "label": "Policy exception review"
            },
            {
              "id": "compliance-evidence-pack",
              "label": "Compliance evidence pack"
            },
            {
              "id": "audit-retention-review",
              "label": "Audit retention review"
            }
          ]
        }
      ]
    },
    {
      "id": "headmaster-profile-main",
      "label": "My Complete Profile",
      "standalone": true,
      "modules": [
        {
          "id": "hm-complete-profile",
          "label": "My Complete Profile",
          "tab": "security",
          "description": "Complete permitted personal, contact and professional profile details. Login identity, role and assignments remain protected.",
          "features": []
        }
      ]
    },
    {
      "id": "security-password-main",
      "label": "Security & Password",
      "standalone": true,
      "modules": [
        {
          "id": "hm-security-password",
          "label": "Security & Password",
          "tab": "security",
          "description": "Headmaster account security and permanent Supabase Auth password update.",
          "features": [
            {
              "id": "security-change-password",
              "label": "Change Password"
            }
          ]
        }
      ]
    }
  ],
  "clerk": [
    {
      "id": "clerk-dashboard-main",
      "label": "Clerk Dashboard",
      "standalone": true,
      "modules": [
        {
          "id": "cl-office-dashboard",
          "label": "Clerk Dashboard",
          "tab": "overview",
          "description": "Cloud-backed office summary, pending admission handoffs and shortcuts to canonical Clerk owner modules.",
          "features": [
            { "id": "office-daily-summary", "label": "Office daily summary" },
            { "id": "pending-office-work", "label": "Pending office work" },
            { "id": "office-alerts", "label": "Office alerts" },
            { "id": "office-quick-links", "label": "Quick links to owner modules" }
          ]
        }
      ]
    },
    {
      "id": "clerk-website-main",
      "label": "Website Management",
      "standalone": true,
      "modules": [
        {
          "id": "cl-website-content",
          "label": "Website Design & Content",
          "tab": "website_studio",
          "description": "Clerk-owned public website workspace for page design, content, media, contact details and private preview.",
          "features": [
            { "id": "cl-website-page-drafts", "label": "Page content drafts" },
            { "id": "cl-website-media-drafts", "label": "Media & gallery drafts" },
            { "id": "cl-website-contact-drafts", "label": "Contact content drafts" },
            { "id": "cl-website-preview", "label": "Private website preview" }
          ]
        }
      ]
    },
    {
      "id": "clerk-admissions-main",
      "label": "Admissions",
      "modules": [
        {
          "id": "cl-new-admission",
          "label": "New Student Admission",
          "tab": "admission_desk",
          "description": "Clerk prepares a controlled cloud admission intake. Student Master and login are never created here.",
          "features": [
            { "id": "cl-open-admission-form", "label": "Complete admission form" },
            { "id": "cl-student-parent-details", "label": "Student & parent details" },
            { "id": "cl-address-previous-school", "label": "Address & previous school" },
            { "id": "cl-medical-office-details", "label": "Medical & office details" },
            { "id": "cl-documents-final-review", "label": "Documents, review & save intake" }
          ]
        }
      ]
    },
    {
      "id": "clerk-admission-campaign-main",
      "label": "Admission Campaign",
      "standalone": true,
      "modules": [
        {
          "id": "cl-admission-campaigns",
          "label": "Admission Campaign Setup",
          "tab": "website_studio",
          "description": "Clerk-owned admission campaign workspace. Create, schedule and maintain campaigns here; Admission Applications and Admission Confirmation remain Headmaster-only.",
          "features": [
            { "id": "campaign-workspace", "label": "Campaign Setup" }
          ]
        }
      ]
    },
    {
      "id": "clerk-students-main",
      "label": "Student Records & Lifecycle",
      "modules": [
        {
          "id": "cl-student-master",
          "label": "Student Master",
          "tab": "master_data",
          "description": "School-scoped permanent Student Master. Clerk may maintain administrative profile, guardian and placement data without creating duplicate students.",
          "features": [
            { "id": "cl-student-profile", "label": "Student profile" },
            { "id": "cl-guardian-details", "label": "Parent / guardian details" },
            { "id": "cl-class-placement", "label": "Class / division placement" },
            { "id": "cl-student-document-index", "label": "Student document index" }
          ]
        },
        {
          "id": "cl-student-lifecycle",
          "label": "Student Lifecycle Support",
          "tab": "master_data",
          "description": "Clerk prepares audited lifecycle requests; final transfer/pass-out/leaving/archive action remains with the Headmaster. Promotion remains owned by the Result Promotion Engine.",
          "features": [
            { "id": "cl-lifecycle-promotion", "label": "Promotion processing request" },
            { "id": "cl-lifecycle-class-transfer", "label": "Class / division transfer request" },
            { "id": "cl-lifecycle-school-transfer", "label": "School transfer request" },
            { "id": "cl-lifecycle-passout", "label": "Pass-out processing request" },
            { "id": "cl-lifecycle-leaving", "label": "Leaving processing request" },
            { "id": "cl-lifecycle-archive", "label": "Inactive archive request" },
            { "id": "cl-lifecycle-history", "label": "Lifecycle request & status history" }
          ]
        }
      ]
    },
    {
      "id": "clerk-certificates-main",
      "label": "Certificates & Documents",
      "standalone": true,
      "modules": [
        {
          "id": "cl-certificates-documents",
          "label": "Certificate Studio & Management",
          "tab": "gov_registers",
          "description": "One canonical certificate workspace for design, generation, verification, distribution and document history. Clerk prepares; Headmaster remains the final official authority.",
          "features": [
            { "id": "cl-certificate-studio", "label": "Certificate Studio & Templates" },
            { "id": "cl-certificate-bulk-generation", "label": "Bulk Certificate Generation" },
            { "id": "cl-certificate-verification", "label": "QR & Certificate Verification" },
            { "id": "cl-certificate-distribution", "label": "Distribution & Reissue" },
            { "id": "cl-certificate-register", "label": "Certificate Register & History" },
            { "id": "cl-document-vault", "label": "Document Vault" }
          ]
        }
      ]
    },
    {
      "id": "clerk-registers-main",
      "label": "Statutory Registers",
      "standalone": true,
      "modules": [
        {
          "id": "cl-statutory-registers-focused",
          "label": "Statutory Registers",
          "tab": "gov_registers",
          "description": "Canonical office registers generated from their owner modules; no duplicate operational data entry.",
          "features": [
            { "id": "cl-register-admission", "label": "Admission Register" },
            { "id": "cl-register-general", "label": "General Register (GR)" },
            { "id": "cl-register-leaving", "label": "Leaving Register" },
            { "id": "cl-register-bonafide", "label": "Bonafide Register" },
            { "id": "cl-register-scholarship", "label": "Scholarship Register" },
            { "id": "cl-register-concession", "label": "Concession Register" },
            { "id": "cl-register-examination", "label": "Examination Register" },
            { "id": "cl-register-result", "label": "Result Register" },
            { "id": "cl-register-staff", "label": "Staff Register / Service Book" },
            { "id": "cl-register-inspection", "label": "Inspection Register" },
            { "id": "cl-register-visitor", "label": "Visitor Register" },
            { "id": "cl-register-inventory", "label": "Inventory Register" },
            { "id": "cl-register-library", "label": "Library Register" },
            { "id": "cl-register-fees", "label": "Fees Register" },
            { "id": "cl-register-attendance", "label": "Attendance Register" }
          ]
        }
      ]
    },
    {
      "id": "clerk-attendance-main",
      "label": "Attendance Reports & Registers",
      "standalone": true,
      "modules": [
        {
          "id": "cl-student-attendance-registers",
          "label": "Attendance Reports & Registers",
          "tab": "attendance",
          "description": "Clerk read/print access to school attendance. Daily marking remains Teacher/Class Teacher work.",
          "features": [
            { "id": "cl-attendance-overview", "label": "Attendance register overview" },
            { "id": "cl-daily-attendance-register", "label": "Daily attendance register" },
            { "id": "cl-monthly-attendance-register", "label": "Monthly Attendance Catalogue (3 Pages)" },
            { "id": "cl-attendance-correction-log", "label": "Attendance correction log" },
            { "id": "cl-attendance-certified-print", "label": "Certified Attendance Catalogue Print" }
          ]
        }
      ]
    },
    {
      "id": "clerk-leave-main",
      "label": "Leave Management",
      "standalone": true,
      "modules": [
        {
          "id": "cl-leave-management",
          "label": "Leave Management",
          "tab": "leave_management",
          "description": "Clerk self-service leave desk. The Clerk can apply for personal leave, track Headmaster approval, review personal leave history and see personal leave totals. Other students/teachers/staff leave records are not visible here.",
          "features": [
            { "id": "cl-apply-leave", "label": "Apply Leave" },
            { "id": "cl-my-leave-status", "label": "My Leave Status" },
            { "id": "cl-my-leave-history", "label": "My Leave History" },
            { "id": "cl-leave-summary", "label": "My Leave Summary" }
          ]
        }
      ]
    },
    {
      "id": "clerk-result-main",
      "label": "Result Printing",
      "standalone": true,
      "modules": [
        {
          "id": "cl-result-management",
          "label": "Result Printing & Master Result Book",
          "tab": "result_management",
          "description": "For a new/unconfigured school, onboard its existing Result system from role-labelled Excel/PDF/images with Headmaster approval. Once a Result System is active, onboarding import is hidden; Clerk continues with official Master Mark List, Master Result Book, Master Progress Card and Result Print workflows.",
          "features": [
            { "id": "cl-result-import-existing-system", "label": "Import Existing Result System" },
            { "id": "cl-result-mark-list-templates", "label": "Master Mark List Templates" },
            { "id": "cl-result-master-result-book", "label": "Master Result Book" },
            { "id": "cl-result-progress-card-templates", "label": "Master Progress Card Templates" },
            { "id": "cl-combined-question-papers", "label": "Combined Question Papers" },
            { "id": "cl-result-print-center", "label": "Result Print Center" }
          ]
        }
      ]
    },
    {
      "id": "clerk-fees-main",
      "label": "Fees",
      "standalone": true,
      "modules": [
        {
          "id": "cl-fees-management",
          "label": "Fees",
          "tab": "fees",
          "description": "Canonical Academic Year fee structure, collection, permanent receipts, Student ledger and reports. Concessions and receipt cancellations retain Headmaster approval authority.",
          "features": [
            { "id": "cl-fees-structure", "label": "Fee Structure" },
            { "id": "cl-fees-collection", "label": "Fee Collection" },
            { "id": "cl-fees-receipts", "label": "Receipts & Student Ledger" },
            { "id": "cl-fees-concessions", "label": "Concession / Scholarship Requests" },
            { "id": "cl-fees-reports", "label": "Fee Reports" }
          ]
        }
      ]
    },
    {
      "id": "clerk-content-main",
      "label": "Communication",
      "modules": [
        {
          "id": "cl-communication",
          "label": "Communication Drafts & Office Dispatch",
          "tab": "communication",
          "description": "Prepare notices/messages and maintain office communication history. Official school notice publishing remains Headmaster-controlled.",
          "features": [
            { "id": "cl-notice-drafts", "label": "Notice / circular drafts" },
            { "id": "cl-communication-templates", "label": "Message templates" },
            { "id": "cl-communication-history", "label": "Communication history" },
            { "id": "cl-office-dispatch", "label": "Office dispatch records" }
          ]
        }
      ]
    },
    {
      "id": "clerk-master-data-main",
      "label": "Delegated Master Data",
      "modules": [
        {
          "id": "cl-academic-setup-config",
          "label": "Academic & Office Setup",
          "tab": "academic_setup",
          "description": "Delegated administrative master maintenance. Class Teacher / Subject Teacher assignment and destructive academic actions remain Headmaster-only.",
          "features": [
            { "id": "cl-academic-year", "label": "Academic Year" },
            { "id": "cl-academic-school-info", "label": "School Info" },
            { "id": "cl-academic-classes-divisions", "label": "Classes & Divisions" },
            { "id": "cl-academic-subject-management", "label": "Subject Management" },
            { "id": "cl-academic-grading-system", "label": "Grading System" },
            { "id": "cl-academic-school-timing", "label": "School Timing" },
            { "id": "cl-academic-document-settings", "label": "Document Settings" },
            { "id": "cl-academic-print-settings", "label": "Print Settings" },
            { "id": "cl-academic-erp-settings", "label": "ERP Defaults" }
          ]
        },
        {
          "id": "cl-master-data-management",
          "label": "Office Master Lists",
          "tab": "master_data",
          "description": "Focused delegated office masters. Canonical Staff Master is maintained here; Student, Subject, Result and Certificate canonical owners are not duplicated.",
          "features": [
            { "id": "cl-master-staff-master", "label": "Staff Master" },
            { "id": "cl-master-location", "label": "Location Masters" },
            { "id": "cl-master-document", "label": "Document Checklists" }
          ]
        }
      ]
    },
    {
      "id": "clerk-profile-main",
      "label": "My Complete Profile",
      "standalone": true,
      "modules": [
        {
          "id": "cl-complete-profile",
          "label": "My Complete Profile",
          "tab": "security",
          "description": "Complete permitted personal, contact and professional profile details. Employee/login identity and role remain protected.",
          "features": []
        }
      ]
    },
    {
      "id": "cl-security-password-main",
      "label": "Security & Password",
      "standalone": true,
      "modules": [
        {
          "id": "cl-security-password",
          "label": "Security & Password",
          "tab": "security",
          "description": "Clerk account security and permanent Supabase Auth password update.",
          "features": [
            { "id": "cl-security-change-password", "label": "Change Password" }
          ]
        }
      ]
    }
  ],
  "teacher": [
    {
      "id": "teacher-dashboard-main",
      "label": "Teacher Dashboard",
      "standalone": true,
      "modules": [
        {
          "id": "tr-dashboard",
          "label": "Teacher Dashboard",
          "tab": "overview",
          "description": "Assigned duties, classes, subjects, timetable status, pending academic work and notices.",
          "features": []
        }
      ]
    },
    {
      "id": "teacher-assignment-main",
      "label": "My Academic Assignment",
      "standalone": true,
      "modules": [
        {
          "id": "tr-my-assignments",
          "label": "My Academic Assignment",
          "tab": "overview",
          "description": "Read-only Headmaster-assigned Class Teacher class/division and Subject Teacher allocations for the current academic year.",
          "features": []
        }
      ]
    },
    {
      "id": "teacher-academic-main",
      "label": "Teaching & Academic Work",
      "modules": [
        { "id": "tr-study-material", "label": "Study Material", "tab": "overview", "description": "Teacher-owned AI knowledge source: notes, PDF, images, worksheets, documents and links.", "features": [] },
        { "id": "tr-ai-year-plan", "label": "AI Year Plan", "tab": "overview", "description": "Annual and month-wise planning from selected Study Material.", "features": [] },
        { "id": "tr-ai-daily-plan", "label": "AI Daily Teaching Plan", "tab": "overview", "description": "Daily objectives, sequence, activities, examples and resources.", "features": [] },
        { "id": "tr-ai-lesson-plan", "label": "AI Lesson Plan", "tab": "overview", "description": "Planned / In Progress / Completed lesson plans linked to syllabus progress.", "features": [] },
        { "id": "tr-ai-homework", "label": "AI Homework", "tab": "overview", "description": "Source-scoped homework with preview, edit, save and publish flow.", "features": [] },
        { "id": "tr-ai-teaching-diary", "label": "AI Teaching Diary", "tab": "overview", "description": "Actual daily teaching record with lesson-plan reuse and completion status.", "features": [] },
        { "id": "tr-ai-classwork", "label": "AI Classwork & Assignments", "tab": "overview", "description": "Assignments, deadline, attachments and submission review.", "features": [] }
      ]
    },
    {
      "id": "teacher-result-main",
      "label": "Result Management",
      "modules": [
        { "id": "tr-result-subject-marks", "label": "Subject Marks List", "tab": "result_management", "description": "Term-wise blank mark sheet from Clerk Master mapping for Headmaster-assigned subjects only.", "features": [] }
      ]
    },
    {
      "id": "teacher-timetable-main",
      "label": "Timetable & Workload",
      "modules": [
        { "id": "tr-my-timetable", "label": "My Timetable", "tab": "overview", "description": "Read-only weekly timetable from the Headmaster Smart AI Timetable published feed.", "features": [] },
        { "id": "tr-my-workload", "label": "My Teaching Workload", "tab": "overview", "description": "Automatic class/subject and day-wise workload calculated from the Teacher's published timetable.", "features": [] },
        { "id": "tr-substitute-duties", "label": "Substitute / Adjustment Duties", "tab": "overview", "description": "Final approved auto/manual Substitute Management duties assigned by the Headmaster system.", "features": [] }
      ]
    },
    {
      "id": "teacher-my-students-main",
      "label": "My Students",
      "modules": [
        { "id": "tr-my-students-list", "label": "Class / Subject Student List", "tab": "overview", "description": "Only students from the logged-in Teacher's Headmaster-assigned Class / Division / Subject scopes.", "features": [] },
        { "id": "tr-my-students-performance", "label": "Performance Summary", "tab": "overview", "description": "Subject result evidence plus monthly/yearly Performance Stars used for transparent multi-teacher recognition rankings.", "features": [] },
      ]
    },
    {
      "id": "teacher-communication-main",
      "label": "Communication",
      "modules": [
        { "id": "tr-school-notices", "label": "School Notices", "tab": "communication", "description": "Read current school notices intended for Teachers.", "features": [] },
        { "id": "tr-class-subject-announcements", "label": "Class / Subject Announcements", "tab": "communication", "description": "Send announcements only to the logged-in Teacher's assigned Class / Division / Subject recipients through selected channels.", "features": [] },
        { "id": "tr-homework-notifications", "label": "Homework Notifications", "tab": "communication", "description": "Notify students/parents from already-published Homework without re-entering the same content.", "features": [] },
        { "id": "tr-parent-student-communication", "label": "Parent / Student Communication", "tab": "communication", "description": "Controlled direct communication with students/parents inside the Teacher's assigned teaching scope.", "features": [] }
      ]
    },
    {
      "id": "teacher-question-paper-main",
      "label": "Question Paper",
      "modules": [
        {
          "id": "tr-question-paper-first-term",
          "label": "First Term",
          "tab": "overview",
          "description": "Choose First Unit Test or First Term Examination.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-first-unit-test", "label": "First Unit Test" },
            { "id": "tr-question-first-term-examination", "label": "First Term Examination" }
          ]
        },
        {
          "id": "tr-question-paper-second-term",
          "label": "Second Term",
          "tab": "overview",
          "description": "Choose Second Unit Test or Second Term Examination.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-second-unit-test", "label": "Second Unit Test" },
            { "id": "tr-question-second-term-examination", "label": "Second Term Examination" }
          ]
        }
      ]
    },
    {
      "id": "teacher-leave-hr-main",
      "label": "Leave & Personal HR",
      "modules": [
        { "id": "tr-leave-apply", "label": "Apply Leave", "tab": "overview", "description": "Submit the logged-in Teacher's own leave application to the Headmaster. No other staff record is exposed.", "features": [] },
        { "id": "tr-leave-status", "label": "My Leave Status", "tab": "overview", "description": "Track only the logged-in Teacher's pending leave requests and final Headmaster decision.", "features": [] },
        { "id": "tr-leave-history", "label": "My Leave History", "tab": "overview", "description": "Permanent personal leave history reconstructed from the cloud audit workflow.", "features": [] },
        { "id": "tr-personal-hr-summary", "label": "My HR & Leave Summary", "tab": "overview", "description": "Personal Teacher identity, current academic assignment scope and personal leave summary only.", "features": [] }
      ]
    },
    {
      "id": "teacher-profile-main",
      "label": "My Complete Profile",
      "standalone": true,
      "modules": [
        {
          "id": "tr-complete-profile",
          "label": "My Complete Profile",
          "tab": "security",
          "description": "Complete permitted personal, contact and professional profile details. SHALARTH/login identity, role and Headmaster assignments remain protected.",
          "features": []
        }
      ]
    }
  ],
  "class_teacher": [
    {
      "id": "teacher-dashboard-main",
      "label": "Teacher Dashboard",
      "standalone": true,
      "modules": [
        {
          "id": "tr-dashboard",
          "label": "Teacher Dashboard",
          "tab": "overview",
          "description": "Assigned duties, classes, subjects, timetable status, pending academic work and notices.",
          "features": []
        }
      ]
    },
    {
      "id": "teacher-assignment-main",
      "label": "My Academic Assignment",
      "standalone": true,
      "modules": [
        {
          "id": "tr-my-assignments",
          "label": "My Academic Assignment",
          "tab": "overview",
          "description": "Read-only Headmaster-assigned Class Teacher class/division and Subject Teacher allocations for the current academic year.",
          "features": []
        }
      ]
    },
    {
      "id": "teacher-attendance-main",
      "label": "Attendance",
      "modules": [
        { "id": "tr-attendance-daily", "label": "Daily Attendance", "tab": "attendance", "description": "P/A marking only for the Headmaster-assigned Class Teacher Class / Division.", "features": [] },
        { "id": "tr-attendance-catalogue", "label": "Monthly Catalogue", "tab": "attendance", "description": "Three-page monthly attendance catalogue for the Headmaster-assigned Class Teacher Class / Division.", "features": [] },
        { "id": "tr-attendance-history", "label": "Attendance History", "tab": "attendance", "description": "Permanent Class Teacher attendance history; no silent overwrite.", "features": [] },
        { "id": "tr-attendance-correction", "label": "Attendance Correction Request", "tab": "attendance", "description": "Auditable correction request flow for historical Class Teacher attendance.", "features": [] },
        { "id": "tr-swiftchat-sync", "label": "SwiftChat Sync Status", "tab": "attendance", "description": "Auto-Sync Ready status for Maharashtra Smart Attendance; official API required.", "features": [] }
      ]
    },
    {
      "id": "teacher-academic-main",
      "label": "Teaching & Academic Work",
      "modules": [
        { "id": "tr-study-material", "label": "Study Material", "tab": "overview", "description": "Teacher-owned AI knowledge source: notes, PDF, images, worksheets, documents and links.", "features": [] },
        { "id": "tr-ai-year-plan", "label": "AI Year Plan", "tab": "overview", "description": "Annual and month-wise planning from selected Study Material.", "features": [] },
        { "id": "tr-ai-daily-plan", "label": "AI Daily Teaching Plan", "tab": "overview", "description": "Daily objectives, sequence, activities, examples and resources.", "features": [] },
        { "id": "tr-ai-lesson-plan", "label": "AI Lesson Plan", "tab": "overview", "description": "Planned / In Progress / Completed lesson plans linked to syllabus progress.", "features": [] },
        { "id": "tr-ai-homework", "label": "AI Homework", "tab": "overview", "description": "Source-scoped homework with preview, edit, save and publish flow.", "features": [] },
        { "id": "tr-ai-teaching-diary", "label": "AI Teaching Diary", "tab": "overview", "description": "Actual daily teaching record with lesson-plan reuse and completion status.", "features": [] },
        { "id": "tr-ai-classwork", "label": "AI Classwork & Assignments", "tab": "overview", "description": "Assignments, deadline, attachments and submission review.", "features": [] }
      ]
    },
    {
      "id": "teacher-result-main",
      "label": "Result Management",
      "modules": [
        { "id": "tr-result-subject-marks", "label": "Subject Marks List", "tab": "result_management", "description": "Term-wise Subject Teacher mark sheets from Clerk Master mapping.", "features": [] },
        { "id": "tr-result-class-mark-list", "label": "Class Mark List", "tab": "result_management", "description": "Class Teacher-only read-only review of submitted Subject Mark Lists.", "features": [] },
        { "id": "tr-result-book", "label": "Result Book", "tab": "result_management", "description": "Class Teacher-only consolidation of accepted Subject Mark Lists.", "features": [] },
        { "id": "tr-result-progress-card", "label": "Progress Card", "tab": "result_management", "description": "Class Teacher-only Progress Card review generated from the completed Result Book.", "features": [] }
      ]
    },
    {
      "id": "teacher-timetable-main",
      "label": "Timetable & Workload",
      "modules": [
        { "id": "tr-my-timetable", "label": "My Timetable", "tab": "overview", "description": "Read-only weekly timetable from the Headmaster Smart AI Timetable published feed.", "features": [] },
        { "id": "tr-class-timetable", "label": "Class Timetable", "tab": "overview", "description": "Class Teacher-only complete weekly timetable for the Headmaster-assigned Class / Division.", "features": [] },
        { "id": "tr-my-workload", "label": "My Teaching Workload", "tab": "overview", "description": "Automatic class/subject and day-wise workload calculated from the Teacher's published timetable.", "features": [] },
        { "id": "tr-substitute-duties", "label": "Substitute / Adjustment Duties", "tab": "overview", "description": "Final approved auto/manual Substitute Management duties assigned by the Headmaster system.", "features": [] }
      ]
    },
    {
      "id": "teacher-my-students-main",
      "label": "My Students",
      "modules": [
        { "id": "tr-my-students-list", "label": "Class / Subject Student List", "tab": "overview", "description": "Only students from the logged-in Teacher's Headmaster-assigned Class / Division / Subject scopes.", "features": [] },
        { "id": "tr-my-students-performance", "label": "Performance Summary", "tab": "overview", "description": "Subject result evidence plus monthly/yearly Performance Stars used for transparent multi-teacher recognition rankings.", "features": [] },
        { "id": "tr-student-signup-approvals", "label": "Student Signup Approvals", "tab": "overview", "description": "Class Teacher-only live queue for Student Portal signups belonging to the current canonical Class Teacher class/division. Approve or reject with audit trail.", "features": [] }
      ]
    },
    {
      "id": "teacher-communication-main",
      "label": "Communication",
      "modules": [
        { "id": "tr-school-notices", "label": "School Notices", "tab": "communication", "description": "Read current school notices intended for Teachers.", "features": [] },
        { "id": "tr-class-subject-announcements", "label": "Class / Subject Announcements", "tab": "communication", "description": "Send announcements only to the logged-in Teacher's assigned Class / Division / Subject recipients through selected channels.", "features": [] },
        { "id": "tr-homework-notifications", "label": "Homework Notifications", "tab": "communication", "description": "Notify students/parents from already-published Homework without re-entering the same content.", "features": [] },
        { "id": "tr-parent-student-communication", "label": "Parent / Student Communication", "tab": "communication", "description": "Controlled direct communication with students/parents inside the Teacher's assigned teaching scope.", "features": [] }
      ]
    },
    {
      "id": "teacher-question-paper-main",
      "label": "Question Paper",
      "modules": [
        {
          "id": "tr-question-paper-first-term",
          "label": "First Term",
          "tab": "overview",
          "description": "Choose First Unit Test or First Term Examination.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-first-unit-test", "label": "First Unit Test" },
            { "id": "tr-question-first-term-examination", "label": "First Term Examination" }
          ]
        },
        {
          "id": "tr-question-paper-second-term",
          "label": "Second Term",
          "tab": "overview",
          "description": "Choose Second Unit Test or Second Term Examination.",
          "navigationOnly": true,
          "features": [
            { "id": "tr-question-second-unit-test", "label": "Second Unit Test" },
            { "id": "tr-question-second-term-examination", "label": "Second Term Examination" }
          ]
        }
      ]
    },
    {
      "id": "teacher-leave-hr-main",
      "label": "Leave & Personal HR",
      "modules": [
        { "id": "tr-leave-apply", "label": "Apply Leave", "tab": "overview", "description": "Submit the logged-in Teacher's own leave application to the Headmaster. No other staff record is exposed.", "features": [] },
        { "id": "tr-leave-status", "label": "My Leave Status", "tab": "overview", "description": "Track only the logged-in Teacher's pending leave requests and final Headmaster decision.", "features": [] },
        { "id": "tr-leave-history", "label": "My Leave History", "tab": "overview", "description": "Permanent personal leave history reconstructed from the cloud audit workflow.", "features": [] },
        { "id": "tr-personal-hr-summary", "label": "My HR & Leave Summary", "tab": "overview", "description": "Personal Teacher identity, current academic assignment scope and personal leave summary only.", "features": [] }
      ]
    },
    {
      "id": "teacher-profile-main",
      "label": "My Complete Profile",
      "standalone": true,
      "modules": [
        {
          "id": "tr-complete-profile",
          "label": "My Complete Profile",
          "tab": "security",
          "description": "Complete permitted personal, contact and professional profile details. SHALARTH/login identity, role and Headmaster assignments remain protected.",
          "features": []
        }
      ]
    }
  ],
  "student": [
    {
      "id": "student-home",
      "label": "My School",
      "modules": [
        {
          "id": "st-home",
          "label": "My Home",
          "tab": "overview",
          "features": [
            {
              "id": "st-today-summary",
              "label": "Today's school summary"
            },
            {
              "id": "st-my-alerts",
              "label": "My alerts"
            },
            {
              "id": "st-quick-links",
              "label": "Quick links"
            }
          ]
        },
        {
          "id": "st-timetable",
          "label": "My Timetable",
          "tab": "timetable_v2",
          "features": [
            {
              "id": "st-today-timetable",
              "label": "Today's timetable"
            },
            {
              "id": "st-week-timetable",
              "label": "Weekly timetable"
            },
            {
              "id": "st-substitution-info",
              "label": "Substitution information"
            }
          ]
        },
        {
          "id": "st-attendance",
          "label": "My Attendance",
          "tab": "attendance",
          "features": [
            {
              "id": "st-attendance-summary",
              "label": "Attendance summary"
            },
            {
              "id": "st-monthly-attendance",
              "label": "Monthly attendance"
            },
            {
              "id": "st-attendance-history",
              "label": "Attendance history"
            }
          ]
        },
        {
          "id": "st-subjects",
          "label": "My Subjects & Teachers",
          "tab": "overview",
          "features": [
            { "id": "st-subject-list", "label": "My subject list" },
            { "id": "st-subject-teachers", "label": "Assigned subject teachers" },
            { "id": "st-weekly-periods", "label": "Weekly subject periods" }
          ],
          "description": "Current Headmaster subject-teacher assignments for this Student's exact class/division."
        },
        {
          "id": "st-calendar",
          "label": "Academic Calendar",
          "tab": "overview",
          "features": [
            { "id": "st-academic-term-calendar", "label": "Academic term calendar" },
            { "id": "st-school-holidays", "label": "School holidays" },
            { "id": "st-upcoming-school-days", "label": "Upcoming school dates" }
          ]
        }
      ]
    },
    {
      "id": "student-learning",
      "label": "Learning",
      "modules": [
        {
          "id": "st-homework",
          "label": "Homework",
          "tab": "communication",
          "features": [
            {
              "id": "st-current-homework",
              "label": "Current homework"
            },
            {
              "id": "st-homework-due-dates",
              "label": "Homework due dates"
            },
            {
              "id": "st-homework-history",
              "label": "Homework history"
            }
          ]
        },
        {
          "id": "st-study-material",
          "label": "Study Material",
          "tab": "communication",
          "features": [
            {
              "id": "st-subject-material",
              "label": "Subject study material"
            },
            {
              "id": "st-material-downloads",
              "label": "Authorized material downloads"
            },
            {
              "id": "st-material-history",
              "label": "Study material history"
            }
          ]
        },
        {
          "id": "st-exam-schedule",
          "label": "Examination Schedule",
          "tab": "result_management",
          "features": [
            {
              "id": "st-upcoming-exams",
              "label": "Upcoming examinations"
            },
            {
              "id": "st-exam-timetable",
              "label": "Examination timetable"
            },
            {
              "id": "st-exam-instructions",
              "label": "Examination instructions"
            }
          ]
        },
        {
          "id": "st-results",
          "label": "My Results",
          "tab": "result_management",
          "features": [
            {
              "id": "st-result-summary",
              "label": "Result summary"
            },
            {
              "id": "st-subject-marks",
              "label": "Subject marks"
            },
            {
              "id": "st-result-history",
              "label": "Result history"
            }
          ]
        },
        {
          "id": "st-progress-cards",
          "label": "Progress Cards",
          "tab": "result_management",
          "features": [
            {
              "id": "st-view-progress-card",
              "label": "View published progress card"
            },
            {
              "id": "st-download-progress-card",
              "label": "Download published progress card"
            },
            {
              "id": "st-progress-card-history",
              "label": "Progress card history"
            }
          ],
          "description": "Official document surface; marks summary remains in My Results."
        },
        {
          "id": "st-recognition",
          "label": "My Recognition",
          "tab": "result_management",
          "features": [
            { "id": "st-monthly-recognition", "label": "Monthly recognition" },
            { "id": "st-yearly-recognition", "label": "Yearly recognition" },
            { "id": "st-recognition-history", "label": "Recognition history" }
          ],
          "description": "Own Student recognition ratings from assigned Subject Teachers; Result marks remain in My Results."
        }
      ]
    },
    {
      "id": "student-services",
      "label": "Services",
      "modules": [
        {
          "id": "st-library",
          "label": "My Library",
          "tab": "library",
          "features": [
            {
              "id": "st-current-books",
              "label": "Current borrowed books"
            },
            {
              "id": "st-library-search",
              "label": "Library search"
            },
            {
              "id": "st-book-request",
              "label": "Book request"
            },
            {
              "id": "st-library-history",
              "label": "Library history"
            }
          ]
        },
        {
          "id": "st-documents",
          "label": "Certificates & Documents",
          "tab": "overview",
          "features": [
            {
              "id": "st-issued-documents",
              "label": "Issued school documents"
            },
            {
              "id": "st-document-download",
              "label": "Authorized document download"
            },
            {
              "id": "st-document-history",
              "label": "Document history"
            }
          ]
        },
        {
          "id": "st-notices",
          "label": "School Notices",
          "tab": "communication",
          "features": [
            {
              "id": "st-current-notices",
              "label": "Current notices"
            },
            {
              "id": "st-notice-categories",
              "label": "Notice categories"
            },
            {
              "id": "st-notice-history",
              "label": "Notice history"
            }
          ]
        },
        {
          "id": "st-request-center",
          "label": "Request Center",
          "tab": "communication",
          "features": [
            {
              "id": "st-leave-request",
              "label": "Leave application"
            },
            {
              "id": "st-certificate-request",
              "label": "Certificate request"
            },
            {
              "id": "st-library-request",
              "label": "Library request"
            },
            {
              "id": "st-profile-correction",
              "label": "Profile correction request"
            },
            {
              "id": "st-support-request",
              "label": "Support request"
            }
          ]
        },
        {
          "id": "st-fees",
          "label": "Fees & Receipts",
          "tab": "fees",
          "features": [
            {
              "id": "st-current-fee-dues",
              "label": "Current fee dues"
            },
            {
              "id": "st-payment-history",
              "label": "Payment history"
            },
            {
              "id": "st-fee-receipts",
              "label": "Fee receipts"
            }
          ]
        },
        {
          "id": "st-profile",
          "label": "My Profile & Security",
          "tab": "security",
          "features": [
            {
              "id": "st-complete-profile",
              "label": "Complete / Update My Profile"
            },
            {
              "id": "st-profile-view",
              "label": "My profile"
            },
            {
              "id": "st-permitted-profile-update",
              "label": "Permitted profile update"
            },
            {
              "id": "st-password-security",
              "label": "Password and login security"
            }
          ]
        }
      ]
    }
  ],
  "parent": [
    {
      "id": "parent-home",
      "label": "Family Overview",
      "modules": [
        {
          "id": "pa-home",
          "label": "Parent Home",
          "tab": "overview",
          "features": [
            {
              "id": "pa-child-summary",
              "label": "Linked child summary"
            },
            {
              "id": "pa-parent-alerts",
              "label": "Parent alerts"
            },
            {
              "id": "pa-pending-family-actions",
              "label": "Pending family actions"
            }
          ]
        },
        {
          "id": "pa-children",
          "label": "My Children",
          "tab": "overview",
          "features": [
            {
              "id": "pa-child-switcher",
              "label": "Verified child switcher"
            },
            {
              "id": "pa-child-profile",
              "label": "Linked child profile"
            },
            {
              "id": "pa-child-school-status",
              "label": "Child school status"
            }
          ]
        },
        {
          "id": "pa-attendance",
          "label": "Child Attendance",
          "tab": "attendance",
          "features": [
            {
              "id": "pa-child-attendance-summary",
              "label": "Child attendance summary"
            },
            {
              "id": "pa-child-monthly-attendance",
              "label": "Child monthly attendance"
            },
            {
              "id": "pa-low-attendance-alerts",
              "label": "Low-attendance alerts"
            }
          ]
        },
        {
          "id": "pa-timetable",
          "label": "Child Timetable",
          "tab": "timetable_v2",
          "features": [
            {
              "id": "pa-child-today-timetable",
              "label": "Child today's timetable"
            },
            {
              "id": "pa-child-week-timetable",
              "label": "Child weekly timetable"
            },
            {
              "id": "pa-child-substitution-info",
              "label": "Child substitution information"
            }
          ]
        }
      ]
    },
    {
      "id": "parent-academics",
      "label": "Academics",
      "modules": [
        {
          "id": "pa-homework-material",
          "label": "Homework & Study Material",
          "tab": "communication",
          "features": [
            {
              "id": "pa-child-homework",
              "label": "Child homework"
            },
            {
              "id": "pa-child-homework-due",
              "label": "Homework due dates"
            },
            {
              "id": "pa-child-study-material",
              "label": "Child study material"
            }
          ]
        },
        {
          "id": "pa-exam-schedule",
          "label": "Examination Schedule",
          "tab": "result_management",
          "features": [
            {
              "id": "pa-child-upcoming-exams",
              "label": "Child upcoming examinations"
            },
            {
              "id": "pa-child-exam-timetable",
              "label": "Child examination timetable"
            },
            {
              "id": "pa-child-exam-instructions",
              "label": "Child examination instructions"
            }
          ]
        },
        {
          "id": "pa-results-progress",
          "label": "Results & Progress",
          "tab": "result_management",
          "features": [
            {
              "id": "pa-child-result-summary",
              "label": "Child result summary"
            },
            {
              "id": "pa-child-progress-card",
              "label": "Child progress card"
            },
            {
              "id": "pa-child-result-history",
              "label": "Child result history"
            }
          ]
        }
      ]
    },
    {
      "id": "parent-services",
      "label": "Services & Communication",
      "modules": [
        {
          "id": "pa-fees",
          "label": "Fees & Receipts",
          "tab": "fees",
          "features": [
            {
              "id": "pa-child-fee-dues",
              "label": "Child fee dues"
            },
            {
              "id": "pa-child-payment-history",
              "label": "Child payment history"
            },
            {
              "id": "pa-child-fee-receipts",
              "label": "Child fee receipts"
            }
          ]
        },
        {
          "id": "pa-admission-status",
          "label": "Admission Status",
          "tab": "overview",
          "features": [
            {
              "id": "pa-application-status",
              "label": "Application status"
            },
            {
              "id": "pa-document-request-status",
              "label": "Document request status"
            },
            {
              "id": "pa-admission-message",
              "label": "School admission message"
            }
          ]
        },
        {
          "id": "pa-leave",
          "label": "Leave Application",
          "tab": "attendance",
          "features": [
            {
              "id": "pa-submit-child-leave",
              "label": "Submit child leave application"
            },
            {
              "id": "pa-child-leave-status",
              "label": "Child leave status"
            },
            {
              "id": "pa-child-leave-history",
              "label": "Child leave history"
            }
          ]
        },
        {
          "id": "pa-certificate-requests",
          "label": "Certificate Requests",
          "tab": "overview",
          "features": [
            {
              "id": "pa-request-child-certificate",
              "label": "Request child certificate"
            },
            {
              "id": "pa-certificate-status",
              "label": "Certificate request status"
            },
            {
              "id": "pa-issued-child-documents",
              "label": "Issued child documents"
            }
          ]
        },
        {
          "id": "pa-notices-messages",
          "label": "Notices & Messages",
          "tab": "communication",
          "features": [
            {
              "id": "pa-school-notices",
              "label": "School notices"
            },
            {
              "id": "pa-teacher-messages",
              "label": "Teacher messages"
            },
            {
              "id": "pa-message-history",
              "label": "Message history"
            }
          ]
        },
        {
          "id": "pa-library",
          "label": "Library Information",
          "tab": "library",
          "features": [
            {
              "id": "pa-child-library-loans",
              "label": "Child library loans"
            },
            {
              "id": "pa-child-library-dues",
              "label": "Child library dues"
            },
            {
              "id": "pa-child-library-history",
              "label": "Child library history"
            }
          ]
        },
        {
          "id": "pa-profile",
          "label": "Profile & Security",
          "tab": "security",
          "features": [
            {
              "id": "pa-complete-profile",
              "label": "Complete / Update Parent Profile"
            },
            {
              "id": "pa-parent-profile",
              "label": "Parent profile"
            },
            {
              "id": "pa-child-link-security",
              "label": "Child-link security"
            },
            {
              "id": "pa-password-security",
              "label": "Password and login security"
            }
          ]
        }
      ]
    }
  ],
  "peon": [
    {
      "id": "peon-operations",
      "label": "School Operations",
      "modules": [
        {
          "id": "pn-home",
          "label": "Duty Dashboard",
          "tab": "overview",
          "description": "Today's operational duties, next bell, gate activity and notices.",
          "features": [{"id":"pn-today","label":"Today's duties and status"}]
        },
        {
          "id": "pn-bell-timing",
          "label": "Bell Timing & Alarm",
          "tab": "timetable_v2",
          "description": "Headmaster-controlled bell schedule with mandatory native alarm sync.",
          "features": [
            {"id":"pn-next-bell","label":"Next bell"},
            {"id":"pn-today-bells","label":"Today's bell schedule"},
            {"id":"pn-bell-device-status","label":"Bell device readiness"}
          ]
        },
        {
          "id": "pn-gate-visitor",
          "label": "Gate & Visitor Desk",
          "tab": "gatekeeper_security",
          "features": [
            {"id":"pn-visitor-checkin","label":"Visitor check-in / check-out"},
            {"id":"pn-student-return","label":"Approved student gate-pass returns"},
            {"id":"pn-staff-return","label":"Approved staff gate-pass returns"}
          ]
        },
        {
          "id": "pn-dispatch",
          "label": "Office Dispatch & Delivery",
          "tab": "communication",
          "features": [
            {"id":"pn-dispatch-list","label":"Assigned / outgoing deliveries"},
            {"id":"pn-delivery-status","label":"Collected / Delivered / Returned"}
          ]
        },
        {
          "id": "pn-leave",
          "label": "My Leave",
          "tab": "leave_management",
          "features": [
            {"id":"pn-leave-apply","label":"Apply for leave"},
            {"id":"pn-leave-status","label":"Leave status and history"}
          ]
        },
        {
          "id": "pn-notices",
          "label": "Notices & Instructions",
          "tab": "communication",
          "features": [{"id":"pn-notice-list","label":"School notices and instructions"}]
        },
        {
          "id": "pn-profile",
          "label": "Profile & Security",
          "tab": "security",
          "features": [
            {"id":"pn-complete-profile","label":"Complete / Update Profile"},
            {"id":"pn-password-security","label":"Password and login security"}
          ]
        }
      ]
    }
  ]
} as Record<string, RoleModuleCategory[]>;

export function getRoleModuleCatalogue(
  role: string,
  isClassTeacher: boolean
): RoleModuleCategory[] {
  const normalized = String(role || 'teacher').toLowerCase();
  if ((normalized === 'teacher' || normalized === 'class_teacher') && isClassTeacher) {
    return ROLE_MODULE_BLUEPRINT.class_teacher;
  }
  // Class Teacher is an assigned duty, not a permanent name/role shortcut.
  if (normalized === 'class_teacher') return ROLE_MODULE_BLUEPRINT.teacher;
  return ROLE_MODULE_BLUEPRINT[normalized] || ROLE_MODULE_BLUEPRINT.teacher;
}
