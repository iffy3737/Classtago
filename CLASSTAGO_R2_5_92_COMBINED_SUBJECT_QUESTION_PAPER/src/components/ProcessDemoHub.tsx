import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CircleDot,
  BarChart3, ClipboardCheck, Clock3, Compass, Layers3, Mail, Pause, Phone, Play, Rocket, RotateCcw, Search, ShieldCheck,
  Sparkles, UserRound, WandSparkles, X
} from 'lucide-react';
import {DEMO_PROCESSES, PROCESS_CATEGORIES, type DemoProcess, type ProcessControl, type ProcessField, type ProcessRole, type ProcessStep} from '../lib/demoProcessCatalog';
import {buildDemoLocaleData} from '../lib/demoLocaleData';
import {roleDemoModules, type DemoRole} from '../lib/demoExperienceCatalog';
import {
  getProcessDemoCopy, guidanceAutomationText, guidanceInstruction, guidancePanelTitle,
  guidanceProgress, instructionDirection, type DemoGuidanceMode
} from '../lib/processDemoGuidance';
import { requestPublicOtp, verifyPublicOtp } from '../lib/otpClient';

export type ProcessSignal={
  processId:string;stepId:string;role:ProcessRole;actionLabel:string;moduleKeyword:string;screen:string;effects:string[];
};
type SessionEvent=ProcessSignal&{at:number};
type Props={
  familyCode:string;
  jurisdictionCode:string;
  jurisdictionName:string;
  medium:string;
  boardName:string;
  languageCode:string;
  visitorName?:string;
  visitorRole?:string;
  visitorContact?:string;
  institutionName?:string;
  sessionEvents?:SessionEvent[];
  onBack:()=>void;
  onOpenRole:(role:DemoRole)=>void;
  onSignal?:(signal:ProcessSignal)=>void;
};

type FieldControl=ProcessControl;
type ResolvedField={label:string;value:string;control:FieldControl};

const roleTitle:Record<ProcessRole,string>={headmaster:'Headmaster',clerk:'Clerk',teacher:'Teacher / Class Teacher',student:'Student',parent:'Parent',super_admin:'Super Admin'};

type ConnectionCopy={pass:string;session:string;handoff:string;received:string;synced:string;impact:string;roles:string;changes:string;verified:string;another:string;replay:string;actualModule:string;automatedDemo:string;userDecides:string;processCompleted:string;setupSchool:string;completeProcess:string;continueAs:string};
const CONNECTION_COPY:Record<string,Partial<ConnectionCopy>>={
  en:{pass:'Instant Demo Pass',session:'Private demo session',handoff:'Connected hand-off',received:'Received from previous role',synced:'Synced into this module',impact:'System-wide impact',roles:'roles connected',changes:'workflow changes recorded',verified:'Verified in the next role',another:'Explore Another Process',replay:'Replay',actualModule:'Actual module context',automatedDemo:'Automated for demo',userDecides:'User decides',processCompleted:'Process completed',setupSchool:'Set Up My School',completeProcess:'Complete Process',continueAs:'Continue as'},
  hi:{pass:'इंस्टेंट डेमो पास',session:'निजी डेमो सत्र',handoff:'कनेक्टेड हैंड-ऑफ',received:'पिछले रोल से प्राप्त',synced:'इस मॉड्यूल में सिंक हुआ',impact:'पूरे सिस्टम पर प्रभाव',roles:'रोल जुड़े',changes:'वर्कफ़्लो बदलाव दर्ज',verified:'अगले रोल में सत्यापित',another:'दूसरी प्रक्रिया देखें',replay:'फिर चलाएँ',actualModule:'वास्तविक मॉड्यूल संदर्भ',automatedDemo:'डेमो में स्वचालित',userDecides:'निर्णय आप लेते हैं',processCompleted:'प्रक्रिया पूरी हुई',setupSchool:'मेरे स्कूल के लिए सेटअप करें',completeProcess:'प्रक्रिया पूरी करें',continueAs:'आगे इस रोल में जाएँ'},
  mr:{pass:'इन्स्टंट डेमो पास',session:'खाजगी डेमो सत्र',handoff:'कनेक्टेड हँड-ऑफ',received:'मागील रोलकडून प्राप्त',synced:'या मॉड्यूलमध्ये सिंक झाले',impact:'संपूर्ण सिस्टमवरील परिणाम',roles:'रोल जोडले',changes:'वर्कफ्लो बदल नोंदले',verified:'पुढील रोलमध्ये पडताळले',another:'दुसरी प्रक्रिया पाहा',replay:'पुन्हा चालवा',actualModule:'प्रत्यक्ष मॉड्यूल संदर्भ',automatedDemo:'डेमोसाठी स्वयंचलित',userDecides:'निर्णय तुम्ही घ्या',processCompleted:'प्रक्रिया पूर्ण झाली',setupSchool:'माझ्या शाळेसाठी सेटअप करा',completeProcess:'प्रक्रिया पूर्ण करा',continueAs:'पुढील भूमिकेत जा'},
  ur:{pass:'فوری ڈیمو پاس',session:'نجی ڈیمو سیشن',handoff:'منسلک حوالگی',received:'پچھلے رول سے موصول',synced:'اس ماڈیول میں ہم آہنگ',impact:'پورے نظام پر اثر',roles:'رول منسلک',changes:'ورک فلو تبدیلیاں محفوظ',verified:'اگلے رول میں تصدیق',another:'دوسرا عمل دیکھیں',replay:'دوبارہ چلائیں',actualModule:'اصل ماڈیول کا سیاق',automatedDemo:'ڈیمو میں خودکار',userDecides:'فیصلہ آپ کریں',processCompleted:'عمل مکمل ہوگیا',setupSchool:'میرے اسکول کے لیے سیٹ اپ کریں',completeProcess:'عمل مکمل کریں',continueAs:'اگلے رول کے طور پر جاری رکھیں'},
  gu:{pass:'ઇન્સ્ટન્ટ ડેમો પાસ',session:'ખાનગી ડેમો સત્ર',handoff:'કનેક્ટેડ હેન્ડ-ઓફ',received:'પાછલા રોલમાંથી મળ્યું',synced:'આ મોડ્યુલમાં સિંક થયું',impact:'સિસ્ટમ-વ્યાપી અસર',roles:'રોલ જોડાયા',changes:'વર્કફ્લો ફેરફારો નોંધાયા',verified:'આગલા રોલમાં ચકાસ્યું',another:'બીજી પ્રક્રિયા જુઓ',replay:'ફરી ચલાવો',actualModule:'વાસ્તવિક મોડ્યુલ સંદર્ભ',automatedDemo:'ડેમો માટે સ્વચાલિત',userDecides:'નિર્ણય તમે લો',processCompleted:'પ્રક્રિયા પૂર્ણ થઈ',setupSchool:'મારી શાળા માટે સેટઅપ કરો',completeProcess:'પ્રક્રિયા પૂર્ણ કરો',continueAs:'આગળના રોલ તરીકે ચાલુ રાખો'},
  bn:{pass:'ইনস্ট্যান্ট ডেমো পাস',session:'ব্যক্তিগত ডেমো সেশন',handoff:'সংযুক্ত হ্যান্ড-অফ',received:'আগের ভূমিকা থেকে এসেছে',synced:'এই মডিউলে সিঙ্ক হয়েছে',impact:'সিস্টেমজুড়ে প্রভাব',roles:'ভূমিকা যুক্ত',changes:'ওয়ার্কফ্লো পরিবর্তন রেকর্ড',verified:'পরের ভূমিকায় যাচাই',another:'অন্য প্রক্রিয়া দেখুন',replay:'আবার চালান'},
  ta:{pass:'உடனடி டெமோ பாஸ்',session:'தனிப்பட்ட டெமோ அமர்வு',handoff:'இணைக்கப்பட்ட ஒப்படைப்பு',received:'முந்தைய ரோலிலிருந்து வந்தது',synced:'இந்த மாட்யூலில் ஒத்திசைக்கப்பட்டது',impact:'முழு அமைப்பு தாக்கம்',roles:'ரோல்கள் இணைந்தன',changes:'workflow மாற்றங்கள் பதிவு',verified:'அடுத்த ரோலில் சரிபார்க்கப்பட்டது',another:'மற்றொரு செயல்முறையைப் பார்க்கவும்',replay:'மீண்டும் இயக்கவும்'},
  te:{pass:'ఇన్‌స్టంట్ డెమో పాస్',session:'ప్రైవేట్ డెమో సెషన్',handoff:'కనెక్టెడ్ హ్యాండ్-ఆఫ్',received:'మునుపటి రోల్ నుంచి వచ్చింది',synced:'ఈ మాడ్యూల్‌లో సింక్ అయింది',impact:'సిస్టమ్ మొత్తం ప్రభావం',roles:'రోల్స్ కనెక్ట్ అయ్యాయి',changes:'workflow మార్పులు నమోదయ్యాయి',verified:'తదుపరి రోల్‌లో ధృవీకరించబడింది',another:'మరొక ప్రక్రియ చూడండి',replay:'మళ్లీ నడపండి'},
  kn:{pass:'ಇನ್‌ಸ್ಟಂಟ್ ಡೆಮೋ ಪಾಸ್',session:'ಖಾಸಗಿ ಡೆಮೋ ಸೆಷನ್',handoff:'ಸಂಪರ್ಕಿತ ಹ್ಯಾಂಡ್-ಆಫ್',received:'ಹಿಂದಿನ role ನಿಂದ ಬಂದಿದೆ',synced:'ಈ module ಗೆ sync ಆಗಿದೆ',impact:'ಸಿಸ್ಟಮ್-ವ್ಯಾಪಿ ಪರಿಣಾಮ',roles:'roles ಸಂಪರ್ಕಗೊಂಡಿವೆ',changes:'workflow ಬದಲಾವಣೆಗಳು ದಾಖಲಾಗಿವೆ',verified:'ಮುಂದಿನ role ನಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',another:'ಮತ್ತೊಂದು ಪ್ರಕ್ರಿಯೆ ನೋಡಿ',replay:'ಮತ್ತೆ ಚಾಲನೆ ಮಾಡಿ'},
  ml:{pass:'ഇൻസ്റ്റന്റ് ഡെമോ പാസ്',session:'സ്വകാര്യ ഡെമോ സെഷൻ',handoff:'ബന്ധിപ്പിച്ച കൈമാറ്റം',received:'മുൻ റോളിൽ നിന്ന് ലഭിച്ചു',synced:'ഈ മോഡ്യൂളിലേക്ക് സിങ്ക് ചെയ്തു',impact:'സിസ്റ്റം മുഴുവൻ പ്രഭാവം',roles:'റോളുകൾ ബന്ധപ്പെട്ടു',changes:'workflow മാറ്റങ്ങൾ രേഖപ്പെടുത്തി',verified:'അടുത്ത റോളിൽ പരിശോധിച്ചു',another:'മറ്റൊരു പ്രക്രിയ കാണുക',replay:'വീണ്ടും പ്രവർത്തിപ്പിക്കുക'},
  or:{pass:'ଇନ୍‌ଷ୍ଟାଣ୍ଟ ଡେମୋ ପାସ୍',session:'ବ୍ୟକ୍ତିଗତ ଡେମୋ ସେସନ୍',handoff:'ସଂଯୁକ୍ତ ହ୍ୟାଣ୍ଡ-ଅଫ୍',received:'ପୂର୍ବ ରୋଲରୁ ଆସିଛି',synced:'ଏହି ମଡ୍ୟୁଲରେ ସିଙ୍କ ହୋଇଛି',impact:'ସମଗ୍ର ସିଷ୍ଟମ ପ୍ରଭାବ',roles:'ରୋଲ ସଂଯୁକ୍ତ',changes:'workflow ପରିବର୍ତ୍ତନ ରେକର୍ଡ',verified:'ପରବର୍ତ୍ତୀ ରୋଲରେ ଯାଞ୍ଚ',another:'ଅନ୍ୟ ପ୍ରକ୍ରିୟା ଦେଖନ୍ତୁ',replay:'ପୁଣି ଚଲାନ୍ତୁ'},
  pa:{pass:'ਇੰਸਟੈਂਟ ਡੈਮੋ ਪਾਸ',session:'ਨਿੱਜੀ ਡੈਮੋ ਸੈਸ਼ਨ',handoff:'ਕਨੈਕਟਡ ਹੈਂਡ-ਆਫ',received:'ਪਿਛਲੇ ਰੋਲ ਤੋਂ ਮਿਲਿਆ',synced:'ਇਸ ਮੋਡੀਊਲ ਵਿੱਚ ਸਿੰਕ ਹੋਇਆ',impact:'ਪੂਰੇ ਸਿਸਟਮ ਉੱਤੇ ਅਸਰ',roles:'ਰੋਲ ਜੁੜੇ',changes:'workflow ਬਦਲਾਅ ਦਰਜ',verified:'ਅਗਲੇ ਰੋਲ ਵਿੱਚ ਪੁਸ਼ਟੀ',another:'ਹੋਰ ਪ੍ਰਕਿਰਿਆ ਵੇਖੋ',replay:'ਦੁਬਾਰਾ ਚਲਾਓ'},
  as:{pass:'ইনষ্টেণ্ট ডেমো পাছ',session:'ব্যক্তিগত ডেমো ছেচন',handoff:'সংযুক্ত হেণ্ড-অফ',received:'আগৰ ৰোলৰ পৰা আহিছে',synced:'এই মডিউলত ছিংক হৈছে',impact:'সমগ্ৰ ছিষ্টেমৰ প্ৰভাৱ',roles:'ৰোল সংযুক্ত',changes:'workflow পৰিবর্তন ৰেকৰ্ড',verified:'পৰৱৰ্তী ৰোলত যাচাই',another:'আন প্ৰক্ৰিয়া চাওক',replay:'আকৌ চলাওক'}
};

Object.assign(CONNECTION_COPY,{
  brx:{pass:'इन्स्टेन्ट डेमो पास',session:'गावनि डेमो सेसन',handoff:'सोमोनदो ह्यान्ड-अफ',received:'सिगांनि रोल निफ्राय मोनबाय',synced:'बे मोडुलाव सिंक जाबाय',impact:'गासै सिस्टेमाव गोहोम',another:'गुबुन प्रक्रिया नाय',replay:'फिन खालाम'},
  doi:{pass:'इंस्टैंट डेमो पास',session:'निजी डेमो सैशन',handoff:'जुड़े दा हैंड-ऑफ',received:'पिछले रोल थमां मिली',synced:'इस मॉड्यूल च सिंक होई',impact:'पूरे सिस्टम दा असर',another:'होर प्रक्रिया दिक्खो',replay:'दोबारा चलाओ'},
  ks:{pass:'فوری ڈیمو پاس',session:'نجی ڈیمو سیشن',handoff:'منسلک حوالگی',received:'پچھم رول پٮ۪ٹھ موصول',synced:'یَتھ ماڈیولس منز ہم آہنگ',impact:'سارِس نظامس پیٹھ اثر',another:'بیٚیہ عمل وُچھِو',replay:'دوبارٕ چلٲو'},
  kok:{pass:'इन्स्टंट डेमो पास',session:'खाजगी डेमो सेशन',handoff:'जोडिल्लो हँड-ऑफ',received:'फाटल्या रोलाकडल्यान मेळ्ळें',synced:'ह्या मोड्युलांत सिंक जालें',impact:'सगळ्या सिस्टमाचो परिणाम',another:'दुसरी प्रक्रिया पळयात',replay:'परत चालू करात'},
  mai:{pass:'इंस्टेंट डेमो पास',session:'निजी डेमो सत्र',handoff:'जुड़ल हैंड-ऑफ',received:'पिछला रोल सँ प्राप्त',synced:'एहि मॉड्यूलमे सिंक भेल',impact:'पूरा सिस्टम पर प्रभाव',another:'दोसर प्रक्रिया देखू',replay:'फेर चलाउ'},
  mni:{pass:'ꯏꯟꯁꯇꯦꯟꯠ ꯗꯦꯃꯣ ꯄꯥꯁ',session:'ꯄ꯭ꯔꯥꯏꯚꯦꯠ ꯗꯦꯃꯣ ꯁꯦꯁꯟ',handoff:'ꯀꯅꯦꯛꯇꯦꯗ ꯍꯦꯟꯗ-ꯑꯣꯐ',received:'ꯃꯃꯥꯡ role ꯗꯒꯤ ꯐꯪꯂꯦ',synced:'ꯃꯁꯤ module ꯗꯥ sync ꯇꯧꯔꯦ',impact:'ꯁꯤꯁꯇꯦꯝ ꯄꯨꯝꯅꯃꯛꯀꯤ ꯏꯝꯄꯦꯛꯠ',another:'ꯑꯇꯩ process ꯌꯦꯡꯉꯨ',replay:'ꯑꯃꯨꯛ ꯆꯠꯊꯕꯤ'},
  ne:{pass:'इन्स्ट्यान्ट डेमो पास',session:'निजी डेमो सत्र',handoff:'जोडिएको ह्यान्ड-अफ',received:'अघिल्लो रोलबाट प्राप्त',synced:'यस मोड्युलमा सिंक भयो',impact:'सम्पूर्ण प्रणालीमा प्रभाव',another:'अर्को प्रक्रिया हेर्नुहोस्',replay:'फेरि चलाउनुहोस्'},
  sa:{pass:'तत्काल-प्रदर्शन-पत्रम्',session:'निज-प्रदर्शन-सत्रम्',handoff:'संयुक्त हस्तान्तरणम्',received:'पूर्वभूमिकातः प्राप्तम्',synced:'अस्मिन् मॉड्यूल् समन्वितम्',impact:'समग्र-प्रणाली-प्रभावः',another:'अन्यां प्रक्रियां पश्यतु',replay:'पुनः चलयतु'},
  sat:{pass:'ᱤᱱᱥᱴᱟᱱᱴ ᱰᱮᱢᱚ ᱯᱟᱥ',session:'ᱯᱨᱟᱭᱵᱷᱮᱴ ᱰᱮᱢᱚ ᱥᱮᱥᱚᱱ',handoff:'ᱠᱚᱱᱮᱠᱴᱮᱰ ᱦᱮᱱᱰ-ᱚᱯ',received:'ᱢᱟᱲᱟᱝ role ᱠᱷᱚᱱ ᱧᱟᱢ',synced:'ᱱᱚᱣᱟ module ᱨᱮ sync',impact:'ᱥᱤᱥᱴᱮᱢ ᱢᱩᱬᱩᱫ ᱯᱨᱚᱵᱷᱟᱵ',another:'ᱮᱴᱟᱜ process ᱧᱮᱞ',replay:'ᱫᱚᱦᱲᱟ ᱪᱟᱞᱟᱣ'},
  sd:{pass:'فوري ڊيمو پاس',session:'نجي ڊيمو سيشن',handoff:'ڳنڍيل حوالگي',received:'اڳئين رول کان مليو',synced:'هن ماڊيول ۾ سنڪ ٿيو',impact:'سڄي سسٽم تي اثر',another:'ٻيو عمل ڏسو',replay:'ٻيهر هلايو'}
});

function connectionCopy(languageCode:string):ConnectionCopy{const code=String(languageCode||'en').toLowerCase().split('-')[0];return{...(CONNECTION_COPY.en as ConnectionCopy),...(CONNECTION_COPY[code]||{})};}

const PROCESS_LANGUAGE_NAMES:Record<string,string>={en:'English',hi:'Hindi',ur:'Urdu',as:'Assamese',bn:'Bengali',brx:'Bodo',doi:'Dogri',gu:'Gujarati',kn:'Kannada',ks:'Kashmiri',kok:'Konkani',mai:'Maithili',ml:'Malayalam',mni:'Manipuri',mr:'Marathi',ne:'Nepali',or:'Odia',pa:'Punjabi',sa:'Sanskrit',sat:'Santali',sd:'Sindhi',ta:'Tamil',te:'Telugu'};
const PROCESS_RUNTIME_STRINGS=['Actual module context','Automated for demo','User decides','Process completed','The workflow did not end at a success message. Each action was carried into the next role/module and recorded in this temporary demo session.','Set Up My School','Complete Process','Continue as','Continue Connected Tour','Finish Connected Tour','Connected hand-off','Received from previous role','Synced into this module','System-wide impact','roles connected','workflow changes recorded','Verified in the next role','Explore Another Process','Replay'];

const STRICT_SUMMARY_COPY:Record<string,string>={
  hi:'यह प्रक्रिया केवल सफलता संदेश पर समाप्त नहीं हुई। हर कार्रवाई अगले जुड़े हुए रोल/मॉड्यूल तक पहुँची और इस अस्थायी डेमो सत्र में दर्ज हुई।',
  mr:'ही प्रक्रिया फक्त यशाच्या संदेशावर थांबली नाही. प्रत्येक कृती पुढील जोडलेल्या भूमिकेत/मॉड्यूलमध्ये पोहोचली आणि या तात्पुरत्या डेमो सत्रात नोंदली गेली.',
  ur:'یہ عمل صرف کامیابی کے پیغام پر ختم نہیں ہوا۔ ہر کارروائی اگلے منسلک رول/ماڈیول تک پہنچی اور اس عارضی ڈیمو سیشن میں محفوظ ہوئی۔',
};
const STRICT_EFFECT_COPY:Record<string,string>={
  hi:'यह बदलाव अगले जुड़े हुए रोल/मॉड्यूल में सुरक्षित रूप से लागू हो गया और डेमो सत्र में दर्ज है।',
  mr:'हा बदल पुढील जोडलेल्या भूमिकेत/मॉड्यूलमध्ये सुरक्षितपणे लागू झाला आणि डेमो सत्रात नोंदला गेला.',
  ur:'یہ تبدیلی اگلے منسلک رول/ماڈیول میں محفوظ طور پر لاگو ہوگئی اور ڈیمو سیشن میں درج ہے۔',
};
const STRICT_ACTION_COPY:Record<string,string>={
  hi:'निर्धारित कार्रवाई पूरी करें',
  mr:'निर्धारित कृती पूर्ण करा',
  ur:'مقررہ کارروائی مکمل کریں',
};
const HINDI_ACTION_EXACT:Record<string,string>={
  'Submit Marks to Class Teacher':'अंक कक्षा शिक्षक को जमा करें',
  'Send Accepted Lists to Result Book':'स्वीकृत सूचियाँ परिणाम पुस्तिका में भेजें',
  'Send to Progress Card & Clerk':'प्रगति पत्र और लिपिक को भेजें',
  'Open Smart Print Queue':'स्मार्ट प्रिंट कतार खोलें',
  'Mark Result Reviewed':'परिणाम की समीक्षा पूर्ण चिह्नित करें',
  'Publish & Lock':'प्रकाशित करें और लॉक करें',
  'Open Progress Card':'प्रगति पत्र खोलें',
  'Submit Application':'आवेदन जमा करें',
  'Approve Admission':'प्रवेश मंजूर करें',
  'Confirm Admission':'प्रवेश की पुष्टि करें',
  'Save Teaching Assignment':'शिक्षण असाइनमेंट सहेजें',
  'Save Attendance':'उपस्थिति सहेजें',
  'Publish Homework':'गृहकार्य प्रकाशित करें',
  'Generate Homework':'गृहकार्य तैयार करें',
  'Generate Question Paper':'प्रश्नपत्र तैयार करें',
  'Publish Timetable':'समय-सारिणी प्रकाशित करें',
  'Approve Leave':'अवकाश मंजूर करें',
  'Request Book':'पुस्तक का अनुरोध करें',
  'Issue Book':'पुस्तक जारी करें',
  'Create Staff Login':'स्टाफ लॉगिन बनाएँ',
  'Approve Payroll Run':'वेतन प्रक्रिया मंजूर करें',
  'Mark Paid':'भुगतान किया हुआ चिह्नित करें',
};

const HINDI_EFFECT_EXACT:Record<string,string>={
  'Subject Marks List enters Submitted state.':'विषय अंक सूची जमा स्थिति में चली जाती है।',
  'Subject Teacher cannot directly publish the class result.':'विषय शिक्षक सीधे कक्षा परिणाम प्रकाशित नहीं कर सकता।',
  'Accepted Subject Mark Lists become eligible for Result Book consolidation.':'स्वीकृत विषय अंक सूचियाँ परिणाम पुस्तिका में समेकन के लिए पात्र हो जाती हैं।',
  'A correction path remains available in production if a list is wrong.':'यदि सूची गलत हो तो वास्तविक सिस्टम में सुधार का मार्ग उपलब्ध रहता है।',
  'Progress Card data is prepared.':'प्रगति पत्र का डेटा तैयार हो जाता है।',
  'Clerk Result Print Center receives the print workflow item.':'लिपिक के Result Print Center में प्रिंट कार्य पहुँच जाता है।',
  'Office printing is separated from academic marks ownership.':'ऑफिस प्रिंटिंग को शैक्षणिक अंकों के स्वामित्व से अलग रखा जाता है।',
  'Publication gate is unlocked only after Headmaster review.':'प्रधानाध्यापक की समीक्षा के बाद ही प्रकाशन की अनुमति खुलती है।',
  'Published result becomes read-only for Student/Parent presentation.':'प्रकाशित परिणाम विद्यार्थी और अभिभावक के लिए केवल देखने योग्य हो जाता है।',
  'Final lock prevents silent post-publication edits.':'अंतिम लॉक प्रकाशन के बाद बिना अनुमति बदलाव को रोकता है।',
  'The same published result reaches the linked Parent without duplicating academic data.':'वही प्रकाशित परिणाम बिना शैक्षणिक डेटा की नकल किए जुड़े हुए अभिभावक तक पहुँचता है।',
};
function localizedRoleTitle(role:ProcessRole,languageCode:string){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  if(code==='hi')return({headmaster:'प्रधानाध्यापक',clerk:'लिपिक',teacher:'शिक्षक / कक्षा शिक्षक',student:'विद्यार्थी',parent:'अभिभावक',super_admin:'सुपर एडमिन'} as Record<ProcessRole,string>)[role];
  if(code==='mr')return({headmaster:'मुख्याध्यापक',clerk:'लिपिक',teacher:'शिक्षक / वर्गशिक्षक',student:'विद्यार्थी',parent:'पालक',super_admin:'सुपर अॅडमिन'} as Record<ProcessRole,string>)[role];
  if(code==='ur')return({headmaster:'ہیڈماسٹر',clerk:'کلرک',teacher:'استاد / کلاس ٹیچر',student:'طالب علم',parent:'والدین',super_admin:'سپر ایڈمن'} as Record<ProcessRole,string>)[role];
  return roleTitle[role];
}

type RunnerMicroCopy={step:string;of:string;restart:string;demoAccount:string;currentModule:string;actualNavigation:string;exploreFull:string;demoSafe:string;temporaryData:string;reviewIntro:string;viewIntro:string;selectionIntro:string;formIntro:string;selected:string;chooseFile:string};
const RUNNER_MICRO_COPY:Record<string,RunnerMicroCopy>={
  en:{step:'Step',of:'of',restart:'Restart',demoAccount:'Demo Account',currentModule:'Current production module',actualNavigation:'Actual role navigation',exploreFull:'Explore full role',demoSafe:'Demo-safe',temporaryData:'Temporary sample data',reviewIntro:'Submitted information is already available for review.',viewIntro:'This role is viewing information that already exists in the connected workflow.',selectionIntro:'The required choices are ready in the same control pattern used by this workflow.',formIntro:'This step contains genuine data-entry controls before submission.',selected:'Selected',chooseFile:'Choose File'},
  hi:{step:'चरण',of:'में से',restart:'फिर शुरू करें',demoAccount:'डेमो खाता',currentModule:'वर्तमान वास्तविक मॉड्यूल',actualNavigation:'वास्तविक रोल नेविगेशन',exploreFull:'पूरा रोल देखें',demoSafe:'सुरक्षित डेमो',temporaryData:'अस्थायी नमूना डेटा',reviewIntro:'जमा की गई जानकारी समीक्षा के लिए पहले से उपलब्ध है।',viewIntro:'यह रोल जुड़े हुए वर्कफ़्लो में पहले से मौजूद जानकारी देख रहा है।',selectionIntro:'आवश्यक विकल्प उसी नियंत्रण शैली में तैयार हैं जो वास्तविक वर्कफ़्लो में उपयोग होती है।',formIntro:'इस चरण में जमा करने से पहले वास्तविक डेटा-एंट्री नियंत्रण हैं।',selected:'चुना गया',chooseFile:'फ़ाइल चुनें'},
  mr:{step:'टप्पा',of:'पैकी',restart:'पुन्हा सुरू करा',demoAccount:'डेमो खाते',currentModule:'सध्याचे प्रत्यक्ष मॉड्यूल',actualNavigation:'प्रत्यक्ष भूमिका नेव्हिगेशन',exploreFull:'पूर्ण भूमिका पाहा',demoSafe:'सुरक्षित डेमो',temporaryData:'तात्पुरता नमुना डेटा',reviewIntro:'सबमिट केलेली माहिती तपासणीसाठी आधीपासून उपलब्ध आहे.',viewIntro:'ही भूमिका जोडलेल्या वर्कफ्लोमध्ये आधीपासून असलेली माहिती पाहत आहे.',selectionIntro:'आवश्यक पर्याय प्रत्यक्ष वर्कफ्लोमध्ये वापरल्या जाणाऱ्या नियंत्रण पद्धतीत तयार आहेत.',formIntro:'या टप्प्यात सबमिट करण्यापूर्वी प्रत्यक्ष डेटा-एंट्री नियंत्रण आहेत.',selected:'निवडले',chooseFile:'फाइल निवडा'},
  ur:{step:'مرحلہ',of:'میں سے',restart:'دوبارہ شروع کریں',demoAccount:'ڈیمو اکاؤنٹ',currentModule:'موجودہ اصل ماڈیول',actualNavigation:'اصل رول نیویگیشن',exploreFull:'مکمل رول دیکھیں',demoSafe:'محفوظ ڈیمو',temporaryData:'عارضی نمونہ ڈیٹا',reviewIntro:'جمع شدہ معلومات جائزے کے لیے پہلے سے موجود ہیں۔',viewIntro:'یہ رول منسلک ورک فلو میں پہلے سے موجود معلومات دیکھ رہا ہے۔',selectionIntro:'ضروری انتخاب اسی کنٹرول انداز میں تیار ہیں جو اصل ورک فلو میں استعمال ہوتا ہے۔',formIntro:'اس مرحلے میں جمع کرنے سے پہلے حقیقی ڈیٹا انٹری کنٹرول موجود ہیں۔',selected:'منتخب',chooseFile:'فائل منتخب کریں'}
};
function runnerMicroCopy(languageCode:string):RunnerMicroCopy{const code=String(languageCode||'en').toLowerCase().split('-')[0];return RUNNER_MICRO_COPY[code]||RUNNER_MICRO_COPY.en;}
function strictRuntimeFallback(text:string,languageCode:string,copy:ReturnType<typeof getProcessDemoCopy>,ccopy:ConnectionCopy){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  if(code==='en')return text;
  const runtime:Record<string,string>={
    'Actual module context':ccopy.actualModule,
    'Automated for demo':ccopy.automatedDemo,
    'User decides':ccopy.userDecides,
    'Process completed':ccopy.processCompleted,
    'Set Up My School':ccopy.setupSchool,
    'Complete Process':ccopy.completeProcess,
    'Continue as':ccopy.continueAs,
    'Connected hand-off':ccopy.handoff,
    'Received from previous role':ccopy.received,
    'Synced into this module':ccopy.synced,
    'System-wide impact':ccopy.impact,
    'roles connected':ccopy.roles,
    'workflow changes recorded':ccopy.changes,
    'Verified in the next role':ccopy.verified,
    'Explore Another Process':ccopy.another,
    'Replay':ccopy.replay,
    'Continue Connected Tour':ccopy.continueAs,
    'Finish Connected Tour':ccopy.completeProcess,
    'The workflow did not end at a success message. Each action was carried into the next role/module and recorded in this temporary demo session.':STRICT_SUMMARY_COPY[code]||copy.whatHappened,
  };
  const candidate=runtime[text];
  const english=(CONNECTION_COPY.en as ConnectionCopy);
  if(candidate && !Object.values(english).includes(candidate))return candidate;
  if(text==='Actual module context')return copy.yourAction;
  if(text==='Automated for demo')return copy.whatHappened;
  if(text==='User decides')return copy.yourAction;
  if(text==='Process completed'||text==='Complete Process'||text==='Finish Connected Tour')return copy.whatHappened;
  if(text==='Continue as'||text==='Continue Connected Tour')return copy.resume;
  return copy.whatHappened;
}
function strictActionFallback(text:string,languageCode:string,copy:ReturnType<typeof getProcessDemoCopy>){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  if(code==='en')return text;
  if(code==='hi'&&HINDI_ACTION_EXACT[text])return HINDI_ACTION_EXACT[text];
  return STRICT_ACTION_COPY[code]||copy.yourAction;
}
function strictEffectFallback(text:string,languageCode:string,copy:ReturnType<typeof getProcessDemoCopy>){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  if(code==='en')return text;
  if(code==='hi'&&HINDI_EFFECT_EXACT[text])return HINDI_EFFECT_EXACT[text];
  return STRICT_EFFECT_COPY[code]||copy.whatHappened;
}
function useProcessNarrative(process:DemoProcess,languageCode:string){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  const copy=useMemo(()=>getProcessDemoCopy(languageCode),[languageCode]);
  const ccopy=useMemo(()=>connectionCopy(languageCode),[languageCode]);
  const actionSet=useMemo(()=>new Set(process.steps.map(step=>step.actionLabel)),[process]);
  const effectSet=useMemo(()=>new Set(process.steps.flatMap(step=>step.effect)),[process]);
  const strings=useMemo(()=>Array.from(new Set([...process.steps.flatMap(step=>[step.actionLabel,...step.effect]),...PROCESS_RUNTIME_STRINGS])),[process]);
  const [translated,setTranslated]=useState<Record<string,string>>({});
  useEffect(()=>{
    let cancelled=false;
    if(code==='en'){setTranslated({});return()=>{cancelled=true};}
    const cacheKey=`edunixo.demo.process-copy.r263:${process.id}:${code}`;
    try{const cached=sessionStorage.getItem(cacheKey);if(cached){const parsed=JSON.parse(cached);if(parsed&&typeof parsed==='object'){setTranslated(parsed);return()=>{cancelled=true};}}}catch{}
    fetch('/api/public/demo-process/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({languageCode:code,languageName:PROCESS_LANGUAGE_NAMES[code]||code,strings})})
      .then(async r=>{const p=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(p?.strings)||p.strings.length!==strings.length)throw new Error(p?.error||'Translation unavailable');return p.strings as string[];})
      .then(items=>{if(cancelled)return;const map:Record<string,string>={};strings.forEach((text,i)=>{const value=String(items[i]||'').trim();if(value&&value!==text)map[text]=value;});setTranslated(map);try{sessionStorage.setItem(cacheKey,JSON.stringify(map));}catch{}})
      .catch(()=>{if(!cancelled)setTranslated({});});
    return()=>{cancelled=true};
  },[code,process.id,strings]);
  return (text:string)=>{
    if(code==='en')return text;
    const remote=translated[text];
    if(remote&&remote.trim()&&remote.trim()!==text.trim())return remote;
    if(actionSet.has(text))return strictActionFallback(text,languageCode,copy);
    if(effectSet.has(text))return strictEffectFallback(text,languageCode,copy);
    return strictRuntimeFallback(text,languageCode,copy,ccopy);
  };
}

const TEN_MINUTE_TOUR_IDS=['teacher-assignment','attendance','homework','result-management'];
const EXECUTIVE_TOUR=[
  {title:'Control the school from one command layer',body:'Headmaster approvals, academic setup, staff decisions and publication gates remain role-scoped while connected data moves across modules.'},
  {title:'Automate repetitive work — keep human decisions',body:'Classtago prepares sample entry, selections and AI-ready context, but Submit, Approve, Assign, Generate and Publish remain deliberate user actions.'},
  {title:'See one action appear in another role',body:'Attendance, homework, admissions and results are demonstrated as connected hand-offs instead of isolated pages.'},
  {title:'Use AI where it adds real academic value',body:'Study Material, AI teaching work, Homework and Question Paper workflows stay grounded in class, subject and selected source context.'},
  {title:'Finish with Student and Parent outcomes',body:'The demo proves the downstream result: published homework, attendance, account access and Progress Cards reach the correct role view.'}
];

export default function ProcessDemoHub(props:Props){
  const [selected,setSelected]=useState<DemoProcess|null>(null);
  const [category,setCategory]=useState<'All'|typeof PROCESS_CATEGORIES[number]>('All');
  const [query,setQuery]=useState('');
  const [executiveTourStep,setExecutiveTourStep]=useState<number|null>(null);
  const [tourPlan,setTourPlan]=useState<{ids:string[];index:number;label:string}|null>(null);
  const [tourNotice,setTourNotice]=useState('');
  const [conversionOpen,setConversionOpen]=useState(false);
  const locale=useMemo(()=>buildDemoLocaleData({familyCode:props.familyCode,jurisdictionCode:props.jurisdictionCode,jurisdictionName:props.jurisdictionName,medium:props.medium,boardName:props.boardName}),[props.familyCode,props.jurisdictionCode,props.jurisdictionName,props.medium,props.boardName]);
  const ccopy=useMemo(()=>connectionCopy(props.languageCode),[props.languageCode]);
  const eventCount=props.sessionEvents?.length||0;
  const exploredIds=useMemo(()=>new Set((props.sessionEvents||[]).map(e=>e.processId)),[props.sessionEvents]);
  const completedIds=useMemo(()=>new Set(DEMO_PROCESSES.filter(p=>{const last=p.steps[p.steps.length-1];return last&&(props.sessionEvents||[]).some(e=>e.processId===p.id&&e.stepId===last.id);}).map(p=>p.id)),[props.sessionEvents]);
  const visible=useMemo(()=>DEMO_PROCESSES.filter(p=>{
    if(category!=='All'&&p.category!==category)return false;
    const q=query.trim().toLowerCase();
    return !q||`${p.title} ${p.short} ${p.description} ${p.category}`.toLowerCase().includes(q);
  }),[category,query]);

  const launchTenMinuteTour=()=>{const first=DEMO_PROCESSES.find(p=>p.id===TEN_MINUTE_TOUR_IDS[0]);if(!first)return;setTourPlan({ids:TEN_MINUTE_TOUR_IDS,index:0,label:'10-minute Connected School Tour'});setSelected(first);setTourNotice('');};
  const nextTourProcess=()=>{if(!tourPlan){setSelected(null);return;}const nextIndex=tourPlan.index+1;if(nextIndex>=tourPlan.ids.length){setTourPlan(null);setSelected(null);setTourNotice('Connected School Tour completed — you saw assignment, attendance, homework and result hand-offs.');return;}const next=DEMO_PROCESSES.find(p=>p.id===tourPlan.ids[nextIndex]);if(!next){setTourPlan(null);setSelected(null);return;}setTourPlan({...tourPlan,index:nextIndex});setSelected(next);};
  const openProcess=(p:DemoProcess)=>{setTourPlan(null);setSelected(p);setTourNotice('');};
  if(selected)return <><ProcessRunner process={selected} locale={locale} boardName={props.boardName} medium={props.medium} languageCode={props.languageCode} sessionEvents={props.sessionEvents||[]} onBack={()=>{setSelected(null);setTourPlan(null)}} onOpenRole={props.onOpenRole} onSignal={props.onSignal} onRequestSetup={()=>setConversionOpen(true)} tourMeta={tourPlan?{label:tourPlan.label,position:tourPlan.index+1,total:tourPlan.ids.length,hasNext:tourPlan.index<tourPlan.ids.length-1}:undefined} onTourNext={nextTourProcess}/>{conversionOpen&&<ConversionModal props={props} completedIds={completedIds} onClose={()=>setConversionOpen(false)}/>}</>;

  return <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07111f] text-white" dir={instructionDirection(props.languageCode)}>
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={props.onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 hover:bg-white/5"><ArrowLeft className="h-4 w-4"/></button>
          <div className="min-w-0"><div className="truncate text-sm font-black">Classtago Process Demo</div><div className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-cyan-300">{props.boardName} · {props.medium} Medium</div><div className="mt-0.5 truncate text-[8px] font-bold text-slate-600">{ccopy.pass} · {props.visitorName||'Visitor'}{props.institutionName?` · ${props.institutionName}`:''}</div></div>
        </div>
        <button onClick={()=>props.onOpenRole('headmaster')} className="hidden shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black sm:block">Explore by Role</button>
      </div>
    </header>

    <main className="mx-auto w-full max-w-[100rem] overflow-hidden px-4 py-7 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/15 via-white/[.04] to-violet-400/10 p-5 sm:p-9">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">Experience complete school systems</p>
            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Which school process do you want to experience?</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Each process follows the real role hand-off. The demo automates only repetitive work, while important actions such as Submit, Approve, Assign, Generate and Publish stay in your control.</p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <Stat value={`${DEMO_PROCESSES.length}`} label="Connected processes"/>
            <Stat value="5+" label="Role hand-offs"/>
            <Stat value="Real" label="Control behavior"/>
            <Stat value={`${eventCount}`} label="Session changes"/>
          </div>
        </div>
      </section>

      {tourNotice&&<div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-xs font-bold text-emerald-100">{tourNotice}</div>}

      <section className="mt-6"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Choose your experience</p><h2 className="mt-1 text-xl font-black">Start with the depth you want</h2></div><div className="hidden text-[9px] font-bold text-slate-500 sm:block">Private session analytics · {completedIds.size}/{DEMO_PROCESSES.length} processes completed</div></div><div className="grid gap-3 lg:grid-cols-4">
        <ExperienceMode icon={<Clock3 className="h-5 w-5"/>} eyebrow="3 MINUTES" title="Executive Tour" text="A fast management-level view of control, automation, AI and connected outcomes." action="Start 3-minute tour" onClick={()=>setExecutiveTourStep(0)}/>
        <ExperienceMode icon={<Rocket className="h-5 w-5"/>} eyebrow="ABOUT 10 MINUTES" title="Connected School Tour" text="Interact with Teacher Assignment → Attendance → Homework → Result Management." action="Start interactive tour" onClick={launchTenMinuteTour}/>
        <ExperienceMode icon={<Compass className="h-5 w-5"/>} eyebrow="YOUR CHOICE" title="Explore 25 Processes" text="Search any school system and run the exact role-to-role workflow you care about." action="Browse below" onClick={()=>document.getElementById('demo-process-browser')?.scrollIntoView({behavior:'smooth'})}/>
        <ExperienceMode icon={<UserRound className="h-5 w-5"/>} eyebrow="DEEP DIVE" title="Explore by Role" text="Inspect actual Headmaster, Clerk, Teacher, Student or Parent module blueprints." action="Open Role Explorer" onClick={()=>props.onOpenRole('headmaster')}/>
      </div></section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3"><Stat value={`${exploredIds.size}`} label="Processes explored"/><Stat value={`${completedIds.size}`} label="Processes completed"/><Stat value={`${eventCount}`} label="Decisions / hand-offs"/></section>

      <section id="demo-process-browser" className="mt-6 min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search process — admission, result, timetable, homework…" className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-3 text-xs font-bold outline-none placeholder:text-slate-600 focus:border-cyan-300/40"/></div>
          <div className="min-w-0 break-words text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Demo school: {locale.schoolName}</div>
        </div>
        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
          {(['All',...PROCESS_CATEGORIES] as const).map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black ${category===c?'bg-cyan-300 text-slate-950':'border border-white/10 bg-slate-950 text-slate-300'}`}>{c}</button>)}
        </div>
      </section>

      <section className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(p=><button key={p.id} onClick={()=>openProcess(p)} className={`group relative min-w-0 overflow-hidden rounded-[1.5rem] border p-5 text-left transition hover:-translate-y-0.5 ${p.importance==='hero'?'border-cyan-300/25 bg-gradient-to-br from-cyan-300/[.09] to-white/[.035]':'border-white/10 bg-white/[.035]'}`}>
          <div className="flex min-w-0 items-start justify-between gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950">{p.number}</div><div className="flex min-w-0 flex-col items-end gap-2"><span className={`max-w-full rounded-full px-2.5 py-1 text-right text-[8px] font-black uppercase tracking-wider ${p.tier==='live'?'bg-emerald-300/15 text-emerald-200':'bg-violet-300/15 text-violet-200'}`}>{p.tier==='live'?'Interactive Process':'Guided Process'}</span><span className="text-[8px] font-bold text-slate-500">{p.steps.length} steps{(props.sessionEvents||[]).some(e=>e.processId===p.id)?' · session active':''}</span></div></div>
          <h2 className="mt-5 break-words text-lg font-black leading-6">{p.title}</h2>
          <p className="mt-2 min-h-12 break-words text-[11px] leading-5 text-slate-400">{p.steps.length}-step connected workflow using the relevant Classtago roles and production modules.</p>
          <div className="mt-5 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="min-w-0 break-words text-[9px] font-black uppercase tracking-wider text-slate-500">{p.category}</span><span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-cyan-300">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1"/></span></div>
        </button>)}
      </section>

      <section className="mt-7 flex min-w-0 flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><div className="text-sm font-black">Need to inspect a role instead?</div><p className="mt-1 break-words text-[10px] leading-5 text-slate-500">Process Demo is the main experience. Role Explorer remains available for detailed module-by-module inspection and multilingual feature manuals.</p></div>
        <button onClick={()=>props.onOpenRole('headmaster')} className="w-full shrink-0 rounded-xl bg-white px-4 py-3 text-[10px] font-black text-slate-950 sm:w-auto">Open Role Explorer</button>
      </section>
    </main>
    {executiveTourStep!==null&&<ExecutiveTour step={executiveTourStep} onClose={()=>setExecutiveTourStep(null)} onNext={()=>setExecutiveTourStep(i=>i===null?null:i>=EXECUTIVE_TOUR.length-1?null:i+1)} onTry={()=>{const p=DEMO_PROCESSES.find(x=>x.id==='result-management');setExecutiveTourStep(null);if(p)openProcess(p);}}/>}
    {conversionOpen&&<ConversionModal props={props} completedIds={completedIds} onClose={()=>setConversionOpen(false)}/>}
  </div>;
}

function ProcessRunner({process,locale,boardName,medium,languageCode,sessionEvents,onBack,onOpenRole,onSignal,onRequestSetup,tourMeta,onTourNext}:{process:DemoProcess;locale:ReturnType<typeof buildDemoLocaleData>;boardName:string;medium:string;languageCode:string;sessionEvents:SessionEvent[];onBack:()=>void;onOpenRole:(role:DemoRole)=>void;onSignal?:Props['onSignal'];onRequestSetup?:()=>void;tourMeta?:{label:string;position:number;total:number;hasNext:boolean};onTourNext?:()=>void}){
  const [stepIndex,setStepIndex]=useState(0);
  const [actionDone,setActionDone]=useState(false);
  const [completed,setCompleted]=useState(false);
  const [guideStarted,setGuideStarted]=useState(false);
  const [guidePaused,setGuidePaused]=useState(false);
  const [runEvents,setRunEvents]=useState<ProcessSignal[]>([]);
  const step=process.steps[stepIndex];
  const mode=useMemo(()=>step.interaction||deriveStepMode(process.id,step),[process.id,step]);
  const fields=useMemo(()=>step?step.autoFields.map(f=>resolveField(f,locale,boardName,medium,mode,languageCode)):[],[step,locale,boardName,medium,mode]);
  const guide=useGuidedInteraction(fields,`${process.id}:${step?.id||''}`,guideStarted&&!guidePaused,mode);
  const roleName=getRoleName(step.role,locale);
  const next=process.steps[stepIndex+1];
  const modules=useMemo(()=>roleDemoModules(step.role as DemoRole),[step.role]);
  const matched=useMemo(()=>matchModule(modules,step.moduleKeyword),[modules,step.moduleKeyword]);
  const sidebar=useMemo(()=>matched?[matched,...modules.filter(m=>m.id!==matched.id).slice(0,7)]:modules.slice(0,8),[modules,matched]);
  const copy=useMemo(()=>getProcessDemoCopy(languageCode),[languageCode]);
  const instructionDir=instructionDirection(languageCode);
  const ccopy=useMemo(()=>connectionCopy(languageCode),[languageCode]);
  const micro=useMemo(()=>runnerMicroCopy(languageCode),[languageCode]);
  const narrative=useProcessNarrative(process,languageCode);
  const displayAction=(target:ProcessStep)=>narrative(target.actionLabel);
  const displayEffects=(target:ProcessStep)=>target.effect.map(effect=>resolveText(narrative(effect),locale,boardName,medium));
  const previous=stepIndex>0?process.steps[stepIndex-1]:null;
  const previousEvent=previous?[...sessionEvents,...runEvents.map(e=>({...e,at:Date.now()}))].reverse().find(e=>e.processId===process.id&&e.stepId===previous.id):undefined;

  useEffect(()=>{setActionDone(false);setGuideStarted(false);setGuidePaused(false);},[stepIndex,process.id]);

  const startGuide=()=>{setGuideStarted(true);setGuidePaused(false);};
  const act=()=>{
    if(!guideStarted||!guide.done||actionDone)return;
    const signal:ProcessSignal={processId:process.id,stepId:step.id,role:step.role,actionLabel:step.actionLabel,moduleKeyword:step.moduleKeyword,screen:step.screen,effects:step.effect.map(e=>resolveText(e,locale,boardName,medium))};
    setActionDone(true);
    setRunEvents(events=>[...events,signal]);
    onSignal?.(signal);
  };
  const advance=()=>{
    if(next){setStepIndex(i=>i+1);setActionDone(false);setGuideStarted(false);setGuidePaused(false);}
    else setCompleted(true);
  };
  const restart=()=>{setStepIndex(0);setActionDone(false);setCompleted(false);setGuideStarted(false);setGuidePaused(false);setRunEvents([]);};

  if(completed){
    const roles=new Set(runEvents.map(e=>e.role));
    return <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07111f] text-white"><div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10"><div dir={instructionDir} className="w-full min-w-0 rounded-[2rem] border border-emerald-300/25 bg-gradient-to-br from-emerald-300/10 to-cyan-300/[.05] p-6 sm:p-10"><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-300 text-slate-950"><CheckCircle2 className="h-8 w-8"/></div>{tourMeta&&<p className="mt-6 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">{tourMeta.label} · {tourMeta.position}/{tourMeta.total}</p>}<p className={tourMeta?'mt-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300':'mt-6 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300'}>{narrative('Process completed')}</p><h1 className="mt-3 break-words text-3xl font-black sm:text-4xl">{process.title}</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{narrative('The workflow did not end at a success message. Each action was carried into the next role/module and recorded in this temporary demo session.')}</p></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3"><Stat value={`${roles.size}`} label={narrative('roles connected')}/><Stat value={`${runEvents.length}`} label={narrative('workflow changes recorded')}/><Stat value="✓" label={narrative('Verified in the next role')}/></div>
      <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-4 sm:p-5"><div className="flex items-center gap-2 text-cyan-300"><Layers3 className="h-4 w-4"/><span className="text-[10px] font-black uppercase tracking-[.18em]">{narrative('System-wide impact')}</span></div><div className="mt-4 space-y-3">{runEvents.map((e,i)=>{const sourceStep=process.steps.find(item=>item.id===e.stepId);const action=sourceStep?displayAction(sourceStep):e.actionLabel;const effects=sourceStep?displayEffects(sourceStep):e.effects;return <div key={`${e.stepId}-${i}`} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{i+1}. {localizedRoleTitle(e.role,languageCode)} · {e.moduleKeyword}</div>{i<runEvents.length-1&&<div className="text-[8px] font-black uppercase tracking-wider text-emerald-300">→ {localizedRoleTitle(process.steps[Math.min(i+1,process.steps.length-1)].role,languageCode)}</div>}</div><div className="mt-1 text-xs font-black">{action}</div><div className="mt-2 grid gap-1 sm:grid-cols-2">{effects.slice(0,4).map((effect,j)=><div key={j} className="flex gap-2 text-[9px] leading-5 text-slate-400"><Check className="mt-1 h-3 w-3 shrink-0 text-emerald-300"/><span>{effect}</span></div>)}</div></div>})}</div></div>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">{tourMeta?<button onClick={onTourNext} className="w-full rounded-xl bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 sm:w-auto">{narrative(tourMeta.hasNext?'Continue Connected Tour':'Finish Connected Tour')}<ArrowRight className="ml-1 inline h-4 w-4"/></button>:<button onClick={onBack} className="w-full rounded-xl bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 sm:w-auto">{narrative('Explore Another Process')}</button>}<button onClick={onRequestSetup} className="w-full rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950 sm:w-auto">{narrative('Set Up My School')}</button><button onClick={restart} className="w-full rounded-xl border border-white/10 px-5 py-3 text-xs font-black sm:w-auto"><RotateCcw className="mr-1 inline h-4 w-4"/>{narrative('Replay')}</button></div></div></div></div>;
  }

  const statusText=!guideStarted?copy.waiting:guide.done?copy.readyDecision:guidePaused?`${copy.paused} · ${guide.progress}%`:`${guidanceProgress(copy,mode)}… ${guide.progress}%`;

  return <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07111f] text-white">
    <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"><button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10"><ArrowLeft className="h-4 w-4"/></button><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{process.title}</div><div className="truncate text-[9px] font-black uppercase tracking-[.12em] text-cyan-300 sm:tracking-[.15em]">{micro.step} {stepIndex+1} {micro.of} {process.steps.length} · {localizedRoleTitle(step.role,languageCode)}</div></div></div>
        <button onClick={restart} aria-label={micro.restart} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-[9px] font-black sm:flex sm:h-auto sm:w-auto sm:px-3 sm:py-2"><RotateCcw className="h-3.5 w-3.5 sm:mr-1"/><span className="hidden sm:inline">{micro.restart}</span></button>
      </div>
    </header>

    <main className="mx-auto w-full max-w-[100rem] overflow-hidden px-3 py-4 sm:px-5 sm:py-6">
      <MobileStepSummary process={process} stepIndex={stepIndex} languageCode={languageCode} translateAction={displayAction}/>
      <DesktopStepTracker process={process} stepIndex={stepIndex} languageCode={languageCode} translateAction={displayAction}/>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 p-3 xl:sticky xl:top-20">
          <div className="min-w-0 rounded-xl bg-gradient-to-br from-cyan-300/15 to-violet-400/10 p-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-slate-950"><UserRound className="h-5 w-5"/></div><div className="min-w-0"><div className="truncate text-xs font-black">{roleName}</div><div className="break-words text-[8px] font-black uppercase tracking-wider text-cyan-300">{localizedRoleTitle(step.role,languageCode)} · {micro.demoAccount}</div></div></div></div>
          <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 sm:hidden"><div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{micro.currentModule}</div><div className="mt-1 break-words text-[11px] font-black text-cyan-200">{matched?.label||step.screen}</div></div>
          <div className="mt-4 hidden px-2 text-[8px] font-black uppercase tracking-[.16em] text-slate-600 sm:block">{micro.actualNavigation}</div>
          <div className="mt-2 hidden min-w-0 flex-wrap gap-2 sm:flex xl:block xl:space-y-1.5">{sidebar.map(m=><div key={m.id} className={`min-w-0 max-w-full rounded-xl px-3 py-2.5 text-[10px] font-bold xl:w-full ${matched?.id===m.id?'bg-cyan-300 text-slate-950':'border border-white/5 bg-white/[.025] text-slate-400'}`}><span className="break-words">{m.label}</span>{m.additionalDuty&&<span className="ml-1 rounded bg-violet-300/15 px-1 text-[7px] text-violet-200">Duty</span>}</div>)}</div>
          <button onClick={()=>onOpenRole(step.role as DemoRole)} className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2.5 text-[9px] font-black">{micro.exploreFull} · {localizedRoleTitle(step.role,languageCode)}</button>
        </aside>

        <section className="min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.035] p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="break-words text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">{step.screen}</div><h1 className="mt-2 break-words text-2xl font-black sm:text-3xl">{step.title}</h1><p className="mt-2 max-w-3xl break-words text-xs leading-6 text-slate-400">{mode==='review'?micro.reviewIntro:mode==='view'?micro.viewIntro:mode==='selection'?micro.selectionIntro:micro.formIntro}</p></div><div className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 lg:w-auto"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300"/><div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-wider text-emerald-300">{micro.demoSafe}</div><div className="break-words text-[9px] text-slate-500">{micro.temporaryData}</div></div></div></div>

            {previous&&previousEvent&&<div dir={instructionDir} className="mt-5 rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-300/[.08] to-cyan-300/[.05] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.18em]">{narrative('Connected hand-off')}</span></div><h2 className="mt-2 text-sm font-black">{narrative('Received from previous role')}: {localizedRoleTitle(previous.role,languageCode)} → {localizedRoleTitle(step.role,languageCode)}</h2><p className="mt-1 text-[10px] leading-5 text-slate-400">{previous?displayAction(previous):previousEvent.actionLabel}</p><div className="mt-3 grid gap-1 sm:grid-cols-2">{(previous?displayEffects(previous):previousEvent.effects).slice(0,4).map((effect,i)=><div key={i} className="flex gap-2 text-[9px] leading-5 text-slate-400"><Check className="mt-1 h-3 w-3 shrink-0 text-emerald-300"/><span>{effect}</span></div>)}</div></div><div className="shrink-0 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[9px] font-black text-emerald-200">{narrative('Synced into this module')}: {matched?.label||step.moduleKeyword}</div></div></div>}

            {!guideStarted&&<div dir={instructionDir} className="mt-5 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[.08] to-violet-300/[.04] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-cyan-300"><Play className="h-4 w-4"/><span className="text-[10px] font-black uppercase tracking-[.18em]">{copy.readyBadge}</span></div><h2 className="mt-2 text-base font-black">{copy.readyTitle}</h2><p className="mt-2 max-w-3xl text-[11px] leading-6 text-slate-300">{guidanceInstruction(copy,mode)}</p></div><button onClick={startGuide} className="w-full shrink-0 rounded-xl bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 shadow-[0_0_30px_rgba(103,232,249,.18)] sm:w-auto"><Play className="mr-1 inline h-4 w-4"/>{copy.startProcess}</button></div>
            </div>}

            <div className="mt-5 min-w-0 rounded-2xl border border-white/10 bg-[#0b1728] p-4 sm:p-5">
              <div dir={instructionDir} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><WandSparkles className="h-4 w-4 shrink-0 text-cyan-300"/><span className="break-words text-[10px] font-black uppercase tracking-wider">{guidancePanelTitle(copy,mode)}</span></div><div className="flex min-w-0 items-center gap-2"><div className="break-words text-[9px] font-bold text-slate-500">{statusText}</div>{guideStarted&&!guide.done&&<button onClick={()=>setGuidePaused(v=>!v)} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-black text-slate-300">{guidePaused?<><Play className="mr-1 inline h-3 w-3"/>{copy.resume}</>:<><Pause className="mr-1 inline h-3 w-3"/>{copy.pause}</>}</button>}</div></div>
              <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">{fields.map((f,i)=><GuidedField key={`${f.label}-${i}`} field={f} mode={mode} started={guideStarted} paused={guidePaused} value={guide.display(i)} revealed={guide.revealed(i)} active={guide.activeField===i&&!guide.done} copy={copy} micro={micro}/>)}</div>
            </div>

            {!actionDone&&guideStarted&&<div dir={instructionDir} className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] p-4"><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">{copy.yourAction}</div><p className="mt-1 break-words text-[10px] leading-5 text-slate-400">{copy.actionHelp}</p></div><button disabled={!guide.done} onClick={act} className={`relative w-full shrink-0 rounded-xl px-5 py-3 text-xs font-black transition sm:w-auto ${guide.done?'bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(103,232,249,.22)] hover:scale-[1.02]':'cursor-not-allowed bg-slate-800 text-slate-600'}`}>{guide.done&&<span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-cyan-300"/>}{displayAction(step)}<ChevronRight className="ml-1 inline h-4 w-4"/></button></div></div>}

            {actionDone&&<div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.07] p-4 sm:p-5"><div className="flex min-w-0 items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-300 text-slate-950"><CheckCircle2 className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div dir={instructionDir} className="text-xs font-black">{copy.whatHappened}</div><div className="mt-3 space-y-2">{displayEffects(step).map((effect,i)=><div key={i} className="flex min-w-0 items-start gap-2 text-[10px] leading-5 text-slate-300"><CircleDot className="mt-1 h-3 w-3 shrink-0 text-emerald-300"/><span className="min-w-0 break-words">{effect}</span></div>)}</div><button onClick={advance} className="mt-5 w-full rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950 sm:w-auto">{next?`${narrative('Continue as')} ${localizedRoleTitle(next.role,languageCode)}`:narrative('Complete Process')}<ArrowRight className="ml-1 inline h-4 w-4"/></button></div></div></div>}
          </div>

          <div dir={instructionDir} className="mt-4 grid min-w-0 gap-3 md:grid-cols-3"><Info icon={<Layers3 className="h-4 w-4"/>} title={narrative('Actual module context')} text={matched?.label||step.screen}/><Info icon={<Sparkles className="h-4 w-4"/>} title={narrative('Automated for demo')} text={guidanceAutomationText(copy,mode)}/><Info icon={<ClipboardCheck className="h-4 w-4"/>} title={narrative('User decides')} text={displayAction(step)}/></div>
        </section>
      </div>
    </main>
  </div>;
}

function GuidedField({field,mode,started,paused,value,revealed,active,copy,micro}:{field:ResolvedField;mode:DemoGuidanceMode;started:boolean;paused:boolean;value:string;revealed:boolean;active:boolean;copy:ReturnType<typeof getProcessDemoCopy>;micro:RunnerMicroCopy}){
  const reviewVisible=mode==='review'||mode==='view';
  const shown=reviewVisible?field.value:value;
  const activeCls=active&&!paused?'border-cyan-300/60 bg-cyan-300/[.06] shadow-[0_0_0_1px_rgba(103,232,249,.12)]':'border-white/10 bg-slate-950';
  const visible=reviewVisible||revealed;
  const pending=field.control==='checkbox'?copy.checkPending:field.control==='text'||field.control==='textarea'||field.control==='number'||field.control==='password'?copy.fieldPending:copy.selectPending;
  return <div className="min-w-0"><label className="mb-1.5 block break-words text-[8px] font-black uppercase tracking-wider text-slate-600">{field.label}</label>
    {field.control==='select'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-xs font-bold ${activeCls}`}><span className={revealed?'break-words text-slate-200':'text-slate-700'}>{revealed?field.value:copy.selectPending}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500"/></div>:
    field.control==='choice'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl border px-3 py-3 ${activeCls}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${revealed?'border-cyan-300 bg-cyan-300 text-slate-950':'border-slate-700 bg-slate-900 text-slate-700'}`}>{revealed?<Check className="h-3.5 w-3.5"/>:<CircleDot className="h-3.5 w-3.5"/>}</span><span className={revealed?'break-words text-xs font-bold text-slate-200':'text-[10px] font-bold text-slate-700'}>{revealed?field.value:copy.selectPending}</span></div>:
    field.control==='multiselect'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 min-w-0 flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2.5 ${activeCls}`}>{revealed?field.value.split(' · ').map((item,i)=><span key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[9px] font-black text-cyan-100"><Check className="h-3 w-3"/>{item}</span>):<span className="text-[10px] font-bold text-slate-700">{copy.selectPending}</span>}</div>:
    field.control==='radio'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 ${activeCls}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${revealed?'border-cyan-300':'border-slate-700'}`}>{revealed&&<span className="h-2.5 w-2.5 rounded-full bg-cyan-300"/>}</span><span className={revealed?'text-xs font-bold text-slate-200':'text-[10px] font-bold text-slate-700'}>{revealed?field.value:copy.selectPending}</span></div>:
    field.control==='checkbox'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 ${activeCls}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${revealed?'border-cyan-300 bg-cyan-300 text-slate-950':'border-slate-700 bg-slate-900'}`}>{revealed&&<Check className="h-3.5 w-3.5"/>}</span><span className={revealed?'text-xs font-bold text-slate-200':'text-[10px] font-bold text-slate-700'}>{revealed?field.value:copy.checkPending}</span></div>:
    field.control==='date'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold ${activeCls}`}><span className={revealed?'text-slate-200':'text-slate-700'}>{revealed?field.value:copy.selectPending}</span><span className="text-[10px] text-slate-500">▦</span></div>:
    (field.control==='time'||field.control==='datetime')&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold ${activeCls}`}><span className={revealed?'text-slate-200':'text-slate-700'}>{revealed?field.value:copy.selectPending}</span><span className="text-[11px] text-slate-500">◷</span></div>:
    field.control==='file'&&mode!=='review'&&mode!=='view'?<div className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-3 ${activeCls}`}><span className={revealed?'min-w-0 truncate text-xs font-bold text-slate-200':'text-[10px] font-bold text-slate-700'}>{revealed?field.value:copy.selectPending}</span><span className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black ${revealed?'border-emerald-300/25 bg-emerald-300/10 text-emerald-200':'border-slate-700 text-slate-600'}`}>{revealed?micro.selected:micro.chooseFile}</span></div>:
    field.control==='status'?<div className={`flex min-h-11 items-center rounded-xl border px-3 py-3 ${activeCls}`}><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${visible?'border-emerald-300/25 bg-emerald-300/10 text-emerald-200':'border-slate-700 text-slate-700'}`}>{visible?field.value:copy.checkPending}</span></div>:
    field.control==='read'?<div className={`min-h-11 min-w-0 rounded-xl border px-3 py-3 text-xs font-bold ${activeCls}`}><span className="break-words text-slate-200">{visible?field.value:''}</span>{!visible&&<span className="text-slate-700">{pending}</span>}</div>:
    <div className={`min-h-11 min-w-0 max-w-full overflow-hidden rounded-xl border px-3 py-3 text-xs font-bold text-slate-200 ${activeCls}`}><span className="break-words">{field.control==='password'&&shown?'•'.repeat(Math.min(12,shown.length)):shown}</span>{started&&!reviewVisible&&!paused&&!revealed&&['text','textarea','number','password'].includes(field.control)&&<span className="ml-0.5 animate-pulse text-cyan-300">|</span>}{!reviewVisible&&!started&&!shown&&<span className="text-slate-700">{pending}</span>}</div>}
  </div>;
}

function MobileStepSummary({process,stepIndex,languageCode,translateAction}:{process:DemoProcess;stepIndex:number;languageCode:string;translateAction:(step:ProcessStep)=>string}){
  const step=process.steps[stepIndex];
  return <div className="mb-4 min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:hidden"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300 text-xs font-black text-slate-950">{stepIndex+1}</div><div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.14em] text-cyan-300">{localizedRoleTitle(step.role,languageCode)} · Step {stepIndex+1}/{process.steps.length}</div><div className="mt-1 break-words text-[10px] font-black">{translateAction(step)}</div></div></div><div className="mt-3 flex max-w-full flex-wrap gap-1.5">{process.steps.map((s,i)=><span key={s.id} className={`h-1.5 rounded-full ${i===stepIndex?'w-8 bg-cyan-300':i<stepIndex?'w-4 bg-emerald-300':'w-4 bg-slate-700'}`}/>)}</div></div>;
}

function DesktopStepTracker({process,stepIndex,languageCode,translateAction}:{process:DemoProcess;stepIndex:number;languageCode:string;translateAction:(step:ProcessStep)=>string}){
  return <div className="mb-4 hidden max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:block"><div className="flex w-max max-w-none items-center gap-2">{process.steps.map((s,i)=>{const active=i===stepIndex;const complete=i<stepIndex;return <React.Fragment key={s.id}><div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${active?'bg-cyan-300 text-slate-950':complete?'bg-emerald-300/15 text-emerald-200':'bg-slate-900 text-slate-500'}`}><div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-300 text-[9px] font-black text-slate-950">{complete?<Check className="h-3.5 w-3.5"/>:i+1}</div><div><div className="text-[8px] font-black uppercase tracking-wider">{localizedRoleTitle(s.role,languageCode)}</div><div className="max-w-32 truncate text-[9px] font-bold">{translateAction(s)}</div></div></div>{i<process.steps.length-1&&<ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-700"/>}</React.Fragment>})}</div></div>;
}

function deriveStepMode(processId:string,step:ProcessStep):DemoGuidanceMode{
  if(step.role==='student'||step.role==='parent')return'view';
  const key=`${processId}:${step.id}`;
  const formSteps=new Set([
    'admission:clerk-intake','leave:apply','communication:compose','website-campaign:edit',
    'website-campaign:campaign','staff-master:staff','inventory-registers:inventory','result-management:teacher-marks'
  ]);
  if(formSteps.has(key))return'form';
  if(/^(Approve|Acknowledge|Accept|Final Publish|Publish Timetable|Publish Exam|Finalize|Confirm|Save Final Paper|Preview PDF|Open Today|Resolve Affected)/i.test(step.actionLabel))return'review';
  if(/Review|Approval|Preview|Publish/i.test(step.screen))return'review';
  if(/Dashboard|Today Schedule|My Students/i.test(step.screen))return'view';
  return'selection';
}

function inferFieldControl(label:string,value:string,mode:DemoGuidanceMode):FieldControl{
  if(mode==='review'||mode==='view'){
    if(/status|validation|recommendation|availability|check|result|published|fine|audit|attendance/i.test(label))return'status';
    return'read';
  }
  if(/consent|confirm|verified|document check/i.test(label))return'checkbox';
  if(/status|validation|recommendation|availability|audit trail|ready|published|fine|admission no|gr \/ login id|gr no/i.test(label))return'status';
  if(mode==='selection')return'select';
  if(/class|medium|board|academic year|teacher|subject|division|role|designation|relationship|language|template|document|gender|channel|audience|duration|paper|orientation|action|type|term|month|duty|school|book|due date|requested class/i.test(label))return'select';
  if(/^(active|available|complete|ready|published|draft|enabled|confirmed|issued|present|absent|eligible)/i.test(value))return'status';
  return'text';
}

function resolveText(text:string,locale:ReturnType<typeof buildDemoLocaleData>,boardName:string,medium:string){
  const values:Record<string,string>={
    '{school}':locale.schoolName,'{headmaster}':locale.people.headmaster,'{clerk}':locale.people.clerk,'{teacher}':locale.people.teacher,'{teacher2}':locale.people.teacher2,'{student}':locale.people.student,'{student2}':locale.people.student2,'{student3}':locale.people.student3,'{parent}':locale.people.parent,'{applicant}':locale.people.applicant,'{applicantParent}':locale.people.applicantParent,
    '{class}':locale.className,'{subject}':locale.subject,'{secondarySubject}':locale.secondarySubject,'{grNo}':locale.grNo,'{admissionNo}':locale.admissionNo,'{mobile}':locale.mobile,'{board}':boardName,'{medium}':medium,'{jurisdiction}':locale.cityLabel
  };
  return Object.entries(values).reduce((out,[token,value])=>out.split(token).join(value),text);
}
const HINDI_FIELD_LABELS:Record<string,string>={Class:'कक्षा',Item:'आइटम',Students:'विद्यार्थी','Print Status':'प्रिंट स्थिति',Subject:'विषय',Term:'सत्र','Review Status':'समीक्षा स्थिति','Result Book':'परिणाम पुस्तिका','Progress Cards':'प्रगति पत्र',Validation:'सत्यापन',Review:'समीक्षा','Publish Readiness':'प्रकाशन तैयारी','Lock After Publish':'प्रकाशन के बाद लॉक',Child:'विद्यार्थी',Exam:'परीक्षा','Result Status':'परिणाम स्थिति',Template:'टेम्पलेट','Accepted Lists':'स्वीकृत सूचियाँ','Submitted Subjects':'जमा विषय','Missing Marks':'लंबित अंक',Consolidation:'समेकन',Maximum:'अधिकतम'};
const HINDI_FIELD_VALUES:Record<string,string>={Pending:'लंबित',Ready:'तैयार',Complete:'पूर्ण',Published:'प्रकाशित',Passed:'सफल',Yes:'हाँ',No:'नहीं',Active:'सक्रिय',Submitted:'जमा',Approved:'मंजूर',Confirmed:'पुष्ट',Issued:'जारी',Present:'उपस्थित',Absent:'अनुपस्थित',Eligible:'पात्र'};
function localizeFieldDisplay(text:string,languageCode:string,kind:'label'|'value'){
  const code=String(languageCode||'en').toLowerCase().split('-')[0];
  if(code==='hi')return(kind==='label'?HINDI_FIELD_LABELS[text]:HINDI_FIELD_VALUES[text])||text;
  return text;
}
function resolveField(field:ProcessField,locale:ReturnType<typeof buildDemoLocaleData>,boardName:string,medium:string,mode:DemoGuidanceMode,languageCode:string):ResolvedField{
  const rawLabel=resolveText(field.label,locale,boardName,medium),rawValue=resolveText(field.value,locale,boardName,medium);
  const label=localizeFieldDisplay(rawLabel,languageCode,'label'),value=localizeFieldDisplay(rawValue,languageCode,'value');
  return{label,value,control:field.control||inferFieldControl(rawLabel,rawValue,mode)};
}
function getRoleName(role:ProcessRole,locale:ReturnType<typeof buildDemoLocaleData>){if(role==='headmaster')return locale.people.headmaster;if(role==='clerk')return locale.people.clerk;if(role==='teacher')return locale.people.teacher;if(role==='student')return locale.people.student;if(role==='parent')return locale.people.parent;return'Platform Admin';}
function matchModule(modules:ReturnType<typeof roleDemoModules>,keyword:string){
  const q=keyword.toLowerCase().trim();
  const scored=modules.map(m=>{const label=m.label.toLowerCase(),id=m.id.toLowerCase(),category=m.category.toLowerCase();const features=m.features.map(f=>f.label.toLowerCase());let score=0;if(label===q)score+=200;else if(label.includes(q))score+=120;if(id.includes(q.replace(/\s+/g,'-')))score+=90;if(category.includes(q))score+=55;if(features.some(f=>f===q))score+=45;else if(features.some(f=>f.includes(q)))score+=25;return{m,score};}).sort((a,b)=>b.score-a.score);
  return scored[0]?.score>0?scored[0].m:modules.find(m=>m.tier==='live')||modules[0];
}

function useGuidedInteraction(fields:ResolvedField[],key:string,running:boolean,mode:DemoGuidanceMode){
  const layout=useMemo(()=>{
    let offset=0;
    const segments=fields.map((field,index)=>{
      const units=mode==='form'&&['text','textarea','number','password'].includes(field.control)?Math.max(1,field.value.length):1;
      const start=offset;
      const end=start+units;
      offset=end+(index<fields.length-1?1:0);
      return{start,end,index,units};
    });
    const totalChars=fields.reduce((n,f)=>n+(mode==='form'&&['text','textarea','number','password'].includes(f.control)?f.value.length:1),0);
    return{segments,totalUnits:offset,totalChars};
  },[fields,mode]);
  const [cursor,setCursor]=useState(0);

  useEffect(()=>{setCursor(0);},[key,layout.totalUnits,mode]);

  useEffect(()=>{
    if(!running||cursor>=layout.totalUnits)return;
    const segment=layout.segments.find(s=>cursor>=s.start&&cursor<=s.end);
    const field=segment?fields[segment.index]:undefined;
    const atFieldEnd=segment?cursor===segment.end&&segment.index<fields.length-1:false;
    let delay=760+((cursor*41)%260);
    if(mode==='form'&&field&&['text','textarea','number','password'].includes(field.control)&&segment){
      const local=Math.max(0,cursor-segment.start);
      const nextChar=field.value.charAt(local)||'';
      delay=108+((cursor*29)%58);
      if(/[.,:;!?/\-]/.test(nextChar))delay+=90;
      else if(nextChar===' ')delay=Math.max(76,delay-20);
      if(atFieldEnd)delay=650+((cursor*37)%360);
    }else if(atFieldEnd)delay=700+((cursor*37)%350);
    const timer=window.setTimeout(()=>setCursor(c=>Math.min(layout.totalUnits,c+1)),delay);
    return()=>window.clearTimeout(timer);
  },[running,cursor,layout,fields,mode]);

  const segmentFor=(index:number)=>layout.segments[index];
  const display=(index:number)=>{
    const field=fields[index],segment=segmentFor(index);if(!field||!segment)return'';
    if(mode==='review'||mode==='view')return field.value;
    if(['text','textarea','number','password'].includes(field.control)&&mode==='form'){
      const local=Math.max(0,Math.min(field.value.length,cursor-segment.start));
      return field.value.slice(0,local);
    }
    return cursor>=segment.end?field.value:'';
  };
  const revealed=(index:number)=>{const s=segmentFor(index);if(!s)return false;return mode==='review'||mode==='view'||cursor>=s.end;};
  const done=fields.length===0?running:cursor>=layout.totalUnits;
  const progress=fields.length===0?(running?100:0):Math.min(100,Math.round((Math.min(cursor,layout.totalUnits)/Math.max(1,layout.totalUnits))*100));
  const activeField=done?-1:Math.max(0,layout.segments.findIndex(s=>cursor>=s.start&&cursor<=s.end));
  return{done,display,revealed,progress,activeField};
}


function ExperienceMode({icon,eyebrow,title,text,action,onClick}:{icon:React.ReactNode;eyebrow:string;title:string;text:string;action:string;onClick:()=>void}){
  return <button onClick={onClick} className="group rounded-[1.35rem] border border-white/10 bg-white/[.035] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30"><div className="flex items-center justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">{icon}</div><span className="text-[8px] font-black uppercase tracking-[.16em] text-slate-600">{eyebrow}</span></div><h3 className="mt-4 text-sm font-black">{title}</h3><p className="mt-2 min-h-12 text-[10px] leading-5 text-slate-500">{text}</p><div className="mt-4 flex items-center gap-1 text-[9px] font-black text-cyan-300">{action}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1"/></div></button>;
}
function ExecutiveTour({step,onClose,onNext,onTry}:{step:number;onClose:()=>void;onNext:()=>void;onTry:()=>void}){
  const item=EXECUTIVE_TOUR[step];
  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-xl rounded-[1.75rem] border border-cyan-300/25 bg-[#07111f] p-5 text-white shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">3-minute Executive Tour · {step+1}/{EXECUTIVE_TOUR.length}</p><h2 className="mt-3 text-2xl font-black">{item.title}</h2></div><button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4"/></button></div><p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p><div className="mt-6 grid grid-cols-5 gap-2">{EXECUTIVE_TOUR.map((_,i)=><span key={i} className={`h-1.5 rounded-full ${i<=step?'bg-cyan-300':'bg-slate-800'}`}/>)}</div><div className="mt-6 flex flex-col gap-2 sm:flex-row">{step===EXECUTIVE_TOUR.length-1?<button onClick={onTry} className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950">Try Result Management Live</button>:<button onClick={onNext} className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950">Next Highlight <ArrowRight className="ml-1 inline h-4 w-4"/></button>}<button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black">Close</button></div></div></div>;
}
function ConversionModal({props,completedIds,onClose}:{props:Props;completedIds:Set<string>;onClose:()=>void}){
  const contact=String(props.visitorContact||'').trim();
  const [mobile,setMobile]=useState(/^[+()0-9\s-]{7,40}$/.test(contact)?contact:'');
  const [email,setEmail]=useState(contact.includes('@')?contact:'');
  const [consent,setConsent]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [reference,setReference]=useState('');
  const [otpToken,setOtpToken]=useState('');
  const [otp,setOtp]=useState('');
  const [otpVerified,setOtpVerified]=useState(false);
  const [otpBusy,setOtpBusy]=useState(false);
  const [masked,setMasked]=useState('');
  const [otpDelivery,setOtpDelivery]=useState('');
  const requested=DEMO_PROCESSES.filter(p=>completedIds.has(p.id)).map(p=>p.short).slice(0,25);
  const resetOtp=()=>{setOtpToken('');setOtp('');setOtpVerified(false);setMasked('');setOtpDelivery('');};
  const sendOtp=async()=>{if(!mobile.trim()){setError('Enter mobile number first.');return;}setOtpBusy(true);setError('');try{const r=await requestPublicOtp(mobile.trim(),'demo_setup','/demo',email.trim());setOtpToken(r.challengeToken);setMasked(r.maskedMobile);setOtpDelivery(r.deliveryLabel||'available OTP channel');setOtp('');setOtpVerified(false);}catch(e:any){setError(e?.message||'OTP could not be sent.');}finally{setOtpBusy(false);}};
  const verifyOtp=async()=>{if(!otpToken||otp.length!==6){setError('Enter the 6-digit OTP.');return;}setOtpBusy(true);setError('');try{await verifyPublicOtp(otpToken,otp);setOtpVerified(true);}catch(e:any){setOtpVerified(false);setError(e?.message||'OTP verification failed.');}finally{setOtpBusy(false);}};
  const submit=async()=>{if(!mobile.trim()||!email.trim()||!consent){setError('Mobile, email and consent are required to send the setup request.');return;}if(!otpVerified||!otpToken){setError('Verify your contact with OTP before requesting school setup.');return;}setLoading(true);setError('');try{const r=await fetch('/api/public/institution-interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({interestType:'registration',otpPurpose:'demo_setup',otpChallengeToken:otpToken,institutionName:props.institutionName||'Demo Institution',institutionType:'School',contactName:props.visitorName||'Demo Visitor',designation:props.visitorRole||'Management',mobile:mobile.trim(),email:email.trim(),preferredLanguageCode:props.languageCode||'en',requestedModules:requested,message:`Submitted after Classtago live demo. ${completedIds.size} demo processes completed.`,sourcePage:'/demo',consent,website:''})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||'Request could not be saved.');setReference(j.referenceCode||'EDX-RECEIVED');}catch(e:any){setError(e?.message||'Request could not be saved.');}finally{setLoading(false);}};
  return <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-lg rounded-[1.75rem] border border-cyan-300/25 bg-[#07111f] p-5 text-white shadow-2xl sm:p-7">{reference?<div className="text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300"/><h2 className="mt-4 text-xl font-black">School setup request received</h2><p className="mt-2 text-xs text-slate-400">Keep this reference for follow-up.</p><div className="mx-auto mt-4 max-w-xs rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 font-mono text-sm font-black text-cyan-200">{reference}</div><button onClick={onClose} className="mt-5 rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950">Close</button></div>:<><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Continue from the demo</p><h2 className="mt-2 text-xl font-black">Set up Classtago for your school</h2><p className="mt-2 text-[10px] leading-5 text-slate-400">Your contact is verified through Classtago multi-channel OTP. SMS and WhatsApp are used when available; Email is an optional backup so a depleted SIM does not stop the setup flow.</p></div><button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4"/></button></div>
  <div className="mt-5 grid gap-3"><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Mobile</span><div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3"><Phone className="h-4 w-4 text-slate-600"/><input value={mobile} onChange={e=>{setMobile(e.target.value);resetOtp();}} className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none" placeholder="+91..."/></div></label><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Email</span><div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3"><Mail className="h-4 w-4 text-slate-600"/><input value={email} onChange={e=>{setEmail(e.target.value);resetOtp();}} className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none" placeholder="school@example.com"/></div></label></div>
  <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3">{!otpToken?<button onClick={sendOtp} disabled={otpBusy||!mobile.trim()} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40">{otpBusy?'Sending OTP…':'Send Contact OTP'}</button>:otpVerified?<div className="flex items-center gap-2 text-xs font-black text-emerald-300"><CheckCircle2 className="h-4 w-4"/>Contact verified {masked?`(${masked})`:''}{otpDelivery?` · ${otpDelivery}`:''}</div>:<div className="flex gap-2"><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-xs font-black tracking-[.2em] outline-none"/><button onClick={verifyOtp} disabled={otpBusy||otp.length!==6} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">Verify</button><button onClick={sendOtp} disabled={otpBusy} className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black">Resend</button></div>}{otpToken&&!otpVerified&&otpDelivery&&<div className="mt-2 text-[9px] font-bold text-cyan-200/80">OTP sent/queued via: {otpDelivery}. Email remains optional.</div>}</div>
  <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-300"/><span className="text-[10px] leading-5 text-slate-400">I am authorized to request Classtago setup/demo follow-up for this institution.</span></label>{requested.length>0&&<div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3"><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">Demo interests attached automatically</div><div className="mt-2 flex flex-wrap gap-1.5">{requested.map(x=><span key={x} className="rounded-full bg-cyan-300/10 px-2 py-1 text-[8px] font-bold text-cyan-200">{x}</span>)}</div></div>}{error&&<div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[10px] text-rose-200">{error}</div>}<button disabled={loading||!otpVerified} onClick={submit} className="mt-5 w-full rounded-xl bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 disabled:opacity-50">{loading?'Sending…':'Request School Setup'}<ArrowRight className="ml-1 inline h-4 w-4"/></button></>}</div></div>;
}

function Stat({value,label}:{value:string;label:string}){return <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/55 p-4"><div className="break-words text-xl font-black text-cyan-300">{value}</div><div className="mt-1 break-words text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</div></div>}
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex min-w-0 items-center gap-2 text-cyan-300">{icon}<span className="break-words text-[9px] font-black uppercase tracking-wider">{title}</span></div><div className="mt-2 break-words text-[10px] leading-5 text-slate-500">{text}</div></div>}
