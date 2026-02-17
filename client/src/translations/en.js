const en = {
  // Navigation & Menu
  nav: {
    dashboard: 'Dashboard',
    profile: 'My Profile',
    studentsManagement: 'Students Management',
    studentAdmission: 'Student Admission',
    viewStudents: 'View Students',
    teacherManagement: 'Teacher Management',
    academy: 'Academy',
    myClasses: 'My Classes',
    subjects: 'Subjects',
    grades: 'Grades',
    attendance: 'Attendance',
    analyticsReports: 'Analytics & Reports',
    finance: 'Finance',
    communication: 'Communication',
    settings: 'Settings',
    logout: 'Logout'
  },

  // Profile & Authentication
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone Number',
    role: 'Role',
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logged out successfully',
    loginFailed: 'Login failed',
    invalidCredentials: 'Invalid credentials'
  },

  // Profile Actions
  profile: {
    viewProfile: 'View Profile',
    editProfile: 'Edit Profile',
    changePassword: 'Change Password',
    updateProfile: 'Update Profile',
    profileUpdated: 'Profile updated successfully',
    passwordChanged: 'Password changed successfully'
  },

  // Common Actions
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    submit: 'Submit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    confirm: 'Confirm',
    loading: 'Loading...',
    processing: 'Processing...',
    updating: 'Updating...',
    saving: 'Saving...'
  },

  // Dashboard
  dashboard: {
    welcome: 'Welcome back, {{name}}!',
    totalStudents: 'Total Students',
    totalTeachers: 'Total Teachers',
    totalClasses: 'Total Classes',
    feeCollectionRate: 'Fee Collection Rate',
    myStudents: 'My Students',
    subjectsTeaching: 'Subjects Teaching',
    classesAssigned: 'Classes Assigned',
    attendanceRate: 'Attendance Rate',
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    refreshDashboard: 'Refresh Dashboard'
  },

  // Students
  students: {
    student: 'Student',
    students: 'Students',
    addStudent: 'Add Student',
    editStudent: 'Edit Student',
    deleteStudent: 'Delete Student',
    studentList: 'Student List',
    studentProfile: 'Student Profile',
    admissionNumber: 'Admission Number',
    class: 'Class',
    guardianName: 'Guardian Name',
    guardianPhone: 'Guardian Phone',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    address: 'Address'
  },

  // Teachers
  teachers: {
    teacher: 'Teacher',
    teachers: 'Teachers',
    addTeacher: 'Add Teacher',
    editTeacher: 'Edit Teacher',
    deleteTeacher: 'Delete Teacher',
    teacherList: 'Teacher List',
    teacherProfile: 'Teacher Profile',
    employeeId: 'Employee ID',
    department: 'Department',
    position: 'Position',
    qualification: 'Qualification',
    experience: 'Experience',
    joiningDate: 'Joining Date',
    specialization: 'Specialization'
  },

  // Classes & Subjects
  classes: {
    class: 'Class',
    classes: 'Classes',
    addClass: 'Add Class',
    editClass: 'Edit Class',
    deleteClass: 'Delete Class',
    className: 'Class Name',
    classLevel: 'Class Level',
    academicYear: 'Academic Year',
    classTeacher: 'Class Teacher'
  },

  subjects: {
    subject: 'Subject',
    subjects: 'Subjects',
    addSubject: 'Add Subject',
    editSubject: 'Edit Subject',
    deleteSubject: 'Delete Subject',
    subjectName: 'Subject Name',
    subjectCode: 'Subject Code'
  },

  // Attendance
  attendance: {
    attendance: 'Attendance',
    takeAttendance: 'Take Attendance',
    attendanceRecord: 'Attendance Record',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
    attendanceRate: 'Attendance Rate',
    date: 'Date',
    status: 'Status'
  },

  // Grades
  grades: {
    grades: 'Grades',
    addGrade: 'Add Grade',
    editGrade: 'Edit Grade',
    gradeBook: 'Grade Book',
    assessment: 'Assessment',
    marks: 'Marks',
    percentage: 'Percentage',
    grade: 'Grade',
    remarks: 'Remarks'
  },

  // Settings
  settings: {
    settings: 'Settings',
    generalSettings: 'General Settings',
    languageSettings: 'Language Settings',
    selectLanguage: 'Select Language',
    english: 'English',
    swahili: 'Kiswahili',
    languageChanged: 'Language changed successfully',
    systemSettings: 'System Settings',
    accountSettings: 'Account Settings',
    notificationSettings: 'Notification Settings'
  },

  // Finance
  finance: {
    finance: 'Finance',
    feeCollection: 'Fee Collection',
    feeStructure: 'Fee Structure',
    payments: 'Payments',
    invoices: 'Invoices',
    reports: 'Financial Reports',
    amount: 'Amount',
    dueDate: 'Due Date',
    paymentStatus: 'Payment Status',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue'
  },

  // Communication
  communication: {
    communication: 'Communication',
    announcements: 'Announcements',
    notifications: 'Notifications',
    messages: 'Messages',
    sendMessage: 'Send Message',
    sendAnnouncement: 'Send Announcement',
    subject: 'Subject',
    message: 'Message',
    recipient: 'Recipient',
    sender: 'Sender'
  },

  // Reports & Analytics
  reports: {
    reports: 'Reports',
    analytics: 'Analytics',
    studentReport: 'Student Report',
    teacherReport: 'Teacher Report',
    attendanceReport: 'Attendance Report',
    gradeReport: 'Grade Report',
    financialReport: 'Financial Report',
    generateReport: 'Generate Report',
    exportReport: 'Export Report'
  },

  // Common Labels
  labels: {
    name: 'Name',
    description: 'Description',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',
    type: 'Type',
    category: 'Category',
    total: 'Total',
    count: 'Count',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    all: 'All'
  },

  // Error Messages
  errors: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    networkError: 'Network error occurred',
    serverError: 'Server error occurred',
    unauthorizedAccess: 'Unauthorized access',
    resourceNotFound: 'Resource not found',
    validationFailed: 'Validation failed',
    operationFailed: 'Operation failed'
  },

  // Success Messages
  success: {
    saved: 'Saved successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
    created: 'Created successfully',
    sent: 'Sent successfully',
    imported: 'Imported successfully',
    exported: 'Exported successfully'
  },

  // Footer
  footer: {
    companyName: 'MOSAT.INC',
    aboutCompany: 'Leading provider of innovative school management solutions in Tanzania',
    contactUs: 'Contact Us',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    allRightsReserved: 'All rights reserved',
    developedBy: 'Developed by MOSAT.INC',
    support: 'Support',
    documentation: 'Documentation',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service'
  },

  // Time & Date
  time: {
    now: 'Now',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisYear: 'This Year',
    lastYear: 'Last Year'
  }
};

export default en;
