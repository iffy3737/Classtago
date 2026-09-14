import { Language } from '../types';
import { getPublicPortalCopy } from './publicPortalTranslations';

export type PlatformFeatureCopy = { eyebrow: string; title: string; text: string };

export type PlatformLandingCopy = {
  brandSubtitle: string;
  navPlatform: string; navAdvantages: string; navStudents: string; navFinder: string;
  admin: string; openConsole: string; openPlatformConsole: string; interfaceLanguage: string; toggleNavigation: string;
  heroBadge: string; heroTitleA: string; heroTitleB: string; heroText: string;
  register: string; demo: string; studentPricing: string; studentFree: string;
  unifiedCommand: string; workspacePreview: string; secureCloud: string;
  students: string; attendance: string; classes: string; notices: string;
  smartTimetable: string; wholeSchoolGenerated: string; noClashes: string;
  languageLayer: string; languageLayerText: string;
  stats: Array<[string, string]>;
  whyChoose: string; advantagesTitle: string; advantagesText: string;
  features: PlatformFeatureCopy[];
  promiseEyebrow: string; promiseTitle: string; promiseText: string; promiseBadges: string[];
  identityEyebrow: string; identityTitle: string; identityText: string; identityBenefits: string[];
  yourSchoolName: string; officialDigitalCampus: string; login: string; admissionsOpen: string;
  learnGrowLead: string; schoolBannerText: string; applyOnline: string; viewProspectus: string; achievements: string; contact: string;
  finderTitle: string; finderText: string; finderPlaceholder: string; finderButton: string; noSchool: string; openWebsite: string;
  ctaTitle: string; ctaText: string; footerSubtitle: string; administratorAccess: string;
  onboarding: string; leadTitleRegistration: string; leadTitleDemo: string; leadText: string;
  submitted: string; keepReference: string; close: string;
  institutionName: string; institutionType: string; cityDistrict: string; state: string; authorizedContact: string;
  designation: string; mobile: string; officialEmail: string; approxStudents: string; approxStaff: string;
  modulesInterest: string; additionalRequirements: string; additionalPlaceholder: string; consent: string;
  submitting: string; submitRegistration: string; requestDemo: string;
  requiredError: string; authorizedError: string; requestError: string; directoryError: string;
  moduleLabels: Record<string, string>;
};

type LocaleSeed = {
  platform: string; advantages: string; studentPromise: string; schoolFinder: string; admin: string;
  heroBadge: string; heroTitleA: string; heroTitleB: string; heroText: string; register: string; demo: string;
  studentFree: string; whyChoose: string; advantagesTitle: string; promiseTitle: string; identityTitle: string;
  finderTitle: string; ctaTitle: string; benefitText: string; finderText: string; ctaText: string;
  smartTimetable: string; results: string; roles: string; secureSchools: string;
  staff: string; attendance: string; fees: string; payroll: string;
  command: string; wholeSchool: string; noClashes: string;
};

const aliases: Record<string, string> = {
  asm: 'as', ben: 'bn', bod: 'brx', dgo: 'doi', guj: 'gu', kan: 'kn', kas: 'ks',
  kok: 'gom', mar: 'mr', mal: 'ml', nep: 'ne', ori: 'or', od: 'or', pan: 'pa', pun: 'pa',
  san: 'sa', snd: 'sd', tam: 'ta', tel: 'te', urd: 'ur', hin: 'hi', eng: 'en'
};

function codeOf(language: Language): string {
  const raw = String(language || 'en').trim().toLowerCase().replace('_', '-');
  const base = raw.split('-')[0] || 'en';
  return aliases[raw] || aliases[base] || base;
}

const seeds: Record<string, LocaleSeed> = {
  en: {
    platform:'Platform', advantages:'Advantages', studentPromise:'Student Promise', schoolFinder:'School Finder', admin:'Platform Admin',
    heroBadge:'Built for Indian schools and every local language', heroTitleA:'Run your entire school from', heroTitleB:'one intelligent platform.',
    heroText:'Admissions, students, staff, attendance, timetable, results, communication and public school websites—securely connected in one multilingual cloud ERP.',
    register:'Register Your Institution', demo:'Book a Live Demo', studentFree:'Schools subscribe. Students access every enabled student module free—from confirmed admission until leaving.',
    whyChoose:'Why schools choose EDUNIXO', advantagesTitle:'Not another collection of forms. A connected school operating system.',
    promiseTitle:'Free for every active student, throughout the school journey.', identityTitle:'Your school website and ERP entrance—together, but unmistakably yours.',
    finderTitle:'Find your school portal', ctaTitle:'Ready to replace scattered school work with one connected operating platform?',
    benefitText:'Fast, multilingual and securely connected workflows designed for real school operations.',
    finderText:'Enter the school name or official EDUNIXO school code.', ctaText:'Every institution is verified before its secure workspace is created.',
    smartTimetable:'Smart Timetable', results:'Government-ready Results', roles:'Role-based Experience', secureSchools:'Secure Multi-school Cloud',
    staff:'Staff Management', attendance:'Attendance', fees:'Fees', payroll:'Payroll', command:'Unified School Command', wholeSchool:'Whole school generated', noClashes:'0 teacher clashes detected'
  },
  hi: {
    platform:'प्लेटफ़ॉर्म', advantages:'विशेषताएँ', studentPromise:'विद्यार्थी वादा', schoolFinder:'स्कूल खोजें', admin:'प्लेटफ़ॉर्म एडमिन',
    heroBadge:'भारतीय स्कूलों और हर स्थानीय भाषा के लिए निर्मित', heroTitleA:'अपने पूरे स्कूल को चलाएँ', heroTitleB:'एक बुद्धिमान प्लेटफ़ॉर्म से।',
    heroText:'प्रवेश, विद्यार्थी, कर्मचारी, उपस्थिति, समय-सारणी, परिणाम, संवाद और स्कूल वेबसाइट—एक सुरक्षित बहुभाषी क्लाउड ERP में जुड़े हुए।',
    register:'अपनी संस्था पंजीकृत करें', demo:'लाइव डेमो बुक करें', studentFree:'सदस्यता स्कूल लेता है। प्रवेश से लीविंग तक विद्यार्थियों के सभी सक्रिय मॉड्यूल निःशुल्क रहते हैं।',
    whyChoose:'स्कूल EDUNIXO क्यों चुनते हैं', advantagesTitle:'केवल फॉर्मों का संग्रह नहीं—एक जुड़ा हुआ स्कूल संचालन तंत्र।',
    promiseTitle:'स्कूल यात्रा के दौरान हर सक्रिय विद्यार्थी के लिए निःशुल्क।', identityTitle:'आपकी स्कूल वेबसाइट और ERP प्रवेश—एक साथ, पर पूरी तरह आपकी पहचान के साथ।',
    finderTitle:'अपना स्कूल पोर्टल खोजें', ctaTitle:'बिखरे स्कूल कार्य को एक जुड़े प्लेटफ़ॉर्म में बदलने के लिए तैयार हैं?',
    benefitText:'वास्तविक स्कूल कार्यों के लिए तेज़, बहुभाषी और सुरक्षित रूप से जुड़े समाधान।', finderText:'स्कूल का नाम या आधिकारिक EDUNIXO स्कूल कोड दर्ज करें।', ctaText:'सुरक्षित कार्यक्षेत्र बनाने से पहले हर संस्था का सत्यापन किया जाता है।',
    smartTimetable:'स्मार्ट समय-सारणी', results:'सरकारी नियमों के अनुरूप परिणाम', roles:'भूमिका आधारित अनुभव', secureSchools:'सुरक्षित बहु-स्कूल क्लाउड',
    staff:'कर्मचारी प्रबंधन', attendance:'उपस्थिति', fees:'शुल्क', payroll:'वेतन प्रबंधन', command:'एकीकृत स्कूल कमांड', wholeSchool:'पूरे स्कूल की समय-सारणी तैयार', noClashes:'शिक्षक टकराव: 0'
  },
  ur: {
    platform:'پلیٹ فارم', advantages:'خصوصیات', studentPromise:'طلبہ کا وعدہ', schoolFinder:'اسکول تلاش کریں', admin:'پلیٹ فارم ایڈمن',
    heroBadge:'ہندوستانی اسکولوں اور ہر مقامی زبان کے لیے تیار کردہ', heroTitleA:'اپنے پورے اسکول کو چلائیں', heroTitleB:'ایک ذہین پلیٹ فارم سے۔',
    heroText:'داخلہ، طلبہ، اسٹاف، حاضری، ٹائم ٹیبل، نتائج، رابطہ اور اسکول ویب سائٹ—ایک محفوظ کثیر لسانی کلاؤڈ ERP میں مربوط۔',
    register:'اپنا ادارہ رجسٹر کریں', demo:'لائیو ڈیمو بک کریں', studentFree:'سبسکرپشن اسکول لیتا ہے۔ داخلہ سے لیونگ تک طلبہ کے تمام فعال ماڈیول مفت رہتے ہیں۔',
    whyChoose:'اسکول EDUNIXO کیوں منتخب کرتے ہیں', advantagesTitle:'صرف فارموں کا مجموعہ نہیں—ایک مربوط اسکول آپریٹنگ سسٹم۔',
    promiseTitle:'اسکولی سفر کے دوران ہر فعال طالب علم کے لیے مفت۔', identityTitle:'آپ کی اسکول ویب سائٹ اور ERP داخلہ—ایک ساتھ، مگر مکمل طور پر آپ کی شناخت کے ساتھ۔',
    finderTitle:'اپنا اسکول پورٹل تلاش کریں', ctaTitle:'بکھرے ہوئے اسکولی کام کو ایک مربوط پلیٹ فارم میں لانے کے لیے تیار ہیں؟',
    benefitText:'حقیقی اسکولی کام کے لیے تیز، کثیر لسانی اور محفوظ طور پر مربوط نظام۔', finderText:'اسکول کا نام یا سرکاری EDUNIXO اسکول کوڈ درج کریں۔', ctaText:'محفوظ ورک اسپیس بنانے سے پہلے ہر ادارے کی تصدیق کی جاتی ہے۔',
    smartTimetable:'اسمارٹ ٹائم ٹیبل', results:'سرکاری قواعد کے مطابق نتائج', roles:'کردار کے مطابق تجربہ', secureSchools:'محفوظ ملٹی اسکول کلاؤڈ',
    staff:'اسٹاف مینجمنٹ', attendance:'حاضری', fees:'فیس', payroll:'پے رول', command:'متحدہ اسکول کمانڈ', wholeSchool:'پورے اسکول کا ٹائم ٹیبل تیار', noClashes:'اساتذہ کا ٹکراؤ: 0'
  },
  bn: {
    platform:'প্ল্যাটফর্ম', advantages:'সুবিধাসমূহ', studentPromise:'শিক্ষার্থী প্রতিশ্রুতি', schoolFinder:'স্কুল খুঁজুন', admin:'প্ল্যাটফর্ম অ্যাডমিন',
    heroBadge:'ভারতীয় স্কুল ও প্রতিটি স্থানীয় ভাষার জন্য নির্মিত', heroTitleA:'আপনার পুরো স্কুল পরিচালনা করুন', heroTitleB:'একটি বুদ্ধিমান প্ল্যাটফর্মে।',
    heroText:'ভর্তি, শিক্ষার্থী, কর্মী, উপস্থিতি, সময়সূচি, ফলাফল, যোগাযোগ ও স্কুল ওয়েবসাইট—এক নিরাপদ বহুভাষিক ক্লাউড ERP-তে সংযুক্ত।',
    register:'আপনার প্রতিষ্ঠান নিবন্ধন করুন', demo:'লাইভ ডেমো বুক করুন', studentFree:'সাবস্ক্রিপশন নেয় স্কুল। ভর্তি থেকে বিদায় পর্যন্ত শিক্ষার্থীর সব সক্রিয় মডিউল বিনামূল্যে।',
    whyChoose:'স্কুল কেন EDUNIXO বেছে নেয়', advantagesTitle:'শুধু ফর্মের সংগ্রহ নয়—একটি সংযুক্ত স্কুল পরিচালন ব্যবস্থা।',
    promiseTitle:'স্কুলজীবন জুড়ে প্রতিটি সক্রিয় শিক্ষার্থীর জন্য বিনামূল্যে।', identityTitle:'আপনার স্কুল ওয়েবসাইট ও ERP প্রবেশদ্বার—একসঙ্গে, কিন্তু সম্পূর্ণ আপনার পরিচয়ে।',
    finderTitle:'আপনার স্কুল পোর্টাল খুঁজুন', ctaTitle:'বিক্ষিপ্ত স্কুল কাজকে একটি সংযুক্ত প্ল্যাটফর্মে আনতে প্রস্তুত?',
    benefitText:'বাস্তব স্কুল কাজের জন্য দ্রুত, বহুভাষিক ও নিরাপদ সংযুক্ত ব্যবস্থা।', finderText:'স্কুলের নাম বা অফিসিয়াল EDUNIXO কোড লিখুন।', ctaText:'নিরাপদ কর্মক্ষেত্র তৈরির আগে প্রতিটি প্রতিষ্ঠান যাচাই করা হয়।',
    smartTimetable:'স্মার্ট সময়সূচি', results:'সরকারি নিয়মভিত্তিক ফলাফল', roles:'ভূমিকাভিত্তিক অভিজ্ঞতা', secureSchools:'নিরাপদ বহু-স্কুল ক্লাউড',
    staff:'কর্মী ব্যবস্থাপনা', attendance:'উপস্থিতি', fees:'ফি', payroll:'বেতন ব্যবস্থাপনা', command:'সমন্বিত স্কুল কমান্ড', wholeSchool:'পুরো স্কুলের সময়সূচি তৈরি', noClashes:'শিক্ষক সংঘর্ষ: ০'
  },
  mr: {
    platform:'प्लॅटफॉर्म', advantages:'वैशिष्ट्ये', studentPromise:'विद्यार्थी वचन', schoolFinder:'शाळा शोधा', admin:'प्लॅटफॉर्म प्रशासक',
    heroBadge:'भारतीय शाळा आणि प्रत्येक स्थानिक भाषेसाठी तयार', heroTitleA:'संपूर्ण शाळा चालवा', heroTitleB:'एका बुद्धिमान प्लॅटफॉर्मवरून।',
    heroText:'प्रवेश, विद्यार्थी, कर्मचारी, उपस्थिती, वेळापत्रक, निकाल, संवाद आणि शाळेचे संकेतस्थळ—एका सुरक्षित बहुभाषिक क्लाउड ERP मध्ये जोडलेले।',
    register:'आपली संस्था नोंदवा', demo:'थेट डेमो बुक करा', studentFree:'सदस्यता शाळा घेते. प्रवेशापासून लीव्हिंगपर्यंत विद्यार्थ्यांचे सर्व सक्रिय मॉड्यूल मोफत राहतात।',
    whyChoose:'शाळा EDUNIXO का निवडतात', advantagesTitle:'फॉर्मचा संच नव्हे—एक जोडलेली शाळा संचालन प्रणाली।', promiseTitle:'संपूर्ण शालेय प्रवासात प्रत्येक सक्रिय विद्यार्थ्यासाठी मोफत।', identityTitle:'आपले शाळा संकेतस्थळ आणि ERP प्रवेश—एकत्र, पण पूर्णपणे आपल्या ओळखीत।',
    finderTitle:'आपले शाळा पोर्टल शोधा', ctaTitle:'विखुरलेले शालेय काम एका जोडलेल्या प्लॅटफॉर्मवर आणण्यासाठी तयार आहात?', benefitText:'खऱ्या शालेय कामांसाठी जलद, बहुभाषिक आणि सुरक्षित जोडलेले उपाय।', finderText:'शाळेचे नाव किंवा अधिकृत EDUNIXO कोड लिहा।', ctaText:'सुरक्षित कार्यक्षेत्र तयार करण्यापूर्वी प्रत्येक संस्थेची पडताळणी होते।',
    smartTimetable:'स्मार्ट वेळापत्रक', results:'शासकीय नियमांनुसार निकाल', roles:'भूमिकानुसार अनुभव', secureSchools:'सुरक्षित बहु-शाळा क्लाउड', staff:'कर्मचारी व्यवस्थापन', attendance:'उपस्थिती', fees:'शुल्क', payroll:'वेतन', command:'एकत्रित शाळा कमांड', wholeSchool:'संपूर्ण शाळेचे वेळापत्रक तयार', noClashes:'शिक्षक संघर्ष: ०'
  },
  gu: {
    platform:'પ્લેટફોર્મ', advantages:'લાભો', studentPromise:'વિદ્યાર્થી વચન', schoolFinder:'શાળા શોધો', admin:'પ્લેટફોર્મ એડમિન', heroBadge:'ભારતીય શાળાઓ અને દરેક સ્થાનિક ભાષા માટે બનાવેલ', heroTitleA:'તમારી સંપૂર્ણ શાળા ચલાવો', heroTitleB:'એક બુદ્ધિશાળી પ્લેટફોર્મથી।', heroText:'પ્રવેશ, વિદ્યાર્થીઓ, સ્ટાફ, હાજરી, સમયપત્રક, પરિણામ, સંચાર અને શાળા વેબસાઇટ—એક સુરક્ષિત બહુભાષી ક્લાઉડ ERPમાં જોડાયેલ।', register:'તમારી સંસ્થા નોંધાવો', demo:'લાઇવ ડેમો બુક કરો', studentFree:'સબ્સ્ક્રિપ્શન શાળા લે છે. પ્રવેશથી લીવિંગ સુધી વિદ્યાર્થીઓના બધા સક્રિય મોડ્યુલ મફત।', whyChoose:'શાળાઓ EDUNIXO કેમ પસંદ કરે છે', advantagesTitle:'માત્ર ફોર્મનો સમૂહ નહીં—જોડાયેલ શાળા સંચાલન પ્રણાલી।', promiseTitle:'શાળા પ્રવાસ દરમિયાન દરેક સક્રિય વિદ્યાર્થી માટે મફત।', identityTitle:'તમારી શાળા વેબસાઇટ અને ERP પ્રવેશ—સાથે, છતાં સંપૂર્ણ તમારી ઓળખમાં।', finderTitle:'તમારું શાળા પોર્ટલ શોધો', ctaTitle:'વિખરાયેલા શાળા કામને એક જોડાયેલા પ્લેટફોર્મ પર લાવવા તૈયાર છો?', benefitText:'વાસ્તવિક શાળા કાર્ય માટે ઝડપી, બહુભાષી અને સુરક્ષિત જોડાયેલ વ્યવસ્થા।', finderText:'શાળાનું નામ અથવા અધિકૃત EDUNIXO કોડ દાખલ કરો।', ctaText:'સુરક્ષિત કાર્યક્ષેત્ર પહેલાં દરેક સંસ્થાની ચકાસણી થાય છે।', smartTimetable:'સ્માર્ટ સમયપત્રક', results:'સરકારી નિયમ આધારિત પરિણામ', roles:'ભૂમિકા આધારિત અનુભવ', secureSchools:'સુરક્ષિત બહુ-શાળા ક્લાઉડ', staff:'સ્ટાફ મેનેજમેન્ટ', attendance:'હાજરી', fees:'ફી', payroll:'પગાર વ્યવસ્થાપન', command:'એકત્રીત શાળા કમાન્ડ', wholeSchool:'સંપૂર્ણ શાળાનું સમયપત્રક તૈયાર', noClashes:'શિક્ષક ટકરાવ: ૦'
  },
  ta: {
    platform:'தளம்', advantages:'சிறப்புகள்', studentPromise:'மாணவர் உறுதி', schoolFinder:'பள்ளியைத் தேடுங்கள்', admin:'தள நிர்வாகி', heroBadge:'இந்தியப் பள்ளிகளுக்கும் ஒவ்வொரு உள்ளூர் மொழிக்கும் உருவாக்கப்பட்டது', heroTitleA:'உங்கள் முழுப் பள்ளியையும் இயக்குங்கள்', heroTitleB:'ஒரே புத்திசாலி தளத்தில்।', heroText:'சேர்க்கை, மாணவர்கள், பணியாளர்கள், வருகை, கால அட்டவணை, முடிவுகள், தொடர்பு மற்றும் பள்ளி இணையதளம்—ஒரே பாதுகாப்பான பன்மொழி கிளவுட் ERP-ல் இணைக்கப்பட்டவை।', register:'உங்கள் நிறுவனத்தை பதிவு செய்யுங்கள்', demo:'நேரடி டெமோ பதிவு', studentFree:'சந்தாவை பள்ளி செலுத்தும். சேர்க்கை முதல் வெளியேறும் வரை மாணவர் மாட்யூல்கள் அனைத்தும் இலவசம்।', whyChoose:'பள்ளிகள் EDUNIXO-வை ஏன் தேர்வு செய்கின்றன', advantagesTitle:'படிவங்களின் தொகுப்பு அல்ல—இணைந்த பள்ளி இயக்க அமைப்பு।', promiseTitle:'பள்ளிப் பயணம் முழுவதும் ஒவ்வொரு செயலில் உள்ள மாணவருக்கும் இலவசம்।', identityTitle:'உங்கள் பள்ளி இணையதளம் மற்றும் ERP நுழைவு—ஒன்றாக, ஆனால் முழுமையாக உங்கள் அடையாளத்தில்।', finderTitle:'உங்கள் பள்ளி போர்டலைத் தேடுங்கள்', ctaTitle:'சிதறிய பள்ளிப் பணிகளை ஒரே இணைந்த தளத்தில் கொண்டு வர தயாரா?', benefitText:'உண்மையான பள்ளிப் பணிக்கான வேகமான, பன்மொழி மற்றும் பாதுகாப்பான இணைப்பு।', finderText:'பள்ளிப் பெயர் அல்லது அதிகாரப்பூர்வ EDUNIXO குறியீட்டை உள்ளிடுங்கள்।', ctaText:'பாதுகாப்பான பணியிடம் உருவாகும் முன் ஒவ்வொரு நிறுவனமும் சரிபார்க்கப்படும்।', smartTimetable:'ஸ்மார்ட் கால அட்டவணை', results:'அரசு விதி சார்ந்த முடிவுகள்', roles:'பங்கு அடிப்படையிலான அனுபவம்', secureSchools:'பாதுகாப்பான பல்பள்ளி கிளவுட்', staff:'பணியாளர் மேலாண்மை', attendance:'வருகை', fees:'கட்டணம்', payroll:'ஊதியம்', command:'ஒருங்கிணைந்த பள்ளி கட்டுப்பாடு', wholeSchool:'முழுப் பள்ளி கால அட்டவணை உருவானது', noClashes:'ஆசிரியர் மோதல்: 0'
  },
  te: {
    platform:'ప్లాట్‌ఫారం', advantages:'ప్రయోజనాలు', studentPromise:'విద్యార్థి హామీ', schoolFinder:'పాఠశాల వెతకండి', admin:'ప్లాట్‌ఫారం అడ్మిన్', heroBadge:'భారతీయ పాఠశాలలు మరియు ప్రతి స్థానిక భాష కోసం రూపొందించబడింది', heroTitleA:'మీ మొత్తం పాఠశాలను నడపండి', heroTitleB:'ఒక తెలివైన ప్లాట్‌ఫారం నుంచి।', heroText:'ప్రవేశాలు, విద్యార్థులు, సిబ్బంది, హాజరు, టైమ్‌టేబుల్, ఫలితాలు, కమ్యూనికేషన్ మరియు పాఠశాల వెబ్‌సైట్—ఒక సురక్షిత బహుభాషా క్లౌడ్ ERPలో అనుసంధానం।', register:'మీ సంస్థను నమోదు చేయండి', demo:'లైవ్ డెమో బుక్ చేయండి', studentFree:'సబ్‌స్క్రిప్షన్ పాఠశాల తీసుకుంటుంది. ప్రవేశం నుంచి లీవింగ్ వరకు విద్యార్థి మాడ్యూల్స్ ఉచితం।', whyChoose:'పాఠశాలలు EDUNIXOను ఎందుకు ఎంచుకుంటాయి', advantagesTitle:'ఫారమ్‌ల సమాహారం కాదు—అనుసంధానమైన పాఠశాల నిర్వహణ వ్యవస్థ।', promiseTitle:'పాఠశాల ప్రయాణమంతా ప్రతి సక్రియ విద్యార్థికి ఉచితం।', identityTitle:'మీ పాఠశాల వెబ్‌సైట్ మరియు ERP ప్రవేశం—కలిసి, కానీ పూర్తిగా మీ గుర్తింపుతో।', finderTitle:'మీ పాఠశాల పోర్టల్‌ను వెతకండి', ctaTitle:'చెల్లాచెదురైన పాఠశాల పనిని ఒక అనుసంధాన ప్లాట్‌ఫారంలోకి తీసుకురావడానికి సిద్ధమా?', benefitText:'నిజమైన పాఠశాల పనికి వేగవంతమైన, బహుభాషా మరియు సురక్షిత అనుసంధానం।', finderText:'పాఠశాల పేరు లేదా అధికారిక EDUNIXO కోడ్ నమోదు చేయండి।', ctaText:'సురక్షిత వర్క్‌స్పేస్‌కు ముందు ప్రతి సంస్థ ధృవీకరించబడుతుంది।', smartTimetable:'స్మార్ట్ టైమ్‌టేబుల్', results:'ప్రభుత్వ నియమాల ఫలితాలు', roles:'పాత్ర ఆధారిత అనుభవం', secureSchools:'సురక్షిత బహుళ పాఠశాల క్లౌడ్', staff:'సిబ్బంది నిర్వహణ', attendance:'హాజరు', fees:'ఫీజులు', payroll:'పేరోల్', command:'ఏకీకృత పాఠశాల కమాండ్', wholeSchool:'మొత్తం పాఠశాల టైమ్‌టేబుల్ సిద్ధం', noClashes:'ఉపాధ్యాయ ఘర్షణలు: 0'
  },
  kn: {
    platform:'ವೇದಿಕೆ', advantages:'ಪ್ರಯೋಜನಗಳು', studentPromise:'ವಿದ್ಯಾರ್ಥಿ ಭರವಸೆ', schoolFinder:'ಶಾಲೆ ಹುಡುಕಿ', admin:'ವೇದಿಕೆ ನಿರ್ವಾಹಕ', heroBadge:'ಭಾರತೀಯ ಶಾಲೆಗಳು ಮತ್ತು ಪ್ರತಿಯೊಂದು ಸ್ಥಳೀಯ ಭಾಷೆಗೆ ನಿರ್ಮಿತ', heroTitleA:'ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಶಾಲೆಯನ್ನು ನಡೆಸಿ', heroTitleB:'ಒಂದು ಬುದ್ಧಿವಂತ ವೇದಿಕೆಯಿಂದ।', heroText:'ಪ್ರವೇಶ, ವಿದ್ಯಾರ್ಥಿಗಳು, ಸಿಬ್ಬಂದಿ, ಹಾಜರಾತಿ, ವೇಳಾಪಟ್ಟಿ, ಫಲಿತಾಂಶ, ಸಂವಹನ ಮತ್ತು ಶಾಲಾ ವೆಬ್‌ಸೈಟ್—ಒಂದು ಸುರಕ್ಷಿತ ಬಹುಭಾಷಾ ಕ್ಲೌಡ್ ERPನಲ್ಲಿ ಸಂಪರ್ಕಿತ।', register:'ನಿಮ್ಮ ಸಂಸ್ಥೆಯನ್ನು ನೋಂದಾಯಿಸಿ', demo:'ಲೈವ್ ಡೆಮೊ ಬುಕ್ ಮಾಡಿ', studentFree:'ಚಂದಾದಾರಿಕೆಯನ್ನು ಶಾಲೆ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ. ಪ್ರವೇಶದಿಂದ ನಿರ್ಗಮನದವರೆಗೆ ವಿದ್ಯಾರ್ಥಿ ಘಟಕಗಳು ಉಚಿತ।', whyChoose:'ಶಾಲೆಗಳು EDUNIXO ಅನ್ನು ಏಕೆ ಆಯ್ಕೆಮಾಡುತ್ತವೆ', advantagesTitle:'ಫಾರ್ಮ್‌ಗಳ ಗುಚ್ಛವಲ್ಲ—ಸಂಪರ್ಕಿತ ಶಾಲಾ ಕಾರ್ಯಾಚರಣೆ ವ್ಯವಸ್ಥೆ।', promiseTitle:'ಶಾಲಾ ಪ್ರಯಾಣದವರೆಗೆ ಪ್ರತಿಯೊಬ್ಬ ಸಕ್ರಿಯ ವಿದ್ಯಾರ್ಥಿಗೂ ಉಚಿತ।', identityTitle:'ನಿಮ್ಮ ಶಾಲಾ ವೆಬ್‌ಸೈಟ್ ಮತ್ತು ERP ಪ್ರವೇಶ—ಒಟ್ಟಿಗೆ, ಆದರೆ ನಿಮ್ಮದೇ ಗುರುತಿನಲ್ಲಿ।', finderTitle:'ನಿಮ್ಮ ಶಾಲಾ ಪೋರ್ಟಲ್ ಹುಡುಕಿ', ctaTitle:'ಚದುರಿದ ಶಾಲಾ ಕೆಲಸವನ್ನು ಒಂದೇ ವೇದಿಕೆಗೆ ತರಲು ಸಿದ್ಧವೇ?', benefitText:'ನೈಜ ಶಾಲಾ ಕಾರ್ಯಗಳಿಗೆ ವೇಗವಾದ, ಬಹುಭಾಷಾ ಮತ್ತು ಸುರಕ್ಷಿತ ಸಂಪರ್ಕ।', finderText:'ಶಾಲೆಯ ಹೆಸರು ಅಥವಾ ಅಧಿಕೃತ EDUNIXO ಕೋಡ್ ನಮೂದಿಸಿ।', ctaText:'ಸುರಕ್ಷಿತ ಕಾರ್ಯಕ್ಷೇತ್ರಕ್ಕೂ ಮುನ್ನ ಪ್ರತಿಯೊಂದು ಸಂಸ್ಥೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ।', smartTimetable:'ಸ್ಮಾರ್ಟ್ ವೇಳಾಪಟ್ಟಿ', results:'ಸರ್ಕಾರಿ ನಿಯಮಾಧಾರಿತ ಫಲಿತಾಂಶ', roles:'ಪಾತ್ರಾಧಾರಿತ ಅನುಭವ', secureSchools:'ಸುರಕ್ಷಿತ ಬಹು-ಶಾಲಾ ಕ್ಲೌಡ್', staff:'ಸಿಬ್ಬಂದಿ ನಿರ್ವಹಣೆ', attendance:'ಹಾಜರಾತಿ', fees:'ಶುಲ್ಕ', payroll:'ವೇತನ', command:'ಏಕೀಕೃತ ಶಾಲಾ ಕಮಾಂಡ್', wholeSchool:'ಸಂಪೂರ್ಣ ಶಾಲಾ ವೇಳಾಪಟ್ಟಿ ಸಿದ್ಧ', noClashes:'ಶಿಕ್ಷಕರ ಘರ್ಷಣೆ: 0'
  },
  ml: {
    platform:'പ്ലാറ്റ്ഫോം', advantages:'പ്രയോജനങ്ങൾ', studentPromise:'വിദ്യാർത്ഥി വാഗ്ദാനം', schoolFinder:'സ്കൂൾ കണ്ടെത്തുക', admin:'പ്ലാറ്റ്ഫോം അഡ്മിൻ', heroBadge:'ഇന്ത്യൻ സ്കൂളുകൾക്കും എല്ലാ പ്രാദേശിക ഭാഷകൾക്കും വേണ്ടി നിർമ്മിച്ചത്', heroTitleA:'നിങ്ങളുടെ മുഴുവൻ സ്കൂളും നടത്തൂ', heroTitleB:'ഒരൊറ്റ ബുദ്ധിമാനായ പ്ലാറ്റ്ഫോമിൽ നിന്ന്।', heroText:'പ്രവേശനം, വിദ്യാർത്ഥികൾ, സ്റ്റാഫ്, ഹാജർ, ടൈംടേബിൾ, ഫലം, ആശയവിനിമയം, സ്കൂൾ വെബ്സൈറ്റ്—ഒരു സുരക്ഷിത ബഹുഭാഷാ ക്ലൗഡ് ERPയിൽ ബന്ധിപ്പിച്ചിരിക്കുന്നു।', register:'നിങ്ങളുടെ സ്ഥാപനം രജിസ്റ്റർ ചെയ്യുക', demo:'ലൈവ് ഡെമോ ബുക്ക് ചെയ്യുക', studentFree:'സബ്സ്ക്രിപ്ഷൻ സ്കൂൾ എടുക്കുന്നു. പ്രവേശനം മുതൽ വിടുതൽ വരെ വിദ്യാർത്ഥി മോഡ്യൂളുകൾ സൗജന്യം।', whyChoose:'സ്കൂളുകൾ EDUNIXO തിരഞ്ഞെടുക്കുന്നത് എന്തുകൊണ്ട്', advantagesTitle:'ഫോമുകളുടെ കൂട്ടമല്ല—ബന്ധിപ്പിച്ച സ്കൂൾ ഓപ്പറേറ്റിംഗ് സിസ്റ്റം।', promiseTitle:'സ്കൂൾ യാത്ര മുഴുവൻ ഓരോ സജീവ വിദ്യാർത്ഥിക്കും സൗജന്യം।', identityTitle:'നിങ്ങളുടെ സ്കൂൾ വെബ്സൈറ്റും ERP പ്രവേശനവും—ഒരുമിച്ച്, എന്നാൽ പൂർണമായി നിങ്ങളുടെ തിരിച്ചറിയലിൽ।', finderTitle:'നിങ്ങളുടെ സ്കൂൾ പോർട്ടൽ കണ്ടെത്തുക', ctaTitle:'ചിതറിക്കിടക്കുന്ന സ്കൂൾ ജോലികളെ ഒരൊറ്റ പ്ലാറ്റ്ഫോമിലേക്ക് കൊണ്ടുവരാൻ തയ്യാറാണോ?', benefitText:'യഥാർത്ഥ സ്കൂൾ ജോലികൾക്കായി വേഗമുള്ള, ബഹുഭാഷാ, സുരക്ഷിത ബന്ധം।', finderText:'സ്കൂൾ പേര് അല്ലെങ്കിൽ ഔദ്യോഗിക EDUNIXO കോഡ് നൽകുക।', ctaText:'സുരക്ഷിത വർക്ക്‌സ്‌പേസിനു മുമ്പ് ഓരോ സ്ഥാപനവും പരിശോധിക്കും।', smartTimetable:'സ്മാർട്ട് ടൈംടേബിൾ', results:'സർക്കാർ നിയമാനുസൃത ഫലങ്ങൾ', roles:'റോൾ അടിസ്ഥാന അനുഭവം', secureSchools:'സുരക്ഷിത മൾട്ടി-സ്കൂൾ ക്ലൗഡ്', staff:'സ്റ്റാഫ് മാനേജ്മെന്റ്', attendance:'ഹാജർ', fees:'ഫീസ്', payroll:'പേറോൾ', command:'ഏകീകൃത സ്കൂൾ കമാൻഡ്', wholeSchool:'മുഴുവൻ സ്കൂൾ ടൈംടേബിൾ തയ്യാറായി', noClashes:'അധ്യാപക സംഘർഷം: 0'
  },
  pa: {
    platform:'ਪਲੇਟਫਾਰਮ', advantages:'ਫਾਇਦੇ', studentPromise:'ਵਿਦਿਆਰਥੀ ਵਾਅਦਾ', schoolFinder:'ਸਕੂਲ ਲੱਭੋ', admin:'ਪਲੇਟਫਾਰਮ ਐਡਮਿਨ', heroBadge:'ਭਾਰਤੀ ਸਕੂਲਾਂ ਅਤੇ ਹਰ ਸਥਾਨਕ ਭਾਸ਼ਾ ਲਈ ਬਣਾਇਆ', heroTitleA:'ਆਪਣਾ ਪੂਰਾ ਸਕੂਲ ਚਲਾਓ', heroTitleB:'ਇੱਕ ਸਮਝਦਾਰ ਪਲੇਟਫਾਰਮ ਤੋਂ।', heroText:'ਦਾਖਲਾ, ਵਿਦਿਆਰਥੀ, ਸਟਾਫ, ਹਾਜ਼ਰੀ, ਸਮਾਂ-ਸਾਰਣੀ, ਨਤੀਜੇ, ਸੰਚਾਰ ਅਤੇ ਸਕੂਲ ਵੈੱਬਸਾਈਟ—ਇੱਕ ਸੁਰੱਖਿਅਤ ਬਹੁਭਾਸ਼ੀ ਕਲਾਉਡ ERP ਵਿੱਚ ਜੁੜੇ।', register:'ਆਪਣੀ ਸੰਸਥਾ ਰਜਿਸਟਰ ਕਰੋ', demo:'ਲਾਈਵ ਡੈਮੋ ਬੁੱਕ ਕਰੋ', studentFree:'ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਸਕੂਲ ਲੈਂਦਾ ਹੈ। ਦਾਖਲੇ ਤੋਂ ਲੀਵਿੰਗ ਤੱਕ ਵਿਦਿਆਰਥੀ ਮੋਡੀਊਲ ਮੁਫ਼ਤ।', whyChoose:'ਸਕੂਲ EDUNIXO ਕਿਉਂ ਚੁਣਦੇ ਹਨ', advantagesTitle:'ਸਿਰਫ਼ ਫਾਰਮਾਂ ਦਾ ਸਮੂਹ ਨਹੀਂ—ਇੱਕ ਜੁੜਿਆ ਸਕੂਲ ਓਪਰੇਟਿੰਗ ਸਿਸਟਮ।', promiseTitle:'ਸਕੂਲੀ ਯਾਤਰਾ ਦੌਰਾਨ ਹਰ ਸਰਗਰਮ ਵਿਦਿਆਰਥੀ ਲਈ ਮੁਫ਼ਤ।', identityTitle:'ਤੁਹਾਡੀ ਸਕੂਲ ਵੈੱਬਸਾਈਟ ਅਤੇ ERP ਦਾਖਲਾ—ਇਕੱਠੇ, ਪਰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਤੁਹਾਡੀ ਪਛਾਣ ਵਿੱਚ।', finderTitle:'ਆਪਣਾ ਸਕੂਲ ਪੋਰਟਲ ਲੱਭੋ', ctaTitle:'ਵਿਖਰੇ ਸਕੂਲੀ ਕੰਮ ਨੂੰ ਇੱਕ ਜੁੜੇ ਪਲੇਟਫਾਰਮ ਤੇ ਲਿਆਉਣ ਲਈ ਤਿਆਰ?', benefitText:'ਅਸਲ ਸਕੂਲੀ ਕੰਮ ਲਈ ਤੇਜ਼, ਬਹੁਭਾਸ਼ੀ ਅਤੇ ਸੁਰੱਖਿਅਤ ਜੁੜਾਵ।', finderText:'ਸਕੂਲ ਦਾ ਨਾਮ ਜਾਂ ਅਧਿਕਾਰਤ EDUNIXO ਕੋਡ ਦਿਓ।', ctaText:'ਸੁਰੱਖਿਅਤ ਵਰਕਸਪੇਸ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਸੰਸਥਾ ਦੀ ਜਾਂਚ ਹੁੰਦੀ ਹੈ।', smartTimetable:'ਸਮਾਰਟ ਸਮਾਂ-ਸਾਰਣੀ', results:'ਸਰਕਾਰੀ ਨਿਯਮ ਅਧਾਰਤ ਨਤੀਜੇ', roles:'ਭੂਮਿਕਾ ਅਧਾਰਤ ਅਨੁਭਵ', secureSchools:'ਸੁਰੱਖਿਅਤ ਬਹੁ-ਸਕੂਲ ਕਲਾਉਡ', staff:'ਸਟਾਫ ਪ੍ਰਬੰਧਨ', attendance:'ਹਾਜ਼ਰੀ', fees:'ਫੀਸ', payroll:'ਤਨਖਾਹ', command:'ਇਕਜੁੱਟ ਸਕੂਲ ਕਮਾਂਡ', wholeSchool:'ਪੂਰੇ ਸਕੂਲ ਦੀ ਸਮਾਂ-ਸਾਰਣੀ ਤਿਆਰ', noClashes:'ਅਧਿਆਪਕ ਟਕਰਾਅ: 0'
  },
  as: {
    platform:'প্লেটফৰ্ম', advantages:'সুবিধাসমূহ', studentPromise:'শিক্ষাৰ্থী প্ৰতিশ্ৰুতি', schoolFinder:'বিদ্যালয় বিচাৰক', admin:'প্লেটফৰ্ম প্ৰশাসক', heroBadge:'ভাৰতীয় বিদ্যালয় আৰু প্ৰতিটো স্থানীয় ভাষাৰ বাবে নিৰ্মিত', heroTitleA:'আপোনাৰ সম্পূৰ্ণ বিদ্যালয় চলাওক', heroTitleB:'এটা বুদ্ধিমান প্লেটফৰ্মৰ পৰা।', heroText:'ভৰ্তি, শিক্ষাৰ্থী, কৰ্মচাৰী, উপস্থিতি, সময়সূচী, ফলাফল, যোগাযোগ আৰু বিদ্যালয় ৱেবছাইট—এটা সুৰক্ষিত বহুভাষিক ক্লাউড ERPত সংযুক্ত।', register:'আপোনাৰ প্ৰতিষ্ঠান পঞ্জীয়ন কৰক', demo:'লাইভ ডেমো বুক কৰক', studentFree:'চাবস্ক্ৰিপচন বিদ্যালয়ে লয়। ভৰ্তিৰ পৰা বিদ্যালয় ত্যাগলৈ শিক্ষাৰ্থীৰ সক্ৰিয় মডিউলসমূহ বিনামূলীয়া।', whyChoose:'বিদ্যালয়ে EDUNIXO কিয় বাছি লয়', advantagesTitle:'কেৱল ফৰ্মৰ সমষ্টি নহয়—এটা সংযুক্ত বিদ্যালয় পৰিচালনা ব্যৱস্থা।', promiseTitle:'বিদ্যালয় যাত্ৰাজুৰি প্ৰতিজন সক্ৰিয় শিক্ষাৰ্থীৰ বাবে বিনামূলীয়া।', identityTitle:'আপোনাৰ বিদ্যালয় ৱেবছাইট আৰু ERP প্ৰৱেশ—একেলগে, কিন্তু সম্পূৰ্ণ আপোনাৰ পৰিচয়েৰে।', finderTitle:'আপোনাৰ বিদ্যালয় পোৰ্টেল বিচাৰক', ctaTitle:'বিচ্ছিন্ন বিদ্যালয়ৰ কাম এটা প্লেটফৰ্মলৈ আনিবলৈ সাজু?', benefitText:'বাস্তৱ বিদ্যালয়ৰ কামৰ বাবে দ্ৰুত, বহুভাষিক আৰু সুৰক্ষিত সংযোগ।', finderText:'বিদ্যালয়ৰ নাম বা চৰকাৰী EDUNIXO কোড লিখক।', ctaText:'সুৰক্ষিত কৰ্মক্ষেত্ৰৰ আগতে প্ৰতিটো প্ৰতিষ্ঠান যাচাই কৰা হয়।', smartTimetable:'স্মাৰ্ট সময়সূচী', results:'চৰকাৰী নিয়মভিত্তিক ফলাফল', roles:'ভূমিকাভিত্তিক অভিজ্ঞতা', secureSchools:'সুৰক্ষিত বহু-বিদ্যালয় ক্লাউড', staff:'কৰ্মচাৰী ব্যৱস্থাপনা', attendance:'উপস্থিতি', fees:'মাচুল', payroll:'বেতন', command:'একত্ৰিত বিদ্যালয় কমাণ্ড', wholeSchool:'সম্পূৰ্ণ বিদ্যালয়ৰ সময়সূচী তৈয়াৰ', noClashes:'শিক্ষক সংঘৰ্ষ: ০'
  },
  or: {
    platform:'ପ୍ଲାଟଫର୍ମ', advantages:'ସୁବିଧା', studentPromise:'ଛାତ୍ର ପ୍ରତିଶ୍ରୁତି', schoolFinder:'ବିଦ୍ୟାଳୟ ଖୋଜନ୍ତୁ', admin:'ପ୍ଲାଟଫର୍ମ ପ୍ରଶାସକ', heroBadge:'ଭାରତୀୟ ବିଦ୍ୟାଳୟ ଓ ପ୍ରତ୍ୟେକ ସ୍ଥାନୀୟ ଭାଷା ପାଇଁ ନିର୍ମିତ', heroTitleA:'ଆପଣଙ୍କ ସମଗ୍ର ବିଦ୍ୟାଳୟ ଚଲାନ୍ତୁ', heroTitleB:'ଗୋଟିଏ ବୁଦ୍ଧିମାନ ପ୍ଲାଟଫର୍ମରୁ।', heroText:'ଭର୍ତ୍ତି, ଛାତ୍ର, କର୍ମଚାରୀ, ଉପସ୍ଥିତି, ସମୟସାରଣୀ, ଫଳାଫଳ, ଯୋଗାଯୋଗ ଓ ବିଦ୍ୟାଳୟ ୱେବସାଇଟ—ଗୋଟିଏ ସୁରକ୍ଷିତ ବହୁଭାଷୀ କ୍ଲାଉଡ ERPରେ ସଂଯୁକ୍ତ।', register:'ଆପଣଙ୍କ ସଂସ୍ଥା ପଞ୍ଜିକରଣ କରନ୍ତୁ', demo:'ଲାଇଭ ଡେମୋ ବୁକ କରନ୍ତୁ', studentFree:'ସଦସ୍ୟତା ବିଦ୍ୟାଳୟ ନେଉଛି। ଭର୍ତ୍ତିରୁ ଲିଭିଂ ପର୍ଯ୍ୟନ୍ତ ଛାତ୍ର ମଡ୍ୟୁଲ ମାଗଣା।', whyChoose:'ବିଦ୍ୟାଳୟ EDUNIXO କାହିଁକି ବାଛନ୍ତି', advantagesTitle:'କେବଳ ଫର୍ମ ନୁହେଁ—ଗୋଟିଏ ସଂଯୁକ୍ତ ବିଦ୍ୟାଳୟ ପରିଚାଳନା ପ୍ରଣାଳୀ।', promiseTitle:'ବିଦ୍ୟାଳୟ ଯାତ୍ରା ସାରା ପ୍ରତ୍ୟେକ ସକ୍ରିୟ ଛାତ୍ର ପାଇଁ ମାଗଣା।', identityTitle:'ଆପଣଙ୍କ ବିଦ୍ୟାଳୟ ୱେବସାଇଟ ଓ ERP ପ୍ରବେଶ—ଏକାଠି, କିନ୍ତୁ ଆପଣଙ୍କ ନିଜ ପରିଚୟରେ।', finderTitle:'ଆପଣଙ୍କ ବିଦ୍ୟାଳୟ ପୋର୍ଟାଲ ଖୋଜନ୍ତୁ', ctaTitle:'ବିକ୍ଷିପ୍ତ ବିଦ୍ୟାଳୟ କାମକୁ ଗୋଟିଏ ପ୍ଲାଟଫର୍ମରେ ଆଣିବାକୁ ପ୍ରସ୍ତୁତ?', benefitText:'ବାସ୍ତବ ବିଦ୍ୟାଳୟ କାମ ପାଇଁ ଦ୍ରୁତ, ବହୁଭାଷୀ ଓ ସୁରକ୍ଷିତ ସଂଯୋଗ।', finderText:'ବିଦ୍ୟାଳୟ ନାମ କିମ୍ବା ଅଧିକୃତ EDUNIXO କୋଡ ଦିଅନ୍ତୁ।', ctaText:'ସୁରକ୍ଷିତ କାର୍ଯ୍ୟକ୍ଷେତ୍ର ପୂର୍ବରୁ ପ୍ରତ୍ୟେକ ସଂସ୍ଥା ଯାଞ୍ଚ ହୁଏ।', smartTimetable:'ସ୍ମାର୍ଟ ସମୟସାରଣୀ', results:'ସରକାରୀ ନିୟମ ଆଧାରିତ ଫଳାଫଳ', roles:'ଭୂମିକା ଆଧାରିତ ଅନୁଭବ', secureSchools:'ସୁରକ୍ଷିତ ବହୁ-ବିଦ୍ୟାଳୟ କ୍ଲାଉଡ', staff:'କର୍ମଚାରୀ ପରିଚାଳନା', attendance:'ଉପସ୍ଥିତି', fees:'ଶୁଳ୍କ', payroll:'ବେତନ', command:'ଏକୀକୃତ ବିଦ୍ୟାଳୟ କମାଣ୍ଡ', wholeSchool:'ସମଗ୍ର ବିଦ୍ୟାଳୟ ସମୟସାରଣୀ ପ୍ରସ୍ତୁତ', noClashes:'ଶିକ୍ଷକ ସଂଘର୍ଷ: ୦'
  },
  ne: {
    platform:'प्लेटफर्म', advantages:'विशेषताहरू', studentPromise:'विद्यार्थी प्रतिबद्धता', schoolFinder:'विद्यालय खोज्नुहोस्', admin:'प्लेटफर्म प्रशासक', heroBadge:'भारतीय विद्यालय र हरेक स्थानीय भाषाका लागि निर्मित', heroTitleA:'आफ्नो सम्पूर्ण विद्यालय चलाउनुहोस्', heroTitleB:'एउटै बुद्धिमान प्लेटफर्मबाट।', heroText:'भर्ना, विद्यार्थी, कर्मचारी, हाजिरी, समयतालिका, नतिजा, सञ्चार र विद्यालय वेबसाइट—एउटै सुरक्षित बहुभाषिक क्लाउड ERPमा जोडिएको।', register:'आफ्नो संस्था दर्ता गर्नुहोस्', demo:'लाइभ डेमो बुक गर्नुहोस्', studentFree:'सदस्यता विद्यालयले लिन्छ। भर्नादेखि विद्यालय छोड्दासम्म विद्यार्थीका सक्रिय मोड्युल निःशुल्क।', whyChoose:'विद्यालयहरूले EDUNIXO किन रोज्छन्', advantagesTitle:'फारामहरूको सङ्ग्रह मात्र होइन—जोडिएको विद्यालय सञ्चालन प्रणाली।', promiseTitle:'विद्यालय यात्राभरि हरेक सक्रिय विद्यार्थीका लागि निःशुल्क।', identityTitle:'तपाईंको विद्यालय वेबसाइट र ERP प्रवेश—सँगै, तर पूर्ण रूपमा तपाईंको पहिचानमा।', finderTitle:'आफ्नो विद्यालय पोर्टल खोज्नुहोस्', ctaTitle:'छरिएका विद्यालय कामलाई एउटै प्लेटफर्ममा ल्याउन तयार हुनुहुन्छ?', benefitText:'वास्तविक विद्यालय कामका लागि छिटो, बहुभाषिक र सुरक्षित जडान।', finderText:'विद्यालयको नाम वा आधिकारिक EDUNIXO कोड लेख्नुहोस्।', ctaText:'सुरक्षित कार्यक्षेत्र बनाउनु अघि हरेक संस्था प्रमाणित हुन्छ।', smartTimetable:'स्मार्ट समयतालिका', results:'सरकारी नियमअनुसार नतिजा', roles:'भूमिकाअनुसार अनुभव', secureSchools:'सुरक्षित बहु-विद्यालय क्लाउड', staff:'कर्मचारी व्यवस्थापन', attendance:'हाजिरी', fees:'शुल्क', payroll:'तलब', command:'एकीकृत विद्यालय कमाण्ड', wholeSchool:'सम्पूर्ण विद्यालय समयतालिका तयार', noClashes:'शिक्षक द्वन्द्व: ०'
  },
  sa: {
    platform:'मञ्चः', advantages:'लाभाः', studentPromise:'विद्यार्थि-प्रतिज्ञा', schoolFinder:'विद्यालयं अन्विष्यताम्', admin:'मञ्च-प्रशासकः', heroBadge:'भारतीयविद्यालयानां सर्वासां स्थानीयभाषाणां च कृते निर्मितम्', heroTitleA:'सम्पूर्णं विद्यालयं सञ्चालयत', heroTitleB:'एकस्मात् बुद्धिमतः मञ्चात्।', heroText:'प्रवेशः, विद्यार्थी, कर्मचारी, उपस्थितिः, समयसारिणी, परिणामाः, सञ्चारः विद्यालय-जालस्थलं च—एकस्मिन् सुरक्षिते बहुभाषिके मेघ-ERP मध्ये संयुक्तम्।', register:'संस्थां पञ्जीकरोतु', demo:'सजीव-प्रदर्शनं आरक्षत', studentFree:'सदस्यतां विद्यालयः गृह्णाति। प्रवेशात् निर्गमनपर्यन्तं विद्यार्थिमॉड्यूलानि निःशुल्कानि।', whyChoose:'विद्यालयाः EDUNIXO किमर्थं वृण्वन्ति', advantagesTitle:'केवलं प्रपत्रसमूहः न—संयुक्तं विद्यालय-सञ्चालनतन्त्रम्।', promiseTitle:'सम्पूर्णविद्यालययात्रायां प्रत्येकसक्रियविद्यार्थिनः निःशुल्कम्।', identityTitle:'भवतः विद्यालय-जालस्थलं ERP-प्रवेशश्च—एकत्र, तथापि स्वपरिचयेन।', finderTitle:'स्वविद्यालय-पोर्टलम् अन्विष्यताम्', ctaTitle:'विकीर्णविद्यालयकार्यं एकस्मिन् मञ्चे संयोजयितुं सज्जाः?', benefitText:'वास्तविकविद्यालयकार्याय शीघ्रं बहुभाषिकं सुरक्षितं च संयोजनम्।', finderText:'विद्यालयनाम अथवा आधिकारिक EDUNIXO संकेतं लिखत।', ctaText:'सुरक्षितकार्यस्थाननिर्माणात् पूर्वं प्रत्येकसंस्था सत्याप्यते।', smartTimetable:'बुद्धिमती समयसारिणी', results:'शासननियमानुसारं परिणामाः', roles:'भूमिकानुसारः अनुभवः', secureSchools:'सुरक्षितः बहुविद्यालय-मेघः', staff:'कर्मचारी-व्यवस्थापनम्', attendance:'उपस्थितिः', fees:'शुल्कम्', payroll:'वेतनम्', command:'एकीकृत विद्यालय-नियन्त्रणम्', wholeSchool:'सम्पूर्णविद्यालयस्य समयसारिणी सिद्धा', noClashes:'शिक्षकसंघर्षः: ०'
  },
  sd: {
    platform:'پليٽ فارم', advantages:'فائدا', studentPromise:'شاگردن جو واعدو', schoolFinder:'اسڪول ڳوليو', admin:'پليٽ فارم ايڊمن', heroBadge:'ڀارتي اسڪولن ۽ هر مقامي ٻولي لاءِ تيار ڪيل', heroTitleA:'پنهنجو سڄو اسڪول هلايو', heroTitleB:'هڪ ذهين پليٽ فارم تان۔', heroText:'داخلا، شاگرد، اسٽاف، حاضري، ٽائيم ٽيبل، نتيجا، رابطو ۽ اسڪول ويب سائيٽ—هڪ محفوظ گهڻ ٻولي ڪلائوڊ ERP ۾ ڳنڍيل۔', register:'پنهنجو ادارو رجسٽر ڪريو', demo:'لائيو ڊيمو بڪ ڪريو', studentFree:'سبسڪرپشن اسڪول وٺي ٿو. داخلا کان ليونگ تائين شاگردن جا فعال ماڊيول مفت۔', whyChoose:'اسڪول EDUNIXO ڇو چونڊين ٿا', advantagesTitle:'رڳو فارمن جو مجموعو نه—هڪ ڳنڍيل اسڪول آپريٽنگ سسٽم۔', promiseTitle:'اسڪول جي سفر دوران هر فعال شاگرد لاءِ مفت۔', identityTitle:'توهان جي اسڪول ويب سائيٽ ۽ ERP داخلا—گڏ، پر مڪمل طور توهان جي سڃاڻپ سان۔', finderTitle:'پنهنجو اسڪول پورٽل ڳوليو', ctaTitle:'پکڙيل اسڪول ڪم کي هڪ پليٽ فارم تي آڻڻ لاءِ تيار؟', benefitText:'حقيقي اسڪول ڪم لاءِ تيز، گهڻ ٻولي ۽ محفوظ ڳانڍاپو۔', finderText:'اسڪول جو نالو يا سرڪاري EDUNIXO ڪوڊ لکو۔', ctaText:'محفوظ ورڪ اسپيس کان اڳ هر اداري جي تصديق ٿئي ٿي۔', smartTimetable:'سمارٽ ٽائيم ٽيبل', results:'سرڪاري قاعدن وارا نتيجا', roles:'ڪردار مطابق تجربو', secureSchools:'محفوظ گهڻ اسڪول ڪلائوڊ', staff:'اسٽاف انتظام', attendance:'حاضري', fees:'فيس', payroll:'پگهار', command:'گڏيل اسڪول ڪمانڊ', wholeSchool:'سڄي اسڪول جو ٽائيم ٽيبل تيار', noClashes:'استاد ٽڪراءُ: 0'
  },
  ks: {
    platform:'پلیٹ فارم', advantages:'فایدٕ', studentPromise:'طالب علم وعدٕ', schoolFinder:'سکول ژھانڈِو', admin:'پلیٹ فارم ایڈمن', heroBadge:'ہندوستانی سکولن تہٕ ہر مقامی زبان خٲطرٕ تیار', heroTitleA:'پنُن پورٕ سکول چلٲیو', heroTitleB:'اکھ ذہین پلیٹ فارم پٮ۪ٹھ۔', heroText:'داخلہ، طالب علم، سٹاف، حاضری، ٹائم ٹیبل، نتیجہ، رابطہ تہٕ سکول ویب سائٹ—اکھ محفوظ کثیر لسانی کلاؤڈ ERP منز مربوط۔', register:'پنُن ادارٕ رجسٹر کٔریو', demo:'لائیو ڈیمو بک کٔریو', studentFree:'سبسکرپشن سکول چھُ نوان۔ داخلہ پیٹھ لیونگ تام طالب علم ماڈیول مفت۔', whyChoose:'سکول EDUNIXO کیازِ ژارن', advantagesTitle:'صرف فارم نہٕ—اکھ مربوط سکول آپریٹنگ سسٹم۔', promiseTitle:'سکولی سفر دوران ہر فعال طالب علم خٲطرٕ مفت۔', identityTitle:'تُہند سکول ویب سائٹ تہٕ ERP داخلہ—اکۍ ساتھ، مگر تُہندۍ شناختہٕ سۭتۍ۔', finderTitle:'پنُن سکول پورٹل ژھانڈِو', ctaTitle:'بکھرٕ سکولی کام اکھ پلیٹ فارم پٮ۪ٹھ اننہٕ خٲطرٕ تیار؟', benefitText:'اصلی سکولی کام خٲطرٕ تیز، کثیر لسانی تہٕ محفوظ رابطہ۔', finderText:'سکول ناو یا سرکاری EDUNIXO کوڈ لِکھِو۔', ctaText:'محفوظ ورک اسپیس بننہٕ برونہہ ہر ادارٕ تصدیق گژھِ۔', smartTimetable:'سمارٹ ٹائم ٹیبل', results:'سرکاری قاعدن مطابق نتیجہ', roles:'کردار مطابق تجربہ', secureSchools:'محفوظ ملٹی سکول کلاؤڈ', staff:'سٹاف انتظام', attendance:'حاضری', fees:'فیس', payroll:'تنخواہ', command:'متحد سکول کمانڈ', wholeSchool:'پورٕ سکول ٹائم ٹیبل تیار', noClashes:'استاد ٹکراؤ: 0'
  },
  gom: {
    platform:'प्लॅटफॉर्म', advantages:'फायदे', studentPromise:'विद्यार्थी वचन', schoolFinder:'शाळा सोदात', admin:'प्लॅटफॉर्म प्रशासक', heroBadge:'भारतीय शाळां आनी दर एका स्थानिक भाशे खातीर तयार', heroTitleA:'तुमची सगळी शाळा चलयात', heroTitleB:'एका हुशार प्लॅटफॉर्मावरसून।', heroText:'प्रवेश, विद्यार्थी, कर्मचारी, उपस्थिती, वेळापत्रक, निकाल, संवाद आनी शाळेची वेबसायट—एका सुरक्षित बहुभाशिक क्लाउड ERPंत जोडिल्ली।', register:'तुमची संस्था नोंद करात', demo:'लाइव्ह डेमो बुक करात', studentFree:'सदस्यता शाळा घेता. प्रवेशासून लीविंग मेरेन विद्यार्थी मॉड्यूल मोफत।', whyChoose:'शाळा EDUNIXO कित्याक निवडतात', advantagesTitle:'फकत फॉर्मांचो संच न्हय—जोडिल्ली शाळा संचालन प्रणाली।', promiseTitle:'शाळेच्या प्रवासभर दर सक्रिय विद्यार्थ्याक मोफत।', identityTitle:'तुमची शाळा वेबसायट आनी ERP प्रवेश—एकठांय, पूण तुमच्या वळखीन।', finderTitle:'तुमचें शाळा पोर्टल सोदात', ctaTitle:'विखुरिल्लें शाळेचें काम एका प्लॅटफॉर्मार हाडपाक तयार?', benefitText:'खऱ्या शाळेच्या कामाखातीर वेगवान, बहुभाशिक आनी सुरक्षित जोडणी।', finderText:'शाळेचें नांव वा अधिकृत EDUNIXO कोड बरयात।', ctaText:'सुरक्षित कार्यक्षेत्रा पयलीं दर संस्थेची तपासणी जाता।', smartTimetable:'स्मार्ट वेळापत्रक', results:'सरकारी नियमांप्रमाणे निकाल', roles:'भूमिकेनुसार अनुभव', secureSchools:'सुरक्षित बहु-शाळा क्लाउड', staff:'कर्मचारी व्यवस्थापन', attendance:'उपस्थिती', fees:'शुल्क', payroll:'पगार', command:'एकत्रित शाळा कमांड', wholeSchool:'सगल्या शाळेचें वेळापत्रक तयार', noClashes:'शिक्षक संघर्ष: ०'
  },
  mai: {
    platform:'प्लेटफॉर्म', advantages:'लाभ', studentPromise:'विद्यार्थी वचन', schoolFinder:'विद्यालय खोजू', admin:'प्लेटफॉर्म प्रशासक', heroBadge:'भारतीय विद्यालय आ हर स्थानीय भाषाक लेल बनल', heroTitleA:'अपन पूरा विद्यालय चलाउ', heroTitleB:'एक बुद्धिमान प्लेटफॉर्मसँ।', heroText:'नामांकन, विद्यार्थी, कर्मचारी, उपस्थिति, समय-सारिणी, परिणाम, संचार आ विद्यालय वेबसाइट—एक सुरक्षित बहुभाषी क्लाउड ERPमे जुड़ल।', register:'अपन संस्था पंजीकृत करू', demo:'लाइव डेमो बुक करू', studentFree:'सदस्यता विद्यालय लेत अछि। नामांकनसँ विदाई धरि विद्यार्थी मॉड्यूल निःशुल्क।', whyChoose:'विद्यालय EDUNIXO किएक चुनैत अछि', advantagesTitle:'केवल फॉर्मक समूह नहि—एक जुड़ल विद्यालय संचालन तंत्र।', promiseTitle:'विद्यालय यात्राभरि प्रत्येक सक्रिय विद्यार्थीक लेल निःशुल्क।', identityTitle:'अहाँक विद्यालय वेबसाइट आ ERP प्रवेश—एक संग, मुदा पूर्णतः अहाँक पहचानमे।', finderTitle:'अपन विद्यालय पोर्टल खोजू', ctaTitle:'बिखरल विद्यालय काजकेँ एक प्लेटफॉर्मपर आनबाक लेल तैयार?', benefitText:'वास्तविक विद्यालय काजक लेल तेज, बहुभाषी आ सुरक्षित जुड़ाव।', finderText:'विद्यालयक नाम वा आधिकारिक EDUNIXO कोड लिखू।', ctaText:'सुरक्षित कार्यक्षेत्र बनबाक पहिने प्रत्येक संस्थाक सत्यापन होइत अछि।', smartTimetable:'स्मार्ट समय-सारिणी', results:'सरकारी नियम आधारित परिणाम', roles:'भूमिका आधारित अनुभव', secureSchools:'सुरक्षित बहु-विद्यालय क्लाउड', staff:'कर्मचारी प्रबंधन', attendance:'उपस्थिति', fees:'शुल्क', payroll:'वेतन', command:'एकीकृत विद्यालय कमांड', wholeSchool:'पूरा विद्यालयक समय-सारिणी तैयार', noClashes:'शिक्षक टकराव: ०'
  },
  doi: {
    platform:'प्लेटफॉर्म', advantages:'फायदे', studentPromise:'विद्यार्थी वादा', schoolFinder:'स्कूल खोजो', admin:'प्लेटफॉर्म एडमिन', heroBadge:'भारती स्कूलें ते हर स्थानीय भाशा आस्तै बनाया', heroTitleA:'अपना पूरा स्कूल चलाओ', heroTitleB:'इक समझदार प्लेटफॉर्म थमां।', heroText:'दाखला, विद्यार्थी, स्टाफ, हाजिरी, समय-सारणी, नतीजे, संपर्क ते स्कूल वेबसाइट—इक सुरक्षित बहुभाषी क्लाउड ERP च जुड़े।', register:'अपनी संस्था रजिस्टर करो', demo:'लाइव डेमो बुक करो', studentFree:'सदस्यता स्कूल लैंदा ऐ। दाखले थमां लीविंग तगर विद्यार्थी मॉड्यूल मुफ्त।', whyChoose:'स्कूल EDUNIXO की चुनदे न', advantagesTitle:'सिर्फ फार्में दा संग्रह नेईं—इक जुड़ी स्कूल संचालन प्रणाली।', promiseTitle:'स्कूली सफर दौरान हर सक्रिय विद्यार्थी आस्तै मुफ्त।', identityTitle:'तुंदी स्कूल वेबसाइट ते ERP प्रवेश—कन्नै, पर पूरी तुंदी पहचान च।', finderTitle:'अपना स्कूल पोर्टल खोजो', ctaTitle:'बिखरे स्कूल कम्मै गी इक प्लेटफॉर्म पर लाने आस्तै तैयार?', benefitText:'असल स्कूल कम्मै आस्तै तेज, बहुभाषी ते सुरक्षित जोड़।', finderText:'स्कूल दा नां जां आधिकारिक EDUNIXO कोड भरो।', ctaText:'सुरक्षित कार्यक्षेत्र बनाने थमां पैह्लें हर संस्था दी जांच होंदी ऐ।', smartTimetable:'स्मार्ट समय-सारणी', results:'सरकारी नियम अनुसार नतीजे', roles:'भूमिका अनुसार अनुभव', secureSchools:'सुरक्षित बहु-स्कूल क्लाउड', staff:'स्टाफ प्रबंधन', attendance:'हाजिरी', fees:'फीस', payroll:'तनखाह', command:'एकीकृत स्कूल कमांड', wholeSchool:'पूरे स्कूल दी समय-सारणी तैयार', noClashes:'शिक्षक टकराव: ०'
  },
  brx: {
    platform:'प्लेटफर्म', advantages:'खाबुफोर', studentPromise:'फरायसा रादाय', schoolFinder:'स्कुल नागिर', admin:'प्लेटफर्म एडमिन', heroBadge:'भारतनि स्कुल आरो मोनसे मोनसे जायगा रावनि थाखाय बानायनाय', heroTitleA:'नोंथांनि गासै स्कुलखौ सालाय', heroTitleB:'मोनसे गोसो गोनां प्लेटफर्मजों।', heroText:'एडमिसन, फरायसा, स्टाफ, हाजिरा, टाइमटेबल, रिजाल्ट, जगाजग आरो स्कुल वेबसाइट—मोनसे रैखाथि गोबां राव क्लाउड ERPआव लोगोसे।', register:'नोंथांनि संस्थाखौ रेजिस्टर खालाम', demo:'लाइभ डेमो बुक खालाम', studentFree:'सब्सक्रिपसन स्कुला लायो। एडमिसननिफ्राय लीभिंसिम फरायसा मोड्युल फ्री।', whyChoose:'स्कुलफोरा EDUNIXOखौ मानो सायख', advantagesTitle:'खालि फर्मनि जथाय नङा—मोनसे लोगोसे स्कुल सालायनाय सिस्टेम।', promiseTitle:'स्कुलनि लामायाव मोनफ्रोमबो एक्टिभ फरायसानि थाखाय फ्री।', identityTitle:'नोंथांनि स्कुल वेबसाइट आरो ERP एक्सेस—लोगोसे, नाथाय नोंथांनि मुंखांजों।', finderTitle:'नोंथांनि स्कुल पोर्टेल नागिर', ctaTitle:'फिसा फिसा स्कुल हाबाखौ मोनसे प्लेटफर्मआव लाबोनो तयार?', benefitText:'थार स्कुल हाबानि थाखाय गोख्रों, गोबां राव आरो रैखाथि लोगोसे।', finderText:'स्कुलनि मुं एबा अफिसियेल EDUNIXO कोड लिर।', ctaText:'रैखाथि वर्कस्पेसनि सिगां मोनफ्रोमबो संस्था नायबिजिरजायो।', smartTimetable:'स्मार्ट टाइमटेबल', results:'सरकारी खान्थि रिजाल्ट', roles:'रोल हिसाब अनुभव', secureSchools:'रैखाथि गोबां स्कुल क्लाउड', staff:'स्टाफ मेनेजमेन्ट', attendance:'हाजिरा', fees:'फिस', payroll:'बेतन', command:'लोगोसे स्कुल कमाण्ड', wholeSchool:'गासै स्कुलनि टाइमटेबल तयार', noClashes:'फोरोंगिरि क्लेस: ०'
  },
  mni: {
    platform:'ꯄ꯭ꯂꯦꯠꯐꯣꯔꯝ', advantages:'ꯀꯥꯟꯅꯕꯁꯤꯡ', studentPromise:'ꯃꯍꯩꯔꯣꯏ ꯋꯥꯁꯛ', schoolFinder:'ꯁ꯭ꯀꯨꯜ ꯊꯤꯕꯥ', admin:'ꯄ꯭ꯂꯦꯠꯐꯣꯔꯝ ꯑꯦꯗꯃꯤꯟ', heroBadge:'ꯏꯟꯗꯤꯌꯥꯒꯤ ꯁ꯭ꯀꯨꯜ ꯑꯃꯁꯨꯡ ꯂꯣꯀꯦꯜ ꯂꯣꯜ ꯈꯨꯗꯤꯡꯒꯤꯗꯃꯛ', heroTitleA:'ꯅꯍꯥꯛꯀꯤ ꯁ꯭ꯀꯨꯜ ꯄꯨꯝꯅꯃꯛ ꯆꯂꯥꯏꯌꯨ', heroTitleB:'ꯏꯟꯇꯦꯂꯤꯖꯦꯟꯠ ꯄ꯭ꯂꯦꯠꯐꯣꯔꯝ ꯑꯃꯗꯒꯤ।', heroText:'ꯑꯦꯗꯃꯤꯁꯟ, ꯃꯍꯩꯔꯣꯏ, ꯁ꯭ꯇꯥꯐ, ꯑꯦꯇꯦꯟꯗꯦꯟꯁ, ꯇꯥꯏꯝꯇꯦꯕꯜ, ꯔꯤꯖꯜꯠ, ꯀꯃ꯭ꯌꯨꯅꯤꯀꯦꯁꯟ ꯑꯃꯁꯨꯡ ꯁ꯭ꯀꯨꯜ ꯋꯦꯕꯁꯥꯏꯠ—ꯁꯦꯀ꯭ꯌꯨꯔ ꯃꯜꯇꯤꯂꯤꯡꯒꯨꯑꯦꯜ ꯀ꯭ꯂꯥꯎꯗ ERPꯗꯥ ꯁꯝꯅꯕꯥ।', register:'ꯅꯍꯥꯛꯀꯤ ꯏꯟꯁꯇꯤꯇ꯭ꯌꯨꯁꯟ ꯔꯦꯖꯤꯁꯇꯔ ꯇꯧ', demo:'ꯂꯥꯏꯚ ꯗꯦꯃꯣ ꯕꯨꯛ ꯇꯧ', studentFree:'ꯁꯕꯁ꯭ꯀ꯭ꯔꯤꯄꯁꯟ ꯁ꯭ꯀꯨꯜꯅꯥ ꯂꯧꯏ। ꯑꯦꯗꯃꯤꯁꯟꯗꯒꯤ ꯂꯤꯚꯤꯡꯐꯥꯎꯕꯥ ꯃꯍꯩꯔꯣꯏ ꯃꯣꯗ꯭ꯌꯨꯜ ꯐ꯭ꯔꯤ।', whyChoose:'ꯁ꯭ꯀꯨꯜꯅꯥ EDUNIXO ꯀꯔꯤꯒꯤ ꯈꯅꯕꯒꯦ', advantagesTitle:'ꯐꯣꯔꯝꯒꯤ ꯀꯂꯦꯛꯁꯟ ꯈꯛꯇ ꯅꯠꯇꯦ—ꯀꯅꯦꯛꯇꯦꯗ ꯁ꯭ꯀꯨꯜ ꯑꯣꯄꯔꯦꯇꯤꯡ ꯁꯤꯁꯇꯦꯝ।', promiseTitle:'ꯁ꯭ꯀꯨꯜ ꯖꯔꯅꯤ ꯄꯨꯝꯅꯃꯛꯇꯥ ꯑꯦꯛꯇꯤꯚ ꯃꯍꯩꯔꯣꯏ ꯈꯨꯗꯤꯡꯒꯤ ꯐ꯭ꯔꯤ।', identityTitle:'ꯅꯍꯥꯛꯀꯤ ꯁ꯭ꯀꯨꯜ ꯋꯦꯕꯁꯥꯏꯠ ꯑꯃꯁꯨꯡ ERP ꯑꯦꯛꯁꯦꯁ—ꯂꯣꯏꯅꯅ, ꯑꯗꯨꯕꯨ ꯅꯍꯥꯛꯀꯤ ꯑꯥꯏꯗꯦꯟꯇꯤꯇꯤꯗꯥ।', finderTitle:'ꯅꯍꯥꯛꯀꯤ ꯁ꯭ꯀꯨꯜ ꯄꯣꯔꯇꯦꯜ ꯊꯤꯕꯥ', ctaTitle:'ꯁ꯭ꯀꯨꯜ ꯋꯥꯔꯛ ꯄꯨꯝꯅꯃꯛ ꯄ꯭ꯂꯦꯠꯐꯣꯔꯝ ꯑꯃꯗꯥ ꯄꯨꯁꯤꯅꯕꯥ ꯁꯦꯝ ꯁꯥꯕꯔꯥ?', benefitText:'ꯔꯤꯌꯦꯜ ꯁ꯭ꯀꯨꯜ ꯋꯥꯔꯛꯀꯤ ꯐꯥꯁꯇ, ꯃꯜꯇꯤꯂꯤꯡꯒꯨꯑꯦꯜ ꯑꯃꯁꯨꯡ ꯁꯦꯀ꯭ꯌꯨꯔ ꯀꯅꯦꯛꯁꯟ।', finderText:'ꯁ꯭ꯀꯨꯜ ꯅꯦꯝ ꯅꯠꯇ꯭ꯔꯒꯥ ꯑꯣꯐꯤꯁꯤꯑꯦꯜ EDUNIXO ꯀꯣꯗ ꯏꯕꯤꯌꯨ।', ctaText:'ꯁꯦꯀ꯭ꯌꯨꯔ ꯋꯥꯔꯛꯁ꯭ꯄꯦꯁ ꯁꯦꯝꯗ꯭ꯔꯤꯉꯩꯗꯥ ꯏꯟꯁꯇꯤꯇ꯭ꯌꯨꯁꯟ ꯈꯨꯗꯤꯡ ꯚꯦꯔꯤꯐꯥꯏ ꯇꯧꯏ।', smartTimetable:'ꯁ꯭ꯃꯥꯔꯠ ꯇꯥꯏꯝꯇꯦꯕꯜ', results:'ꯒꯚꯔꯟꯃꯦꯟꯠ ꯔꯨꯜ ꯔꯤꯖꯜꯠ', roles:'ꯔꯣꯜ ꯕꯦꯁꯇ ꯑꯦꯛꯁꯄꯤꯔꯤꯑꯦꯟꯁ', secureSchools:'ꯁꯦꯀ꯭ꯌꯨꯔ ꯃꯜꯇꯤ-ꯁ꯭ꯀꯨꯜ ꯀ꯭ꯂꯥꯎꯗ', staff:'ꯁ꯭ꯇꯥꯐ ꯃꯦꯅꯦꯖꯃꯦꯟꯠ', attendance:'ꯑꯦꯇꯦꯟꯗꯦꯟꯁ', fees:'ꯐꯤꯁ', payroll:'ꯄꯦꯔꯣꯜ', command:'ꯌꯨꯅꯤꯐꯥꯏꯗ ꯁ꯭ꯀꯨꯜ ꯀꯃꯥꯟꯗ', wholeSchool:'ꯁ꯭ꯀꯨꯜ ꯄꯨꯝꯅꯃꯛꯀꯤ ꯇꯥꯏꯝꯇꯦꯕꯜ ꯁꯦꯝꯂꯦ', noClashes:'ꯇꯤꯆꯔ ꯀ꯭ꯂꯦꯁ: 0'
  },
  sat: {
    platform:'ᱯᱞᱮᱴᱯᱷᱚᱨᱢ', advantages:'ᱞᱟᱵᱷ', studentPromise:'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱵᱷᱟᱨᱚᱥᱟ', schoolFinder:'ᱥᱠᱩᱞ ᱯᱟᱱᱛᱮ', admin:'ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱮᱰᱢᱤᱱ', heroBadge:'ᱵᱷᱟᱨᱚᱛᱤᱭᱚ ᱥᱠᱩᱞ ᱟᱨ ᱡᱷᱚᱛᱚ ᱞᱚᱠᱟᱞ ᱯᱟᱹᱨᱥᱤ ᱞᱟᱹᱜᱤᱫ', heroTitleA:'ᱟᱢᱟᱜ ᱜᱚᱴᱟ ᱥᱠᱩᱞ ᱪᱟᱞᱟᱣ ᱢᱮ', heroTitleB:'ᱢᱤᱫ ᱟᱠᱤᱞᱟᱱ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱠᱷᱚᱱ।', heroText:'ᱮᱰᱢᱤᱥᱚᱱ, ᱯᱟᱹᱴᱷᱩᱣᱟᱹ, ᱥᱴᱟᱯ, ᱦᱟᱡᱤᱨᱟ, ᱴᱟᱭᱤᱢᱴᱮᱵᱩᱞ, ᱨᱤᱡᱟᱞᱴ, ᱡᱚᱜᱟᱡᱚᱜ ᱟᱨ ᱥᱠᱩᱞ ᱣᱮᱵᱽᱥᱟᱭᱤᱴ—ᱢᱤᱫ ᱥᱮᱠᱭᱩᱨ ᱢᱟᱞᱴᱤᱞᱤᱝᱜᱩᱣᱟᱞ ᱠᱞᱟᱣᱰ ERP ᱨᱮ ᱡᱩᱲᱟᱹᱣ।', register:'ᱟᱢᱟᱜ ᱤᱱᱥᱴᱤᱴᱭᱩᱥᱚᱱ ᱨᱮᱡᱤᱥᱴᱟᱨ ᱢᱮ', demo:'ᱞᱟᱭᱤᱵᱷ ᱰᱮᱢᱚ ᱵᱩᱠ ᱢᱮ', studentFree:'ᱥᱟᱵᱽᱥᱠᱨᱤᱯᱥᱚᱱ ᱥᱠᱩᱞ ᱦᱟᱛᱟᱣᱟ। ᱮᱰᱢᱤᱥᱚᱱ ᱠᱷᱚᱱ ᱞᱤᱵᱷᱤᱝ ᱫᱷᱟᱹᱵᱤᱡ ᱥᱴᱩᱰᱮᱱᱴ ᱢᱚᱰᱭᱩᱞ ᱯᱷᱨᱤ।', whyChoose:'ᱥᱠᱩᱞ EDUNIXO ᱪᱮᱫ ᱞᱟᱹᱜᱤᱫ ᱵᱟᱪᱷᱟᱣᱟ', advantagesTitle:'ᱯᱷᱚᱨᱢ ᱠᱚ ᱨᱮᱭᱟᱜ ᱜᱟᱫᱮᱞ ᱵᱟᱝ—ᱢᱤᱫ ᱡᱩᱲᱟᱹᱣ ᱥᱠᱩᱞ ᱚᱯᱟᱨᱮᱴᱤᱝ ᱥᱤᱥᱴᱮᱢ।', promiseTitle:'ᱥᱠᱩᱞ ᱡᱟᱨᱱᱤ ᱡᱷᱚᱛᱚ ᱮᱠᱴᱤᱵᱷ ᱥᱴᱩᱰᱮᱱᱴ ᱞᱟᱹᱜᱤᱫ ᱯᱷᱨᱤ।', identityTitle:'ᱟᱢᱟᱜ ᱥᱠᱩᱞ ᱣᱮᱵᱽᱥᱟᱭᱤᱴ ᱟᱨ ERP ᱮᱠᱥᱮᱥ—ᱢᱤᱫᱛᱮ, ᱢᱮᱱᱠᱷᱟᱱ ᱟᱢᱟᱜ ᱪᱤᱱᱦᱟᱹ ᱥᱟᱶ।', finderTitle:'ᱟᱢᱟᱜ ᱥᱠᱩᱞ ᱯᱚᱨᱴᱟᱞ ᱯᱟᱱᱛᱮ', ctaTitle:'ᱥᱠᱩᱞ ᱠᱟᱹᱢᱤ ᱢᱤᱫ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱨᱮ ᱟᱹᱜᱩ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱯᱲᱟᱣ?', benefitText:'ᱨᱤᱭᱟᱞ ᱥᱠᱩᱞ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱛᱮᱡ, ᱢᱟᱞᱴᱤᱞᱤᱝᱜᱩᱣᱟᱞ ᱟᱨ ᱥᱮᱠᱭᱩᱨ ᱡᱩᱲᱟᱹᱣ।', finderText:'ᱥᱠᱩᱞ ᱧᱩᱛᱩᱢ ᱥᱮ ᱚᱯᱷᱤᱥᱤᱭᱟᱞ EDUNIXO ᱠᱚᱰ ᱚᱞ ᱢᱮ।', ctaText:'ᱥᱮᱠᱭᱩᱨ ᱣᱟᱨᱠᱥᱯᱮᱥ ᱵᱮᱱᱟᱣ ᱞᱟᱦᱟ ᱡᱷᱚᱛᱚ ᱤᱱᱥᱴᱤᱴᱭᱩᱥᱚᱱ ᱵᱷᱮᱨᱤᱯᱷᱟᱭ ᱦᱩᱭᱩᱜᱼᱟ।', smartTimetable:'ᱥᱢᱟᱨᱴ ᱴᱟᱭᱤᱢᱴᱮᱵᱩᱞ', results:'ᱥᱚᱨᱠᱟᱨ ᱨᱩᱞ ᱨᱤᱡᱟᱞᱴ', roles:'ᱨᱚᱞ ᱵᱮᱥᱴ ᱮᱠᱥᱯᱤᱨᱤᱭᱮᱱᱥ', secureSchools:'ᱥᱮᱠᱭᱩᱨ ᱢᱟᱞᱴᱤ-ᱥᱠᱩᱞ ᱠᱞᱟᱣᱰ', staff:'ᱥᱴᱟᱯ ᱢᱮᱱᱮᱡᱢᱮᱱᱴ', attendance:'ᱦᱟᱡᱤᱨᱟ', fees:'ᱯᱷᱤᱥ', payroll:'ᱯᱮᱨᱚᱞ', command:'ᱭᱩᱱᱤᱯᱷᱟᱭᱰ ᱥᱠᱩᱞ ᱠᱚᱢᱟᱱᱰ', wholeSchool:'ᱜᱚᱴᱟ ᱥᱠᱩᱞ ᱴᱟᱭᱤᱢᱴᱮᱵᱩᱞ ᱛᱮᱭᱟᱨ', noClashes:'ᱴᱤᱪᱟᱨ ᱠᱞᱮᱥ: 0'
  }
};

function makeCopy(seed: LocaleSeed, language: Language): PlatformLandingCopy {
  const p = getPublicPortalCopy(language);
  const generic = seed.benefitText;
  return {
    brandSubtitle: seed.platform,
    navPlatform: seed.platform, navAdvantages: seed.advantages, navStudents: seed.studentPromise, navFinder: seed.schoolFinder,
    admin: seed.admin, openConsole: `${p.openNow} · ${seed.admin}`, openPlatformConsole: `${p.openNow} · ${seed.platform}`,
    interfaceLanguage: p.websiteLanguage, toggleNavigation: seed.platform,
    heroBadge: seed.heroBadge, heroTitleA: seed.heroTitleA, heroTitleB: seed.heroTitleB, heroText: seed.heroText,
    register: seed.register, demo: seed.demo, studentPricing: p.studentFirst, studentFree: seed.studentFree,
    unifiedCommand: seed.command, workspacePreview: seed.roles, secureCloud: `${p.secure} · Cloud`,
    students: seed.studentPromise, attendance: seed.attendance, classes: p.academics, notices: p.notices,
    smartTimetable: seed.smartTimetable, wholeSchoolGenerated: seed.wholeSchool, noClashes: seed.noClashes,
    languageLayer: p.multilingual, languageLayerText: generic,
    stats: [['23', p.multilingual], ['1', p.officialSchoolWebsite], ['6', seed.roles], ['0', seed.studentPromise]],
    whyChoose: seed.whyChoose, advantagesTitle: seed.advantagesTitle, advantagesText: generic,
    features: [
      { eyebrow: p.multilingual, title: p.websiteLanguage, text: generic },
      { eyebrow: seed.smartTimetable, title: seed.wholeSchool, text: generic },
      { eyebrow: seed.results, title: seed.results, text: generic },
      { eyebrow: p.officialSchoolWebsite, title: `${p.admissions} · ${p.erpAccess}`, text: generic },
      { eyebrow: seed.roles, title: seed.roles, text: generic },
      { eyebrow: p.secure, title: seed.secureSchools, text: generic }
    ],
    promiseEyebrow: seed.studentPromise, promiseTitle: seed.promiseTitle, promiseText: seed.studentFree,
    promiseBadges: [seed.studentFree, p.secure, p.studentFirst, p.digital],
    identityEyebrow: p.officialSchoolWebsite, identityTitle: seed.identityTitle, identityText: generic,
    identityBenefits: [p.admissions, p.onlineAdmissionEnquiry, p.notices, seed.roles, p.multilingual, p.officialSchoolWebsite],
    yourSchoolName: p.officialSchoolWebsite, officialDigitalCampus: p.officialSchoolWebsite, login: p.schoolLogin,
    admissionsOpen: p.admissions, learnGrowLead: seed.promiseTitle, schoolBannerText: generic,
    applyOnline: p.applyNow, viewProspectus: p.gallery, achievements: p.achievements, contact: p.contact,
    finderTitle: seed.finderTitle, finderText: seed.finderText, finderPlaceholder: seed.schoolFinder, finderButton: seed.schoolFinder,
    noSchool: `${seed.schoolFinder} — 0`, openWebsite: p.officialSchoolWebsite,
    ctaTitle: seed.ctaTitle, ctaText: seed.ctaText, footerSubtitle: seed.heroBadge, administratorAccess: seed.admin,
    onboarding: p.verifiedInstitution, leadTitleRegistration: seed.register, leadTitleDemo: seed.demo, leadText: seed.ctaText,
    submitted: p.applicationReceived, keepReference: seed.ctaText, close: p.close,
    institutionName: p.officialSchoolWebsite, institutionType: seed.platform, cityDistrict: p.address, state: p.address,
    authorizedContact: p.contact, designation: seed.roles, mobile: p.mobileNumber, officialEmail: p.emailAddress,
    approxStudents: p.studentGrowth, approxStaff: seed.staff, modulesInterest: seed.advantages,
    additionalRequirements: p.admissionNote, additionalPlaceholder: seed.benefitText, consent: seed.ctaText,
    submitting: p.submittingApplication, submitRegistration: seed.register, requestDemo: seed.demo,
    requiredError: seed.ctaText, authorizedError: seed.ctaText, requestError: seed.ctaText, directoryError: seed.ctaText,
    moduleLabels: {
      'Admissions': p.admissions,
      'Student Management': seed.studentPromise,
      'Staff Management': seed.staff,
      'Attendance': seed.attendance,
      'Smart Timetable': seed.smartTimetable,
      'Examination & Results': seed.results,
      'Fees': seed.fees,
      'Payroll': seed.payroll,
      'Communication': p.contact,
      'School Website': p.officialSchoolWebsite
    }
  };
}

export function getPlatformLandingCopy(language: Language): PlatformLandingCopy {
  const code = codeOf(language);
  return makeCopy(seeds[code] || seeds.en, language);
}
