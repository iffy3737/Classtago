import { Language } from '../types';
import { translations } from './translations';
import { publicPortalCatalogueOverrides, publicPortalCataloguePhrases } from './publicPortalCatalogueTranslations';

type PublicPortalCopy = {
  about: string;
  academics: string;
  facilities: string;
  notices: string;
  gallery: string;
  contact: string;
  applyNow: string;
  applyForAdmission: string;
  schoolLogin: string;
  officialDigitalCampus: string;
  verifiedInstitution: string;
  officialSchoolWebsite: string;
  welcomeTo: string;
  studentStaffLogin: string;
  multilingual: string;
  inclusiveAccess: string;
  studentFirst: string;
  connectedJourney: string;
  secure: string;
  verifiedPortal: string;
  digital: string;
  modernExperience: string;
  schoolDigitalReception: string;
  admissions: string;
  openNow: string;
  erpAccess: string;
  roleBasedLogin: string;
  aboutOurSchool: string;
  purpose: string;
  learningDirection: string;
  care: string;
  everyLearnerMatters: string;
  progress: string;
  visibleGrowth: string;
  studentGrowth: string;
  headmasterMessage: string;
  headmaster: string;
  achievements: string;
  rulesInformation: string;
  connectWithSchool: string;
  hereToHelp: string;
  contactGuidance: string;
  address: string;
  phone: string;
  email: string;
  officeHours: string;
  schoolOffice: string;
  contactSchoolOffice: string;
  officialSchoolEmail: string;
  regularSchoolHours: string;
  officialSchoolMedia: string;
  schoolPhotosSoon: string;
  campus: string;
  classrooms: string;
  studentActivities: string;
  onlineAdmissionEnquiry: string;
  submitPreliminary: string;
  applicationReceived: string;
  keepReference: string;
  noAdmissionConfirmation: string;
  close: string;
  cancel: string;
  submitApplication: string;
  submittingApplication: string;
  studentFullName: string;
  enterStudentName: string;
  dateOfBirth: string;
  guardianFullName: string;
  guardianNamePlaceholder: string;
  mobileNumber: string;
  contactNumber: string;
  emailAddress: string;
  optionalEmail: string;
  classApplyingFor: string;
  classExample: string;
  gender: string;
  select: string;
  female: string;
  male: string;
  other: string;
  preferNotToSay: string;
  residentialAddress: string;
  admissionNote: string;
  importantInformation: string;
  consent: string;
  requiredFields: string;
  confirmInformation: string;
  submissionFailed: string;
  secureSchoolPortal: string;
  poweredBy: string;
  platform: string;
  websiteLanguage: string;
};

const en: PublicPortalCopy = {
  about: 'About', academics: 'Academics', facilities: 'Facilities', notices: 'Notices', gallery: 'Gallery', contact: 'Contact',
  applyNow: 'Apply now', applyForAdmission: 'Apply for Admission', schoolLogin: 'School Login', officialDigitalCampus: 'Official digital campus',
  verifiedInstitution: 'Verified Classtago institution', officialSchoolWebsite: 'Official School Website', welcomeTo: 'Welcome to', studentStaffLogin: 'Student & Staff Login',
  multilingual: 'Multilingual', inclusiveAccess: 'Inclusive access', studentFirst: 'Student first', connectedJourney: 'Connected journey', secure: 'Secure', verifiedPortal: 'Verified portal', digital: 'Digital', modernExperience: 'Modern experience', schoolDigitalReception: 'School Digital Reception', admissions: 'Admissions', openNow: 'Open now', erpAccess: 'ERP Access', roleBasedLogin: 'Role-based login', aboutOurSchool: 'About our school', purpose: 'Purpose', learningDirection: 'Learning with direction', care: 'Care', everyLearnerMatters: 'Every learner matters', progress: 'Progress', visibleGrowth: 'Growth that is visible', studentGrowth: 'Student growth', headmasterMessage: 'Headmaster message', headmaster: 'Headmaster',
  achievements: 'Achievements', rulesInformation: 'Rules & information', connectWithSchool: 'Connect with the school', hereToHelp: 'We are here to help.', contactGuidance: 'Contact the school office for admission guidance, official information and student support.',
  address: 'Address', phone: 'Phone', email: 'Email', officeHours: 'Office hours', schoolOffice: 'School office', contactSchoolOffice: 'Contact school office', officialSchoolEmail: 'Official school email', regularSchoolHours: 'During regular school hours',
  officialSchoolMedia: 'Official school media', schoolPhotosSoon: 'School photographs coming soon', campus: 'Campus', classrooms: 'Classrooms', studentActivities: 'Student Activities',
  onlineAdmissionEnquiry: 'Online admission enquiry', submitPreliminary: 'Submit the preliminary application. The school will verify the information before any admission is confirmed.', applicationReceived: 'Application received', keepReference: 'Keep this reference code for school follow-up.', noAdmissionConfirmation: 'Submission does not confirm admission or create a student login. The school will review the application and contact the guardian.',
  close: 'Close', cancel: 'Cancel', submitApplication: 'Submit Application', submittingApplication: 'Submitting application…', studentFullName: 'Student full name', enterStudentName: 'Enter student name', dateOfBirth: 'Date of birth', guardianFullName: 'Guardian full name', guardianNamePlaceholder: 'Parent / guardian name', mobileNumber: 'Mobile number', contactNumber: 'Contact number', emailAddress: 'Email address', optionalEmail: 'Optional email', classApplyingFor: 'Class applying for', classExample: 'Example: Class VI', gender: 'Gender', select: 'Select', female: 'Female', male: 'Male', other: 'Other', preferNotToSay: 'Prefer not to say', residentialAddress: 'Residential address', admissionNote: 'Message or admission note', importantInformation: 'Any important information for the school', consent: 'I confirm that the information is correct and authorize the school to contact me regarding this application.', requiredFields: 'Student name, guardian name, mobile number and class are required.', confirmInformation: 'Please confirm that the submitted information is correct.', submissionFailed: 'The admission application could not be submitted.',
  secureSchoolPortal: 'Secure school portal', poweredBy: 'Powered by Classtago ERP', platform: 'Classtago Platform', websiteLanguage: 'Website language'
};

const publicLanguageAliases: Record<string, string> = {
  asm: 'as', ben: 'bn', bod: 'brx', dgo: 'doi', guj: 'gu', kan: 'kn', kas: 'ks',
  kok: 'kok', gom: 'kok', mar: 'mr', mal: 'ml', nep: 'ne', ori: 'or', od: 'or', pan: 'pa', pun: 'pa',
  san: 'sa', snd: 'sd', tam: 'ta', tel: 'te', urd: 'ur', hin: 'hi', eng: 'en'
};

function normalizePublicLanguageCode(language: Language): string {
  const raw = String(language || 'en').trim().toLowerCase().replace('_', '-');
  const base = raw.split('-')[0] || 'en';
  return publicLanguageAliases[raw] || publicLanguageAliases[base] || base;
}

const overrides: Record<string, Partial<PublicPortalCopy>> = {
  hi: {
    about: 'परिचय', academics: 'शैक्षणिक', facilities: 'सुविधाएँ', notices: 'सूचनाएँ', gallery: 'गैलरी', contact: 'संपर्क', applyNow: 'अभी आवेदन करें', applyForAdmission: 'प्रवेश के लिए आवेदन करें', schoolLogin: 'स्कूल लॉगिन', officialDigitalCampus: 'आधिकारिक डिजिटल परिसर', verifiedInstitution: 'सत्यापित Classtago संस्थान', officialSchoolWebsite: 'आधिकारिक स्कूल वेबसाइट', welcomeTo: 'स्वागत है', studentStaffLogin: 'छात्र एवं स्टाफ लॉगिन', multilingual: 'बहुभाषी', inclusiveAccess: 'सभी के लिए सुगम', studentFirst: 'छात्र सर्वोपरि', connectedJourney: 'जुड़ी हुई यात्रा', secure: 'सुरक्षित', verifiedPortal: 'सत्यापित पोर्टल', digital: 'डिजिटल', modernExperience: 'आधुनिक अनुभव', schoolDigitalReception: 'स्कूल डिजिटल स्वागत कक्ष', admissions: 'प्रवेश', openNow: 'अभी खुले हैं', erpAccess: 'ईआरपी पहुँच', roleBasedLogin: 'भूमिका आधारित लॉगिन', aboutOurSchool: 'हमारे विद्यालय के बारे में', purpose: 'उद्देश्य', learningDirection: 'दिशा के साथ सीखना', care: 'देखभाल', everyLearnerMatters: 'हर विद्यार्थी महत्वपूर्ण है', progress: 'प्रगति', visibleGrowth: 'दिखाई देने वाली वृद्धि', studentGrowth: 'विद्यार्थी विकास', headmasterMessage: 'प्रधानाध्यापक का संदेश', headmaster: 'प्रधानाध्यापक', achievements: 'उपलब्धियाँ', rulesInformation: 'नियम एवं जानकारी', connectWithSchool: 'स्कूल से संपर्क करें', hereToHelp: 'हम आपकी सहायता के लिए हैं।', contactGuidance: 'प्रवेश मार्गदर्शन, आधिकारिक जानकारी और छात्र सहायता के लिए स्कूल कार्यालय से संपर्क करें।', address: 'पता', phone: 'फ़ोन', email: 'ईमेल', officeHours: 'कार्यालय समय', schoolOffice: 'स्कूल कार्यालय', contactSchoolOffice: 'स्कूल कार्यालय से संपर्क करें', officialSchoolEmail: 'आधिकारिक स्कूल ईमेल', regularSchoolHours: 'नियमित स्कूल समय में', officialSchoolMedia: 'आधिकारिक स्कूल मीडिया', schoolPhotosSoon: 'स्कूल की तस्वीरें शीघ्र उपलब्ध होंगी', campus: 'परिसर', classrooms: 'कक्षाएँ', studentActivities: 'छात्र गतिविधियाँ', onlineAdmissionEnquiry: 'ऑनलाइन प्रवेश पूछताछ', submitPreliminary: 'प्रारंभिक आवेदन जमा करें। प्रवेश की पुष्टि से पहले स्कूल जानकारी सत्यापित करेगा।', applicationReceived: 'आवेदन प्राप्त हुआ', keepReference: 'आगे की जानकारी के लिए यह संदर्भ कोड सुरक्षित रखें।', noAdmissionConfirmation: 'आवेदन जमा करना प्रवेश की पुष्टि या छात्र लॉगिन बनाना नहीं है। स्कूल समीक्षा के बाद अभिभावक से संपर्क करेगा।', close: 'बंद करें', cancel: 'रद्द करें', submitApplication: 'आवेदन जमा करें', submittingApplication: 'आवेदन जमा हो रहा है…', studentFullName: 'छात्र का पूरा नाम', enterStudentName: 'छात्र का नाम दर्ज करें', dateOfBirth: 'जन्म तिथि', guardianFullName: 'अभिभावक का पूरा नाम', guardianNamePlaceholder: 'माता-पिता / अभिभावक का नाम', mobileNumber: 'मोबाइल नंबर', contactNumber: 'संपर्क नंबर', emailAddress: 'ईमेल पता', optionalEmail: 'वैकल्पिक ईमेल', classApplyingFor: 'जिस कक्षा के लिए आवेदन', classExample: 'उदाहरण: कक्षा 6', gender: 'लिंग', select: 'चुनें', female: 'महिला', male: 'पुरुष', other: 'अन्य', preferNotToSay: 'बताना नहीं चाहते', residentialAddress: 'निवास का पता', admissionNote: 'संदेश या प्रवेश टिप्पणी', importantInformation: 'स्कूल के लिए कोई महत्वपूर्ण जानकारी', consent: 'मैं पुष्टि करता/करती हूँ कि जानकारी सही है और इस आवेदन के संबंध में स्कूल को मुझसे संपर्क करने की अनुमति देता/देती हूँ।', requiredFields: 'छात्र का नाम, अभिभावक का नाम, मोबाइल नंबर और कक्षा आवश्यक हैं।', confirmInformation: 'कृपया पुष्टि करें कि दी गई जानकारी सही है।', submissionFailed: 'प्रवेश आवेदन जमा नहीं हो सका।', secureSchoolPortal: 'सुरक्षित स्कूल पोर्टल', poweredBy: 'Classtago ERP द्वारा संचालित', platform: 'Classtago प्लेटफ़ॉर्म', websiteLanguage: 'वेबसाइट भाषा'
  },
  ur: {
    about: 'تعارف', academics: 'تعلیم', facilities: 'سہولیات', notices: 'اعلانات', gallery: 'گیلری', contact: 'رابطہ', applyNow: 'ابھی درخواست دیں', applyForAdmission: 'داخلے کے لیے درخواست دیں', schoolLogin: 'اسکول لاگ اِن', officialDigitalCampus: 'آفیشل ڈیجیٹل کیمپس', verifiedInstitution: 'تصدیق شدہ Classtago ادارہ', officialSchoolWebsite: 'آفیشل اسکول ویب سائٹ', welcomeTo: 'خوش آمدید', studentStaffLogin: 'طلبہ و اسٹاف لاگ اِن', multilingual: 'کثیر لسانی', inclusiveAccess: 'سب کے لیے رسائی', studentFirst: 'طالب علم پہلے', connectedJourney: 'مربوط سفر', secure: 'محفوظ', verifiedPortal: 'تصدیق شدہ پورٹل', digital: 'ڈیجیٹل', modernExperience: 'جدید تجربہ', schoolDigitalReception: 'اسکول ڈیجیٹل استقبالیہ', admissions: 'داخلے', openNow: 'ابھی کھلے ہیں', erpAccess: 'ای آر پی رسائی', roleBasedLogin: 'عہدے کے مطابق لاگ اِن', aboutOurSchool: 'ہمارے اسکول کے بارے میں', purpose: 'مقصد', learningDirection: 'سمت کے ساتھ سیکھنا', care: 'نگہداشت', everyLearnerMatters: 'ہر طالب علم اہم ہے', progress: 'ترقی', visibleGrowth: 'نظر آنے والی پیش رفت', studentGrowth: 'طلبہ کی ترقی', headmasterMessage: 'ہیڈ ماسٹر کا پیغام', headmaster: 'ہیڈ ماسٹر', achievements: 'کامیابیاں', rulesInformation: 'قواعد و معلومات', connectWithSchool: 'اسکول سے رابطہ کریں', hereToHelp: 'ہم آپ کی مدد کے لیے موجود ہیں۔', contactGuidance: 'داخلہ رہنمائی، سرکاری معلومات اور طالب علم کی مدد کے لیے اسکول دفتر سے رابطہ کریں۔', address: 'پتہ', phone: 'فون', email: 'ای میل', officeHours: 'دفتری اوقات', schoolOffice: 'اسکول دفتر', contactSchoolOffice: 'اسکول دفتر سے رابطہ کریں', officialSchoolEmail: 'آفیشل اسکول ای میل', regularSchoolHours: 'معمول کے اسکول اوقات میں', officialSchoolMedia: 'آفیشل اسکول میڈیا', schoolPhotosSoon: 'اسکول کی تصاویر جلد دستیاب ہوں گی', campus: 'کیمپس', classrooms: 'کلاس رومز', studentActivities: 'طلبہ کی سرگرمیاں', onlineAdmissionEnquiry: 'آن لائن داخلہ درخواست', submitPreliminary: 'ابتدائی درخواست جمع کریں۔ داخلہ منظور ہونے سے پہلے اسکول معلومات کی تصدیق کرے گا۔', applicationReceived: 'درخواست موصول ہو گئی', keepReference: 'مزید رابطے کے لیے یہ ریفرنس کوڈ محفوظ رکھیں۔', noAdmissionConfirmation: 'درخواست جمع کرنا داخلے کی تصدیق یا طالب علم لاگ اِن بنانا نہیں ہے۔ اسکول جائزہ لے کر سرپرست سے رابطہ کرے گا۔', close: 'بند کریں', cancel: 'منسوخ کریں', submitApplication: 'درخواست جمع کریں', submittingApplication: 'درخواست جمع ہو رہی ہے…', studentFullName: 'طالب علم کا پورا نام', enterStudentName: 'طالب علم کا نام درج کریں', dateOfBirth: 'تاریخ پیدائش', guardianFullName: 'سرپرست کا پورا نام', guardianNamePlaceholder: 'والدین / سرپرست کا نام', mobileNumber: 'موبائل نمبر', contactNumber: 'رابطہ نمبر', emailAddress: 'ای میل پتہ', optionalEmail: 'اختیاری ای میل', classApplyingFor: 'درخواست والی جماعت', classExample: 'مثال: جماعت ششم', gender: 'جنس', select: 'منتخب کریں', female: 'خاتون', male: 'مرد', other: 'دیگر', preferNotToSay: 'بتانا پسند نہیں', residentialAddress: 'رہائشی پتہ', admissionNote: 'پیغام یا داخلہ نوٹ', importantInformation: 'اسکول کے لیے کوئی اہم معلومات', consent: 'میں تصدیق کرتا/کرتی ہوں کہ معلومات درست ہیں اور اس درخواست کے سلسلے میں اسکول کو مجھ سے رابطہ کرنے کی اجازت دیتا/دیتی ہوں۔', requiredFields: 'طالب علم کا نام، سرپرست کا نام، موبائل نمبر اور جماعت لازمی ہیں۔', confirmInformation: 'براہ کرم تصدیق کریں کہ دی گئی معلومات درست ہیں۔', submissionFailed: 'داخلہ درخواست جمع نہیں ہو سکی۔', secureSchoolPortal: 'محفوظ اسکول پورٹل', poweredBy: 'Classtago ERP کے ذریعے', platform: 'Classtago پلیٹ فارم', websiteLanguage: 'ویب سائٹ زبان'
  },
  mr: {
    about: 'आमच्याविषयी', academics: 'शैक्षणिक', facilities: 'सुविधा', notices: 'सूचना', gallery: 'छायाचित्र दालन', contact: 'संपर्क', applyNow: 'आता अर्ज करा', applyForAdmission: 'प्रवेशासाठी अर्ज करा', schoolLogin: 'शाळा लॉगिन', officialDigitalCampus: 'अधिकृत डिजिटल कॅम्पस', verifiedInstitution: 'सत्यापित Classtago संस्था', officialSchoolWebsite: 'अधिकृत शाळा संकेतस्थळ', welcomeTo: 'स्वागत आहे', studentStaffLogin: 'विद्यार्थी व कर्मचारी लॉगिन', multilingual: 'बहुभाषिक', inclusiveAccess: 'सर्वांसाठी प्रवेश', studentFirst: 'विद्यार्थी प्रथम', connectedJourney: 'जोडलेला प्रवास', secure: 'सुरक्षित', verifiedPortal: 'सत्यापित पोर्टल', digital: 'डिजिटल', modernExperience: 'आधुनिक अनुभव', schoolDigitalReception: 'शाळा डिजिटल स्वागत कक्ष', admissions: 'प्रवेश', openNow: 'आता सुरू', erpAccess: 'ईआरपी प्रवेश', roleBasedLogin: 'भूमिकेनुसार लॉगिन', aboutOurSchool: 'आमच्या शाळेविषयी', purpose: 'ध्येय', learningDirection: 'दिशेने शिक्षण', care: 'काळजी', everyLearnerMatters: 'प्रत्येक विद्यार्थी महत्त्वाचा', progress: 'प्रगती', visibleGrowth: 'दिसणारी वाढ', studentGrowth: 'विद्यार्थी प्रगती', headmasterMessage: 'मुख्याध्यापकांचा संदेश', headmaster: 'मुख्याध्यापक', achievements: 'यश', rulesInformation: 'नियम व माहिती', connectWithSchool: 'शाळेशी संपर्क साधा', hereToHelp: 'आम्ही मदतीसाठी येथे आहोत.', contactGuidance: 'प्रवेश मार्गदर्शन, अधिकृत माहिती आणि विद्यार्थी सहाय्यासाठी शाळा कार्यालयाशी संपर्क साधा.', address: 'पत्ता', phone: 'फोन', email: 'ईमेल', officeHours: 'कार्यालयीन वेळ', schoolOffice: 'शाळा कार्यालय', contactSchoolOffice: 'शाळा कार्यालयाशी संपर्क', officialSchoolEmail: 'अधिकृत शाळा ईमेल', regularSchoolHours: 'नियमित शाळेच्या वेळेत', officialSchoolMedia: 'अधिकृत शाळा मीडिया', schoolPhotosSoon: 'शाळेची छायाचित्रे लवकरच उपलब्ध होतील', campus: 'कॅम्पस', classrooms: 'वर्गखोल्या', studentActivities: 'विद्यार्थी उपक्रम', onlineAdmissionEnquiry: 'ऑनलाइन प्रवेश चौकशी', submitPreliminary: 'प्राथमिक अर्ज जमा करा. प्रवेश निश्चित करण्यापूर्वी शाळा माहिती पडताळेल.', applicationReceived: 'अर्ज प्राप्त झाला', keepReference: 'पुढील संपर्कासाठी हा संदर्भ क्रमांक जतन करा.', noAdmissionConfirmation: 'अर्ज सादर केल्याने प्रवेश निश्चित होत नाही किंवा विद्यार्थी लॉगिन तयार होत नाही. शाळा पडताळणी करून पालकाशी संपर्क साधेल.', close: 'बंद करा', cancel: 'रद्द करा', submitApplication: 'अर्ज सादर करा', submittingApplication: 'अर्ज सादर होत आहे…', studentFullName: 'विद्यार्थ्याचे पूर्ण नाव', enterStudentName: 'विद्यार्थ्याचे नाव लिहा', dateOfBirth: 'जन्मतारीख', guardianFullName: 'पालकाचे पूर्ण नाव', guardianNamePlaceholder: 'पालक / संरक्षकाचे नाव', mobileNumber: 'मोबाइल क्रमांक', contactNumber: 'संपर्क क्रमांक', emailAddress: 'ईमेल पत्ता', optionalEmail: 'ऐच्छिक ईमेल', classApplyingFor: 'प्रवेशासाठी वर्ग', classExample: 'उदा.: इयत्ता 6', gender: 'लिंग', select: 'निवडा', female: 'स्त्री', male: 'पुरुष', other: 'इतर', preferNotToSay: 'सांगू इच्छित नाही', residentialAddress: 'राहण्याचा पत्ता', admissionNote: 'संदेश किंवा प्रवेश नोंद', importantInformation: 'शाळेसाठी महत्त्वाची माहिती', consent: 'दिलेली माहिती बरोबर असून या अर्जाबाबत शाळेला माझ्याशी संपर्क करण्याची परवानगी देत आहे.', requiredFields: 'विद्यार्थ्याचे नाव, पालकाचे नाव, मोबाइल क्रमांक आणि वर्ग आवश्यक आहेत.', confirmInformation: 'कृपया दिलेली माहिती बरोबर असल्याची पुष्टी करा.', submissionFailed: 'प्रवेश अर्ज सादर करता आला नाही.', secureSchoolPortal: 'सुरक्षित शाळा पोर्टल', poweredBy: 'Classtago ERP द्वारे समर्थित', platform: 'Classtago प्लॅटफॉर्म', websiteLanguage: 'संकेतस्थळ भाषा'
  }
};

export function getPublicPortalCopy(language: Language): PublicPortalCopy {
  const code = normalizePublicLanguageCode(language);
  const core = translations[code] || translations.en;
  const translatedCore: Partial<PublicPortalCopy> = {
    about: core.aboutUs || core.about || undefined,
    notices: core.noticeTitle || undefined,
    contact: core.contactUs || undefined,
    schoolLogin: core.login && core.erpPortal ? `${core.login} · ${core.erpPortal}` : core.login || undefined,
    applyForAdmission: core.admissionInfo || undefined,
    cancel: core.cancel || undefined,
    submitApplication: core.submit || undefined,
    address: core.address || undefined,
    websiteLanguage: core.language || undefined
  };
  const safeCore = code === 'en' ? {} : Object.fromEntries(Object.entries(translatedCore).filter(([, value]) => Boolean(value)));
  const catalogue = publicPortalCatalogueOverrides[code] || {};
  const derivedCatalogueFallbacks: Partial<PublicPortalCopy> = code === 'en' ? {} : {
    officialDigitalCampus: catalogue.officialSchoolWebsite,
    verifiedInstitution: catalogue.secure,
    inclusiveAccess: catalogue.multilingual,
    studentFirst: catalogue.studentStaffLogin,
    connectedJourney: catalogue.academics,
    verifiedPortal: catalogue.secure,
    modernExperience: catalogue.digital,
    schoolDigitalReception: catalogue.officialSchoolWebsite,
    roleBasedLogin: catalogue.schoolLogin,
    purpose: catalogue.about,
    learningDirection: catalogue.academics,
    care: catalogue.studentStaffLogin,
    everyLearnerMatters: catalogue.studentStaffLogin,
    progress: catalogue.achievements,
    visibleGrowth: catalogue.achievements,
    studentGrowth: catalogue.academics,
    headmaster: catalogue.headmasterMessage,
    contactGuidance: catalogue.contact,
    officeHours: catalogue.contact,
    schoolOffice: catalogue.contact,
    contactSchoolOffice: catalogue.contact,
    officialSchoolEmail: catalogue.email,
    regularSchoolHours: catalogue.contact,
    officialSchoolMedia: catalogue.gallery,
    schoolPhotosSoon: catalogue.gallery,
    submitPreliminary: catalogue.onlineAdmissionEnquiry,
    keepReference: catalogue.applicationReceived,
    noAdmissionConfirmation: catalogue.admissionNote,
    submittingApplication: catalogue.submitApplication,
    enterStudentName: catalogue.studentFullName,
    guardianNamePlaceholder: catalogue.guardianFullName,
    contactNumber: catalogue.mobileNumber,
    optionalEmail: catalogue.emailAddress,
    classExample: catalogue.classApplyingFor,
    preferNotToSay: catalogue.other,
    importantInformation: catalogue.admissionNote,
    consent: catalogue.admissionNote,
    requiredFields: [catalogue.studentFullName, catalogue.guardianFullName, catalogue.mobileNumber, catalogue.classApplyingFor].filter(Boolean).join(' · '),
    confirmInformation: catalogue.admissionNote,
    submissionFailed: catalogue.admissionNote,
    secureSchoolPortal: catalogue.secure,
    poweredBy: catalogue.officialSchoolWebsite,
    platform: catalogue.erpAccess
  };
  return { ...en, ...derivedCatalogueFallbacks, ...safeCore, ...catalogue, ...(overrides[code] || {}) } as PublicPortalCopy;
}

const knownPhraseTranslations: Record<string, Record<string, string>> = {
  hi: {
    'Admissions Open': 'प्रवेश प्रारंभ',
    'Admissions': 'प्रवेश',
    'Student-centred classroom learning': 'विद्यार्थी-केंद्रित कक्षा शिक्षण',
    'Continuous academic guidance': 'निरंतर शैक्षणिक मार्गदर्शन',
    'Language-inclusive learning support': 'भाषा-समावेशी शिक्षण सहयोग',
    'Safe and disciplined campus': 'सुरक्षित और अनुशासित परिसर',
    'Digital academic workflows': 'डिजिटल शैक्षणिक कार्यप्रवाह',
    'Co-curricular development': 'सह-पाठ्यक्रम विकास',
    'Student support and guidance': 'विद्यार्थी सहयोग और मार्गदर्शन',
    'Academic achievement': 'शैक्षणिक उपलब्धि',
    'Student participation': 'विद्यार्थी सहभागिता',
    'Community trust': 'समुदाय का विश्वास',
    'Welcome to the official National High School digital portal.': 'नेशनल हाई स्कूल के आधिकारिक डिजिटल पोर्टल पर आपका स्वागत है।',
    'Attend school regularly and on time.': 'नियमित और समय पर विद्यालय आएँ।',
    'Respect every member of the school community.': 'विद्यालय समुदाय के प्रत्येक सदस्य का सम्मान करें।',
    'Follow the prescribed uniform and conduct standards.': 'निर्धारित वर्दी और आचरण मानकों का पालन करें।',
    'Submit a preliminary online application. The school will verify all information before admission is confirmed.': 'प्रारंभिक ऑनलाइन आवेदन जमा करें। प्रवेश की पुष्टि से पहले विद्यालय सभी जानकारी सत्यापित करेगा।',
    'Learning with purpose. Growing with confidence.': 'उद्देश्य के साथ सीखना। आत्मविश्वास के साथ आगे बढ़ना।',
    'A caring school community committed to strong academic foundations, disciplined character and meaningful progress for every learner.': 'एक संवेदनशील विद्यालय समुदाय, जो हर विद्यार्थी के लिए मजबूत शैक्षणिक नींव, अनुशासित चरित्र और सार्थक प्रगति के लिए समर्पित है।',
    'A school with purpose': 'उद्देश्यपूर्ण विद्यालय',
    'Learning that shapes knowledge, character and confidence.': 'ऐसी शिक्षा जो ज्ञान, चरित्र और आत्मविश्वास को आकार देती है।',
    'National High School, Taloda provides a caring and disciplined academic environment where every learner is encouraged to grow with curiosity, responsibility and confidence.': 'नेशनल हाई स्कूल, तलोदा एक संवेदनशील और अनुशासित शैक्षणिक वातावरण प्रदान करता है, जहाँ हर विद्यार्थी को जिज्ञासा, जिम्मेदारी और आत्मविश्वास के साथ आगे बढ़ने के लिए प्रोत्साहित किया जाता है।',
    'Academic journey': 'शैक्षणिक यात्रा',
    'Strong foundations. Thoughtful teaching. Measurable progress.': 'मजबूत नींव। विचारशील शिक्षण। मापनीय प्रगति।',
    'Learning is supported through connected academic records, multilingual access and continuous guidance.': 'जुड़े हुए शैक्षणिक अभिलेख, बहुभाषी पहुँच और निरंतर मार्गदर्शन से सीखने को मजबूत किया जाता है।',
    'From the Headmaster': 'प्रधानाध्यापक का संदेश',
    'Every child deserves to be seen, supported and inspired.': 'हर बच्चे को पहचान, सहयोग और प्रेरणा मिलनी चाहिए।',
    'Our school community works together to develop capable learners, responsible citizens and confident young people.': 'हमारा विद्यालय समुदाय सक्षम विद्यार्थियों, जिम्मेदार नागरिकों और आत्मविश्वासी युवाओं के विकास के लिए मिलकर कार्य करता है।',
    'Campus experience': 'परिसर अनुभव',
    'Spaces designed for learning and belonging.': 'सीखने और अपनापन महसूस करने के लिए बनाए गए स्थान।',
    'The school experience combines academic discipline, student care and digitally connected administration.': 'विद्यालय अनुभव शैक्षणिक अनुशासन, विद्यार्थी देखभाल और डिजिटल प्रशासन को जोड़ता है।',
    'School highlights': 'विद्यालय की विशेषताएँ',
    'Progress worth celebrating.': 'ऐसी प्रगति जिस पर गर्व हो।',
    'Latest information': 'नवीनतम जानकारी',
    'Notices and announcements': 'सूचनाएँ और घोषणाएँ',
    'School gallery': 'विद्यालय गैलरी',
    'Life at our school': 'हमारे विद्यालय का जीवन',
    'Student responsibility': 'विद्यार्थी जिम्मेदारी',
    'School rules and essential information': 'विद्यालय नियम और आवश्यक जानकारी',
    'A safe and respectful campus depends on shared responsibility.': 'सुरक्षित और सम्मानपूर्ण परिसर साझा जिम्मेदारी से बनता है।',
    'Connect with us': 'हमसे जुड़ें',
    'Visit, call or write to the school office.': 'विद्यालय कार्यालय आएँ, फोन करें या लिखें।'
  },
  ur: {
    'Admissions Open': 'داخلے جاری ہیں',
    'Admissions': 'داخلے',
    'Student-centred classroom learning': 'طالب علم پر مبنی جماعتی تعلیم',
    'Continuous academic guidance': 'مسلسل تعلیمی رہنمائی',
    'Language-inclusive learning support': 'زبانوں کو شامل کرنے والی تعلیمی معاونت',
    'Safe and disciplined campus': 'محفوظ اور منظم کیمپس',
    'Digital academic workflows': 'ڈیجیٹل تعلیمی طریقۂ کار',
    'Co-curricular development': 'ہم نصابی ترقی',
    'Student support and guidance': 'طلبہ کی معاونت اور رہنمائی',
    'Academic achievement': 'تعلیمی کامیابی',
    'Student participation': 'طلبہ کی شرکت',
    'Community trust': 'برادری کا اعتماد',
    'Welcome to the official National High School digital portal.': 'نیشنل ہائی اسکول کے آفیشل ڈیجیٹل پورٹل میں خوش آمدید۔',
    'Attend school regularly and on time.': 'باقاعدگی سے اور وقت پر اسکول آئیں۔',
    'Respect every member of the school community.': 'اسکول برادری کے ہر رکن کا احترام کریں۔',
    'Follow the prescribed uniform and conduct standards.': 'مقررہ یونیفارم اور ضابطۂ اخلاق کی پابندی کریں۔',
    'Submit a preliminary online application. The school will verify all information before admission is confirmed.': 'ابتدائی آن لائن درخواست جمع کریں۔ داخلہ منظور ہونے سے پہلے اسکول تمام معلومات کی تصدیق کرے گا۔',
    'Learning with purpose. Growing with confidence.': 'مقصد کے ساتھ سیکھنا۔ اعتماد کے ساتھ آگے بڑھنا۔',
    'A caring school community committed to strong academic foundations, disciplined character and meaningful progress for every learner.': 'ایک خیال رکھنے والی اسکولی برادری جو ہر طالب علم کے لیے مضبوط تعلیمی بنیاد، باکردار نظم اور بامعنی ترقی کے لیے پُرعزم ہے۔',
    'A school with purpose': 'مقصد رکھنے والا اسکول',
    'Learning that shapes knowledge, character and confidence.': 'ایسی تعلیم جو علم، کردار اور اعتماد کو تشکیل دیتی ہے۔',
    'National High School, Taloda provides a caring and disciplined academic environment where every learner is encouraged to grow with curiosity, responsibility and confidence.': 'نیشنل ہائی اسکول، تلوڈا ایک خیال رکھنے والا اور منظم تعلیمی ماحول فراہم کرتا ہے جہاں ہر طالب علم کو تجسس، ذمہ داری اور اعتماد کے ساتھ آگے بڑھنے کی ترغیب دی جاتی ہے۔',
    'Academic journey': 'تعلیمی سفر',
    'Strong foundations. Thoughtful teaching. Measurable progress.': 'مضبوط بنیادیں۔ بامقصد تدریس۔ قابلِ پیمائش ترقی۔',
    'Learning is supported through connected academic records, multilingual access and continuous guidance.': 'مربوط تعلیمی ریکارڈ، کثیر لسانی رسائی اور مسلسل رہنمائی کے ذریعے سیکھنے کو مضبوط بنایا جاتا ہے۔',
    'From the Headmaster': 'ہیڈ ماسٹر کا پیغام',
    'Every child deserves to be seen, supported and inspired.': 'ہر بچے کو پہچان، تعاون اور حوصلہ ملنا چاہیے۔',
    'Our school community works together to develop capable learners, responsible citizens and confident young people.': 'ہماری اسکولی برادری قابل طلبہ، ذمہ دار شہریوں اور پراعتماد نوجوانوں کی تربیت کے لیے مل کر کام کرتی ہے۔',
    'Campus experience': 'کیمپس تجربہ',
    'Spaces designed for learning and belonging.': 'سیکھنے اور اپنائیت کے لیے بنائی گئی جگہیں۔',
    'The school experience combines academic discipline, student care and digitally connected administration.': 'اسکول کا تجربہ تعلیمی نظم، طالب علم کی دیکھ بھال اور ڈیجیٹل انتظام کو یکجا کرتا ہے۔',
    'School highlights': 'اسکول کی نمایاں خصوصیات',
    'Progress worth celebrating.': 'ایسی ترقی جو قابلِ فخر ہو۔',
    'Latest information': 'تازہ ترین معلومات',
    'Notices and announcements': 'اعلانات اور اطلاعات',
    'School gallery': 'اسکول گیلری',
    'Life at our school': 'ہمارے اسکول کی زندگی',
    'Student responsibility': 'طالب علم کی ذمہ داری',
    'School rules and essential information': 'اسکول کے قواعد اور ضروری معلومات',
    'A safe and respectful campus depends on shared responsibility.': 'محفوظ اور باعزت کیمپس مشترکہ ذمہ داری سے بنتا ہے۔',
    'Connect with us': 'ہم سے رابطہ کریں',
    'Visit, call or write to the school office.': 'اسکول دفتر آئیں، فون کریں یا تحریری رابطہ کریں۔'
  },
  mr: {
    'Admissions Open': 'प्रवेश सुरू',
    'Admissions': 'प्रवेश',
    'Student-centred classroom learning': 'विद्यार्थीकेंद्रित वर्गशिक्षण',
    'Continuous academic guidance': 'सतत शैक्षणिक मार्गदर्शन',
    'Language-inclusive learning support': 'भाषासमावेशक शिक्षण सहाय्य',
    'Safe and disciplined campus': 'सुरक्षित आणि शिस्तबद्ध कॅम्पस',
    'Digital academic workflows': 'डिजिटल शैक्षणिक कार्यप्रवाह',
    'Co-curricular development': 'सहशालेय विकास',
    'Student support and guidance': 'विद्यार्थी सहाय्य आणि मार्गदर्शन',
    'Academic achievement': 'शैक्षणिक यश',
    'Student participation': 'विद्यार्थी सहभाग',
    'Community trust': 'समुदायाचा विश्वास',
    'Welcome to the official National High School digital portal.': 'नॅशनल हायस्कूलच्या अधिकृत डिजिटल पोर्टलवर स्वागत आहे.',
    'Attend school regularly and on time.': 'नियमित आणि वेळेवर शाळेत या.',
    'Respect every member of the school community.': 'शालेय समुदायातील प्रत्येकाचा आदर करा.',
    'Follow the prescribed uniform and conduct standards.': 'निर्धारित गणवेश आणि आचारमानकांचे पालन करा.',
    'Submit a preliminary online application. The school will verify all information before admission is confirmed.': 'प्राथमिक ऑनलाइन अर्ज सादर करा. प्रवेश निश्चित करण्यापूर्वी शाळा सर्व माहिती पडताळेल.',
    'Learning with purpose. Growing with confidence.': 'ध्येयाने शिकणे. आत्मविश्वासाने प्रगती करणे.',
    'A caring school community committed to strong academic foundations, disciplined character and meaningful progress for every learner.': 'प्रत्येक विद्यार्थ्यासाठी मजबूत शैक्षणिक पाया, शिस्तबद्ध चारित्र्य आणि अर्थपूर्ण प्रगतीसाठी वचनबद्ध असलेला संवेदनशील शालेय समुदाय.',
    'A school with purpose': 'ध्येयपूर्ण शाळा',
    'Learning that shapes knowledge, character and confidence.': 'ज्ञान, चारित्र्य आणि आत्मविश्वास घडवणारे शिक्षण.',
    'Academic journey': 'शैक्षणिक प्रवास',
    'Strong foundations. Thoughtful teaching. Measurable progress.': 'मजबूत पाया. विचारपूर्वक अध्यापन. मोजता येणारी प्रगती.',
    'From the Headmaster': 'मुख्याध्यापकांचा संदेश',
    'Every child deserves to be seen, supported and inspired.': 'प्रत्येक मुलाला ओळख, आधार आणि प्रेरणा मिळायला हवी.',
    'Campus experience': 'कॅम्पस अनुभव',
    'Spaces designed for learning and belonging.': 'शिक्षण आणि आपलेपणासाठी तयार केलेल्या जागा.',
    'School highlights': 'शाळेची वैशिष्ट्ये',
    'Progress worth celebrating.': 'अभिमानास्पद प्रगती.',
    'Latest information': 'नवीनतम माहिती',
    'Notices and announcements': 'सूचना आणि घोषणा',
    'School gallery': 'शाळेचे छायाचित्र दालन',
    'Life at our school': 'आमच्या शाळेतील जीवन',
    'Student responsibility': 'विद्यार्थी जबाबदारी',
    'School rules and essential information': 'शाळेचे नियम आणि आवश्यक माहिती',
    'Connect with us': 'आमच्याशी संपर्क साधा',
    'Visit, call or write to the school office.': 'शाळा कार्यालयास भेट द्या, फोन करा किंवा लिहा.'
  }
};

export function localizePublicText(value: unknown, language: Language): string {
  const code = normalizePublicLanguageCode(language);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const map = value as Record<string, unknown>;
    const raw = String(language || 'en').trim().toLowerCase();
    const localized = map[code] ?? map[raw] ?? map.en;
    if (typeof localized === 'string') return localized;
  }
  const text = typeof value === 'string' ? value : '';
  if (!text) return '';
  return knownPhraseTranslations[code]?.[text] || publicPortalCataloguePhrases[code]?.[text] || text;
}
