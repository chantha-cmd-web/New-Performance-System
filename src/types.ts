export interface User {
  id: string;
  name: string;
  role: 'admin' | 'superadmin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PeerFeedback {
  peerName: string;
  feedback: string;
  score: number;
}

export interface CriteriaScore {
  criteriaId: number;
  selfScore: number;
  superScore: number;
  supporterScore?: number;
  managementScore?: number;
  aspScore?: number;
}

export interface Evaluation {
  id?: number;
  employeeId: string;
  employeeName: string;
  campus: string;
  department?: string;
  position: string;
  appraiser: string;
  supporter?: string;
  reviewDate: string;
  weightScheme: string;
  evaluationType: string;
  evalPeriod?: string;
  totalSelf: number;
  totalSuper: number;
  overallScore: number;
  criteriaScores: CriteriaScore[];
  peerFeedbacks: PeerFeedback[];
  status?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  evaluatorComments?: string;
}

export interface Employee {
  id: string;
  name: string;
  khmerName?: string;
  campus: string;
  department?: string;
  position: string;
  category?: string;
  supervisorId?: string;
  supporterId?: string;
  evalModel?: string;
  evalPeriod?: string;
  active?: number;
  email?: string;
  phone?: string;
  hireDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfileSetting {
  id: number;
  category: string;
  key: string;
  value: string;
}

export interface ImportValidationResult {
  total: number;
  valid: number;
  errors: number;
  errorDetails: { row: number; message: string }[];
  validRecords: any[];
  summary: {
    creates: number;
    updates: number;
    campuses: string[];
    departments: string[];
  };
}

export const STATUS_LABELS: Record<string, { label: string, kh: string, color: string }> = {
  'Draft': { label: 'Draft', kh: 'ព្រាង', color: 'bg-slate-100 text-slate-700' },
  'Self Evaluation Pending': { label: 'Self Eval Pending', kh: 'រង់ចាំការវាយតម្លៃខ្លួនឯង', color: 'bg-blue-100 text-blue-700' },
  'Waiting for Supervisor': { label: 'Waiting Supervisor', kh: 'រង់ចាំអ្នកវាយតម្លៃ', color: 'bg-indigo-100 text-indigo-700' },
  'Supervisor Completed': { label: 'Supervisor Completed', kh: 'វាយតម្លៃរួចរាល់', color: 'bg-purple-100 text-purple-700' },
  'Waiting for Supporter': { label: 'Waiting Supporter', kh: 'រង់ចាំអ្នកគាំទ្រ', color: 'bg-amber-100 text-amber-700' },
  'Supporter Completed': { label: 'Supporter Completed', kh: 'អ្នកគាំទ្រវាយតម្លៃរួចរាល់', color: 'bg-emerald-100 text-emerald-700' },
  'Approved': { label: 'Approved', kh: 'អនុម័តរួច', color: 'bg-green-100 text-green-700' },
  'Completed': { label: 'Completed', kh: 'បញ្ជប់', color: 'bg-green-100 text-green-700' }
};

export const WEIGHTING_SCHEMES = [
  { id: 'campus_60_40', label: 'Direct Supervisor 60% (campus) / Supporter 40% (central)' },
  { id: 'campus_50_50', label: 'Direct Supervisor 50% (campus) / Supporter 50% (central)' },
  { id: 'campus_100', label: 'Direct Supervisor (campus) 100%' },
  { id: 'central_100', label: 'Direct Supervisor 100% (central)' }
];

export interface CriteriaDefinition {
  id: number;
  kh: string;
  en: string;
  desc: string;
  khDesc: string;
  max: number;
}

export const EVALUATION_TYPES = [
  { id: 'management', label: 'Management / ការគ្រប់គ្រង' },
  { id: 'teacher', label: 'Teacher / គ្រូបង្រៀន' },
  { id: 'operations', label: 'Operations / ប្រតិបត្តិការ' }
];

export const CRITERIA_SETS: Record<string, CriteriaDefinition[]> = {
  management: [
    { id: 1, kh: 'អាកប្បកិរិយា', khDesc: 'ចំណាប់អារម្មណ៍ និងភាពសាទរ', en: 'Attitude', desc: 'Enthusiasm and dedication', max: 10 },
    { id: 2, kh: 'ចំណេះដឹងការងារ', khDesc: 'ការយល់ដឹងអំពីការងារ', en: 'Job Knowledge', desc: 'Understanding of work and skills', max: 10 },
    { id: 3, kh: 'គំនិតផ្តួចផ្តើម', khDesc: 'ការអភិវឌ្ឍន៍ និងដោះស្រាយបញ្ហា', en: 'Initiative', desc: 'Proactive thinking and development', max: 10 },
    { id: 4, kh: 'ការវិនិច្ឆ័យ និងការយល់ដឹង', khDesc: 'ការសម្រេចចិត្ត', en: 'Judgment and Awareness', desc: 'Problem-solving and decision making', max: 10 },
    { id: 5, kh: 'ការអភិវឌ្ឍន៍បុគ្គលិក', khDesc: 'ការកសាងសមត្ថភាព', en: 'Employee Development', desc: 'Effectiveness of capacity building', max: 10 },
    { id: 6, kh: 'ការចូលរួមក្នុងការគ្រប់គ្រង់ផ្នែក', khDesc: 'ការអនុលោមតាមទិសដៅ', en: 'Participation in Management', desc: 'Adherence to work directives', max: 10 },
    { id: 7, kh: 'វិន័យបុគ្គលិក', khDesc: 'ការគោរពវិន័យ', en: 'Employee Discipline', desc: 'Adherence to discipline', max: 10 },
    { id: 8, kh: 'ការទំនាក់ទំនង', khDesc: 'ការទំនាក់ទំនងជាមួយមិត្តរួមការងារ', en: 'Communication', desc: 'Interactions with colleagues', max: 10 },
    { id: 9, kh: 'ភាពជាអ្នកដឹកនាំ', khDesc: 'ការកសាងក្រុម', en: 'Leadership', desc: 'Leadership qualities and team building', max: 10 },
    { id: 10, kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', khDesc: 'ជំនាញបច្ចេកវិទ្យា', en: 'Technology Use', desc: 'Proficiency in office technology', max: 10 },
  ],
  teacher: [
    { id: 11, kh: 'ការរៀបចំមេរៀន', khDesc: 'ការរៀបចំផែនការបង្រៀន', en: 'Lesson Preparation', desc: 'Planning and preparing lessons', max: 10 },
    { id: 12, kh: 'វិធីសាស្ត្របង្រៀន', khDesc: 'ប្រសិទ្ធភាពនៃការបង្រៀន', en: 'Teaching Methodology', desc: 'Effective teaching methods', max: 10 },
    { id: 13, kh: 'ការគ្រប់គ្រងថ្នាក់រៀន', khDesc: 'ការគ្រប់គ្រងសិស្ស', en: 'Classroom Management', desc: 'Managing student behavior', max: 10 },
    { id: 14, kh: 'ការវាយតម្លៃសិស្ស', khDesc: 'ការតាមដានការសិក្សា', en: 'Student Assessment', desc: 'Evaluating student progress', max: 10 },
    { id: 15, kh: 'ទំនាក់ទំនងជាមួយមាតាបិតា', khDesc: 'ការប្រាស្រ័យទាក់ទង', en: 'Parent Communication', desc: 'Engaging with parents', max: 10 },
    { id: 16, kh: 'វិន័យនិងអាកប្បកិរិយា', khDesc: 'ក្រមសីលធម៌វិជ្ជាជីវៈ', en: 'Discipline & Attitude', desc: 'Professional conduct', max: 10 },
    { id: 17, kh: 'ការប្រើប្រាស់សម្ភារៈ', khDesc: 'ការប្រើប្រាស់សម្ភារៈឧបទ្ទេស', en: 'Use of Materials', desc: 'Effective use of teaching aids', max: 10 },
    { id: 18, kh: 'ការចូលរួមសកម្មភាពសាលា', khDesc: 'ការចូលរួមកម្មវិធី', en: 'School Activity Participation', desc: 'Involvement in school events', max: 10 },
    { id: 19, kh: 'ការអភិវឌ្ឍន៍ខ្លួន', khDesc: 'ការសិក្សាបន្ត', en: 'Self-Development', desc: 'Continuous learning', max: 10 },
    { id: 20, kh: 'ការសហការជាមួយមិត្តរួមការងារ', khDesc: 'ការធ្វើការងារជាក្រុម', en: 'Collaboration', desc: 'Teamwork with peers', max: 10 },
  ],
  operations: [
    { id: 21, kh: 'គុណភាពសេវាកម្ម', khDesc: 'ការផ្តល់សេវាកម្ម', en: 'Service Quality', desc: 'Delivering high-quality service', max: 10 },
    { id: 22, kh: 'ការអនុលោមតាមនីតិវិធី', khDesc: 'ការគោរពតាមគោលការណ៍', en: 'Compliance', desc: 'Following rules and protocols', max: 10 },
    { id: 23, kh: 'ប្រសិទ្ធភាពការងារ', khDesc: 'ល្បឿននិងភាពត្រឹមត្រូវ', en: 'Operational Efficiency', desc: 'Speed and accuracy of work', max: 10 },
    { id: 24, kh: 'ការដោះស្រាយបញ្ហា', khDesc: 'ការដោះស្រាយបញ្ហាជាក់ស្តែង', en: 'Problem Solving', desc: 'Handling operational issues', max: 10 },
    { id: 25, kh: 'សុវត្ថិភាពនិងអនាម័យ', khDesc: 'ការរក្សាបរិស្ថានល្អ', en: 'Safety & Hygiene', desc: 'Maintaining a safe environment', max: 10 },
    { id: 26, kh: 'ការថែទាំឧបករណ៍', khDesc: 'ការថែរក្សាសម្ភារៈ', en: 'Equipment Maintenance', desc: 'Proper care of tools and equipment', max: 10 },
    { id: 27, kh: 'ការធ្វើការជាក្រុម', khDesc: 'ការសហការ', en: 'Teamwork', desc: 'Working well with others', max: 10 },
    { id: 28, kh: 'ភាពជឿជាក់និងការទទួលខុសត្រូវ', khDesc: 'ការទទួលខុសត្រូវ', en: 'Reliability & Responsibility', desc: 'Dependability in duties', max: 10 },
    { id: 29, kh: 'ការទំនាក់ទំនងអតិថិជន', khDesc: 'ការបម្រើអតិថិជន', en: 'Customer Communication', desc: 'Interacting with clients effectively', max: 10 },
    { id: 30, kh: 'ការគ្រប់គ្រងពេលវេលា', khDesc: 'ការបំពេញការងារទាន់ពេល', en: 'Time Management', desc: 'Completing tasks on time', max: 10 },
  ]
};
