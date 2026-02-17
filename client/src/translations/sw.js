const sw = {
  // Navigation & Menu
  nav: {
    dashboard: 'Dashibodi',
    profile: 'Wasifu Wangu',
    studentsManagement: 'Usimamizi wa Wanafunzi',
    studentAdmission: 'Kuongeza Mwanafunzi',
    viewStudents: 'Ona Wanafunzi',
    teacherManagement: 'Usimamizi wa Walimu',
    academy: 'Taaluma',
    myClasses: 'Madarasa Yangu',
    subjects: 'Masomo',
    grades: 'Alama',
    attendance: 'Mahudhurio',
    analyticsReports: 'Takwimu na Ripoti',
    finance: 'Fedha',
    communication: 'Mawasiliano',
    settings: 'Mipangilio',
    logout: 'Ondoka'
  },

  // Profile & Authentication
  auth: {
    login: 'Ingia',
    register: 'Jiunge',
    logout: 'Ondoka',
    username: 'Jina la Mtumiaji',
    email: 'Barua Pepe',
    password: 'Neno la Siri',
    confirmPassword: 'Thibitisha Neno la Siri',
    currentPassword: 'Neno la Siri la Sasa',
    newPassword: 'Neno la Siri Jipya',
    firstName: 'Jina la Kwanza',
    lastName: 'Jina la Mwisho',
    phone: 'Namba ya Simu',
    role: 'Wadhifa',
    loginSuccess: 'Umeingia kwa ufanisi',
    logoutSuccess: 'Umetoka kwa ufanisi',
    loginFailed: 'Kuingia kumeshindwa',
    invalidCredentials: 'Taarifa za kuingia si sahihi'
  },

  // Profile Actions
  profile: {
    viewProfile: 'Ona Wasifu',
    editProfile: 'Hariri Wasifu',
    changePassword: 'Badili Neno la Siri',
    updateProfile: 'Sasisha Wasifu',
    profileUpdated: 'Wasifu umesasishwa kwa ufanisi',
    passwordChanged: 'Neno la siri limebadilishwa kwa ufanisi'
  },

  // Common Actions
  actions: {
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    add: 'Ongeza',
    remove: 'Ondoa',
    search: 'Tafuta',
    filter: 'Chuja',
    refresh: 'Onyesha Upya',
    submit: 'Wasilisha',
    close: 'Funga',
    back: 'Rudi Nyuma',
    next: 'Ifuatayo',
    previous: 'Iliyotangulia',
    confirm: 'Thibitisha',
    loading: 'Inapakia...',
    processing: 'Inachakata...',
    updating: 'Inasasisha...',
    saving: 'Inahifadhi...'
  },

  // Dashboard
  dashboard: {
    welcome: 'Karibu tena, {{name}}!',
    totalStudents: 'Jumla ya Wanafunzi',
    totalTeachers: 'Jumla ya Walimu',
    totalClasses: 'Jumla ya Madarasa',
    feeCollectionRate: 'Kiwango cha Ukusanyaji wa Ada',
    myStudents: 'Wanafunzi Wangu',
    subjectsTeaching: 'Masomo Ninayofundisha',
    classesAssigned: 'Madarasa Yaliyopangiwa',
    attendanceRate: 'Kiwango cha Mahudhurio',
    quickActions: 'Vitendo vya Haraka',
    recentActivity: 'Shughuli za Hivi Karibuni',
    refreshDashboard: 'Onyesha Dashibodi Upya'
  },

  // Students
  students: {
    student: 'Mwanafunzi',
    students: 'Wanafunzi',
    addStudent: 'Ongeza Mwanafunzi',
    editStudent: 'Hariri Mwanafunzi',
    deleteStudent: 'Futa Mwanafunzi',
    studentList: 'Orodha ya Wanafunzi',
    studentProfile: 'Wasifu wa Mwanafunzi',
    admissionNumber: 'Namba ya Uongezaji',
    class: 'Darasa',
    guardianName: 'Jina la Mlezi',
    guardianPhone: 'Simu ya Mlezi',
    dateOfBirth: 'Tarehe ya Kuzaliwa',
    gender: 'Jinsia',
    address: 'Anwani'
  },

  // Teachers
  teachers: {
    teacher: 'Mwalimu',
    teachers: 'Walimu',
    addTeacher: 'Ongeza Mwalimu',
    editTeacher: 'Hariri Mwalimu',
    deleteTeacher: 'Futa Mwalimu',
    teacherList: 'Orodha ya Walimu',
    teacherProfile: 'Wasifu wa Mwalimu',
    employeeId: 'Namba ya Mfanyakazi',
    department: 'Idara',
    position: 'Cheo',
    qualification: 'Sifa za Elimu',
    experience: 'Uzoefu',
    joiningDate: 'Tarehe ya Kuajiriwa',
    specialization: 'Utaalamu'
  },

  // Classes & Subjects
  classes: {
    class: 'Darasa',
    classes: 'Madarasa',
    addClass: 'Ongeza Darasa',
    editClass: 'Hariri Darasa',
    deleteClass: 'Futa Darasa',
    className: 'Jina la Darasa',
    classLevel: 'Kiwango cha Darasa',
    academicYear: 'Mwaka wa Masomo',
    classTeacher: 'Mwalimu wa Darasa'
  },

  subjects: {
    subject: 'Somo',
    subjects: 'Masomo',
    addSubject: 'Ongeza Somo',
    editSubject: 'Hariri Somo',
    deleteSubject: 'Futa Somo',
    subjectName: 'Jina la Somo',
    subjectCode: 'Namba ya Somo'
  },

  // Attendance
  attendance: {
    attendance: 'Mahudhurio',
    takeAttendance: 'Chukua Mahudhurio',
    attendanceRecord: 'Rekodi ya Mahudhurio',
    present: 'Yupo',
    absent: 'Hayupo',
    late: 'Amechelewa',
    excused: 'Ameruhusiwa',
    attendanceRate: 'Kiwango cha Mahudhurio',
    date: 'Tarehe',
    status: 'Hali'
  },

  // Grades
  grades: {
    grades: 'Alama',
    addGrade: 'Ongeza Alama',
    editGrade: 'Hariri Alama',
    gradeBook: 'Kitabu cha Alama',
    assessment: 'Tathmini',
    marks: 'Alama',
    percentage: 'Asilimia',
    grade: 'Daraja',
    remarks: 'Maelezo'
  },

  // Settings
  settings: {
    settings: 'Mipangilio',
    generalSettings: 'Mipangilio ya Jumla',
    languageSettings: 'Mipangilio ya Lugha',
    selectLanguage: 'Chagua Lugha',
    english: 'Kingereza',
    swahili: 'Kiswahili',
    languageChanged: 'Lugha imebadilishwa kwa ufanisi',
    systemSettings: 'Mipangilio ya Mfumo',
    accountSettings: 'Mipangilio ya Akaunti',
    notificationSettings: 'Mipangilio ya Arifa'
  },

  // Finance
  finance: {
    finance: 'Fedha',
    feeCollection: 'Ukusanyaji wa Ada',
    feeStructure: 'Muundo wa Ada',
    payments: 'Malipo',
    invoices: 'Bili',
    reports: 'Ripoti za Kifedha',
    amount: 'Kiasi',
    dueDate: 'Tarehe ya Mwisho',
    paymentStatus: 'Hali ya Malipo',
    paid: 'Amelipa',
    pending: 'Inasubiri',
    overdue: 'Imechelewa'
  },

  // Communication
  communication: {
    communication: 'Mawasiliano',
    announcements: 'Matangazo',
    notifications: 'Arifa',
    messages: 'Ujumbe',
    sendMessage: 'Tuma Ujumbe',
    sendAnnouncement: 'Tuma Tangazo',
    subject: 'Mada',
    message: 'Ujumbe',
    recipient: 'Mpokeaji',
    sender: 'Mtumaji'
  },

  // Reports & Analytics
  reports: {
    reports: 'Ripoti',
    analytics: 'Takwimu',
    studentReport: 'Ripoti ya Wanafunzi',
    teacherReport: 'Ripoti ya Walimu',
    attendanceReport: 'Ripoti ya Mahudhurio',
    gradeReport: 'Ripoti ya Alama',
    financialReport: 'Ripoti ya Kifedha',
    generateReport: 'Tengeneza Ripoti',
    exportReport: 'Hamisha Ripoti'
  },

  // Common Labels
  labels: {
    name: 'Jina',
    description: 'Maelezo',
    createdAt: 'Ilitengenezwa',
    updatedAt: 'Ilisasishwa',
    active: 'Inatumika',
    inactive: 'Haitumiki',
    status: 'Hali',
    type: 'Aina',
    category: 'Jamii',
    total: 'Jumla',
    count: 'Hesabu',
    today: 'Leo',
    thisWeek: 'Wiki Hii',
    thisMonth: 'Mwezi Huu',
    thisYear: 'Mwaka Huu',
    all: 'Zote'
  },

  // Error Messages
  errors: {
    required: 'Hii sehemu inahitajika',
    invalidEmail: 'Tafadhali weka barua pepe sahihi',
    passwordTooShort: 'Neno la siri lazima liwe na angalau herufi 8',
    passwordsDoNotMatch: 'Maneno ya siri hayanafanani',
    networkError: 'Hitilafu ya mtandao imetokea',
    serverError: 'Hitilafu ya seva imetokea',
    unauthorizedAccess: 'Ufikiaji usioruhusiwa',
    resourceNotFound: 'Rasilimali haijapatikana',
    validationFailed: 'Uhakiki umeshindwa',
    operationFailed: 'Utekelezaji umeshindwa'
  },

  // Success Messages
  success: {
    saved: 'Imehifadhiwa kwa ufanisi',
    updated: 'Imesasishwa kwa ufanisi',
    deleted: 'Imefutwa kwa ufanisi',
    created: 'Imetengenezwa kwa ufanisi',
    sent: 'Imetumwa kwa ufanisi',
    imported: 'Imeingizwa kwa ufanisi',
    exported: 'Imehamishwa kwa ufanisi'
  },

  // Footer
  footer: {
    companyName: 'MOSAT.INC',
    aboutCompany: 'Mtoa huduma mkuu wa mifumo ya kisasa ya usimamizi wa shule nchini Tanzania',
    contactUs: 'Wasiliana Nasi',
    phone: 'Simu',
    email: 'Barua Pepe',
    address: 'Anwani',
    allRightsReserved: 'Haki zote zimehifadhiwa',
    developedBy: 'Imetengenezwa na MOSAT.INC',
    support: 'Msaada',
    documentation: 'Nyaraka',
    privacyPolicy: 'Sera ya Faragha',
    termsOfService: 'Masharti ya Huduma'
  },

  // Time & Date
  time: {
    now: 'Sasa',
    today: 'Leo',
    yesterday: 'Jana',
    tomorrow: 'Kesho',
    thisWeek: 'Wiki Hii',
    lastWeek: 'Wiki Iliyopita',
    thisMonth: 'Mwezi Huu',
    lastMonth: 'Mwezi Uliopita',
    thisYear: 'Mwaka Huu',
    lastYear: 'Mwaka Uliopita'
  }
};

export default sw;
