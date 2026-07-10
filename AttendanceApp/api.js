export const BASE_URL = 'http://192.168.1.67:5000';

export const API = {
  login: `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  currentUser: `${BASE_URL}/api/auth/me`,
  updateMe: `${BASE_URL}/api/auth/me`,
  sessionStart: `${BASE_URL}/api/session/start`,
  sessionEnd: `${BASE_URL}/api/session/end`,
  sessionStatus: `${BASE_URL}/api/session/status`,
  sessionClasses: `${BASE_URL}/api/session/classes`,
  attendanceHistory: `${BASE_URL}/api/attendance/history`,
  attendanceLog: `${BASE_URL}/api/attendance/log`,
  attendanceStatus: `${BASE_URL}/api/attendance/status`,
  attendanceAnalytics: `${BASE_URL}/api/attendance/analytics`,
  classes: `${BASE_URL}/api/admin/classes`,
  studentClasses: `${BASE_URL}/api/student/classes`,
  students: `${BASE_URL}/api/student`,
  excuses: `${BASE_URL}/api/excuse`,
  excuseSubmit: `${BASE_URL}/api/excuse/submit`,
  myExcuses: `${BASE_URL}/api/excuse/my-excuses`,
  excusePending: `${BASE_URL}/api/excuse/pending`,
  excuseDecide: `${BASE_URL}/api/excuse/decide`,
  adminClassList: `${BASE_URL}/api/admin/class/list`,
  adminClassCreate: `${BASE_URL}/api/admin/class/create`,
  adminClassDelete: `${BASE_URL}/api/admin/class`,
  adminUsers: `${BASE_URL}/api/admin/users`,
  adminStats: `${BASE_URL}/api/admin/stats`,
  adminRecentSessions: `${BASE_URL}/api/admin/recent-sessions`,
  sessionMySessions: `${BASE_URL}/api/session/my-sessions`,
  attendanceScan: `${BASE_URL}/api/attendance/scan`,
  adminBatches:           `${BASE_URL}/api/admin/batches`,
  adminBatchDetail:       `${BASE_URL}/api/admin/batches`,       // append /{id}
  adminBatchStudents:     `${BASE_URL}/api/admin/batches`,       // append /{id}/students
  adminEnrollBatch:       `${BASE_URL}/api/admin/classes`,       // append /{class_id}/enroll-batch
  adminClassSchedule:     `${BASE_URL}/api/admin/class`,         // append /{id}/schedule
  adminRegisterStudent:   `${BASE_URL}/api/admin/register-student`,
  adminStudentsList:      `${BASE_URL}/api/student/list`,
  adminStudentDetail:     `${BASE_URL}/api/student`,          // append /:id  GET
  adminStudentUpdate:     `${BASE_URL}/api/student`,          // append /:id  PUT
  adminStudentDelete:     `${BASE_URL}/api/student`,          // append /:id  DELETE
  adminTeachers:          `${BASE_URL}/api/admin/users?role=teacher`,
  adminSendNotification:  `${BASE_URL}/api/admin/send-notification`,
  adminNotifications:     `${BASE_URL}/api/admin/notifications`,
  adminExportReport:      `${BASE_URL}/api/admin/export-report`,
  myNotifications:        `${BASE_URL}/api/notifications/my-notifications`,
  markNotificationsRead:  `${BASE_URL}/api/notifications/mark-read`,
  notificationUnreadCount:`${BASE_URL}/api/notifications/unread-count`,
};
