/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Check, CheckCircle2, XCircle, AlertTriangle, Printer, Download, 
  Search, Filter, Plus, Trash2, Edit, Save, ArrowUpDown, ChevronDown, 
  Eye, FileText, Share2, HelpCircle, User, Bell, RefreshCw, Send, X, ArrowLeft
} from 'lucide-react';
import { Language, User as UserType, ClassStructure, AuditLogEntry } from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import PrintPDFButton, { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import { printSectionById } from '../utils/printSection';
import { requestActionConfirm } from '../lib/actionConfirm';

// Leave Reason Master Item
export interface LeaveReason {
  id: string;
  name: string;
  category: 'student' | 'teacher' | 'staff';
  isActive: boolean;
  order: number;
}

// Full Leave Application Structure
export interface LeaveApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantRole: 'student' | 'teacher' | 'staff';
  classId?: string; // For students
  className?: string; // For students
  division?: string; // For students
  grNumber?: string; // For students
  shalarthId?: string; // For teachers
  employeeCode?: string; // For staff
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isHalfDay: boolean;
  halfDayOption?: 'Morning Session' | 'Afternoon Session';
  leaveType: string;
  reason: string;
  reasonLanguage?: LeaveReasonLanguageCode;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  attachmentName?: string;
  remarks?: string;
  reviewedBy?: string;
  reviewedById?: string;
  reviewedAt?: string;
  appliedAt: string;
  cloudRequestId?: string;
  clerkVerified?: boolean;
}

export interface LeaveNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'applied' | 'approved' | 'rejected' | 'cancelled';
}

export interface Holiday {
  id: string;
  name: string;
  type: 'Government Holiday' | 'School Holiday' | 'School Vacation' | 'Exam Holiday' | 'Local Holiday' | 'Optional Holiday' | 'Sunday' | 'Half-Day Holiday' | 'Emergency Holiday';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  applicableClasses: string; // 'All' or a comma-separated list of class names or IDs
  remarks?: string;
  academicYear: string;
  reminderEnabled?: boolean;
  notificationChannels?: { website: boolean; email: boolean; sms: boolean; whatsapp: boolean };
}

interface SmartLeaveManagerProps {
  lang: Language;
  user: UserType;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

type LeaveWorkspaceTab = 'dashboard' | 'apply' | 'master_settings' | 'reports' | 'notifications';

type LeaveReasonLanguageCode =
  | 'en' | 'as' | 'bn' | 'brx' | 'doi' | 'gu' | 'hi' | 'kn' | 'ks' | 'kok' | 'mai'
  | 'ml' | 'mni' | 'mr' | 'ne' | 'or' | 'pa' | 'sa' | 'sat' | 'sd' | 'ta' | 'te' | 'ur';

type LeavePurposeKey = 'health' | 'medical' | 'familyCare' | 'official' | 'training' | 'familyFunction' | 'travel' | 'emergency' | 'bereavement' | 'personal';

interface LeaveReasonLocale {
  code: LeaveReasonLanguageCode;
  label: string;
  locale: string;
  single: string;
  range: string;
  halfMorning: string;
  halfAfternoon: string;
  purposes: Record<LeavePurposeKey, string>;
}

const LEAVE_REASON_LOCALES: LeaveReasonLocale[] = [
  {
    code: 'en', label: 'English', locale: 'en-IN',
    single: 'I request leave on {start}. {purpose}',
    range: 'I request leave from {start} to {end}. {purpose}',
    halfMorning: 'I request half-day leave for the morning session on {start}. {purpose}',
    halfAfternoon: 'I request half-day leave for the afternoon session on {start}. {purpose}',
    purposes: {
      health: 'I am unwell and require rest and recovery.', medical: 'I need leave for medical consultation, treatment or recovery.',
      familyCare: 'I need leave for family-care responsibilities.', official: 'I need leave to perform assigned official duty.',
      training: 'I need leave to attend the scheduled training/workshop programme.', familyFunction: 'I need leave to attend an important family or religious function.',
      travel: 'I need leave because I have to travel out of station.', emergency: 'I need leave due to an urgent personal emergency.',
      bereavement: 'I need leave due to a bereavement in the family.', personal: 'I need leave for important personal work.'
    }
  },
  {
    code: 'as', label: 'অসমীয়া (Assamese)', locale: 'as-IN',
    single: 'মই {start} তাৰিখে ছুটিৰ বাবে অনুৰোধ জনাইছোঁ। {purpose}',
    range: 'মই {start} ৰ পৰা {end} লৈকে ছুটিৰ বাবে অনুৰোধ জনাইছোঁ। {purpose}',
    halfMorning: 'মই {start} তাৰিখে পুৱাৰ অধিৱেশনৰ বাবে আধা দিনৰ ছুটিৰ অনুৰোধ জনাইছোঁ। {purpose}',
    halfAfternoon: 'মই {start} তাৰিখে দুপৰীয়াৰ অধিৱেশনৰ বাবে আধা দিনৰ ছুটিৰ অনুৰোধ জনাইছোঁ। {purpose}',
    purposes: {
      health: 'মই অসুস্থ আৰু বিশ্ৰামৰ প্ৰয়োজন।', medical: 'চিকিৎসা পৰামৰ্শ, চিকিৎসা বা আৰোগ্যৰ বাবে ছুটিৰ প্ৰয়োজন।',
      familyCare: 'পৰিয়ালৰ যত্নৰ দায়িত্বৰ বাবে ছুটিৰ প্ৰয়োজন।', official: 'নিৰ্ধাৰিত চৰকাৰী/দাপ্তৰিক দায়িত্ব পালনৰ বাবে ছুটিৰ প্ৰয়োজন।',
      training: 'নিৰ্ধাৰিত প্ৰশিক্ষণ বা কৰ্মশালাত অংশ লোৱাৰ বাবে ছুটিৰ প্ৰয়োজন।', familyFunction: 'গুৰুত্বপূৰ্ণ পাৰিবাৰিক বা ধৰ্মীয় অনুষ্ঠানত অংশ লোৱাৰ বাবে ছুটিৰ প্ৰয়োজন।',
      travel: 'বাহিৰলৈ যাত্ৰা কৰিবলগীয়া হোৱাৰ বাবে ছুটিৰ প্ৰয়োজন।', emergency: 'জৰুৰী ব্যক্তিগত পৰিস্থিতিৰ বাবে ছুটিৰ প্ৰয়োজন।',
      bereavement: 'পৰিয়ালত শোকৰ কাৰণে ছুটিৰ প্ৰয়োজন।', personal: 'গুৰুত্বপূৰ্ণ ব্যক্তিগত কামৰ বাবে ছুটিৰ প্ৰয়োজন।'
    }
  },
  {
    code: 'bn', label: 'বাংলা (Bengali)', locale: 'bn-IN',
    single: 'আমি {start} তারিখে ছুটির আবেদন করছি। {purpose}',
    range: 'আমি {start} থেকে {end} পর্যন্ত ছুটির আবেদন করছি। {purpose}',
    halfMorning: 'আমি {start} তারিখে সকালের সেশনের জন্য অর্ধদিবস ছুটির আবেদন করছি। {purpose}',
    halfAfternoon: 'আমি {start} তারিখে বিকেলের সেশনের জন্য অর্ধদিবস ছুটির আবেদন করছি। {purpose}',
    purposes: {
      health: 'আমি অসুস্থ এবং বিশ্রাম ও সুস্থতার প্রয়োজন।', medical: 'চিকিৎসা পরামর্শ, চিকিৎসা বা সুস্থতার জন্য ছুটি প্রয়োজন।',
      familyCare: 'পারিবারিক যত্নের দায়িত্বের জন্য ছুটি প্রয়োজন।', official: 'নির্ধারিত সরকারি/দাপ্তরিক দায়িত্ব পালনের জন্য ছুটি প্রয়োজন।',
      training: 'নির্ধারিত প্রশিক্ষণ বা কর্মশালায় অংশগ্রহণের জন্য ছুটি প্রয়োজন।', familyFunction: 'গুরুত্বপূর্ণ পারিবারিক বা ধর্মীয় অনুষ্ঠানে অংশগ্রহণের জন্য ছুটি প্রয়োজন।',
      travel: 'শহরের বাইরে ভ্রমণ করতে হবে বলে ছুটি প্রয়োজন।', emergency: 'জরুরি ব্যক্তিগত পরিস্থিতির কারণে ছুটি প্রয়োজন।',
      bereavement: 'পরিবারে শোকের কারণে ছুটি প্রয়োজন।', personal: 'গুরুত্বপূর্ণ ব্যক্তিগত কাজের জন্য ছুটি প্রয়োজন।'
    }
  },
  {
    code: 'brx', label: 'बड़ो (Bodo)', locale: 'brx-IN',
    single: 'आं {start} खालि छुटिनि थाखाय खावलायनाय होयो। {purpose}',
    range: 'आं {start} निफ्राय {end} सिम छुटिनि थाखाय खावलायनाय होयो। {purpose}',
    halfMorning: 'आं {start} खालि फुंनि सेसननि थाखाय आधा साननि छुटि खावलायो। {purpose}',
    halfAfternoon: 'आं {start} खालि बेलासिनि सेसननि थाखाय आधा साननि छुटि खावलायो। {purpose}',
    purposes: {
      health: 'आं देहा फिसा जाबाय आरो जिरायनायनि गोनांथि दं।', medical: 'सावस्रि नायबिजिरनाय, फाहामनाय एबा मोनफिननायनि थाखाय छुटि गोनां।',
      familyCare: 'नखरनि जोथोन लानायनि दायबायनि थाखाय छुटि गोनां।', official: 'होनाय अफिसारि मावथाय मावनायनि थाखाय छुटि गोनां।',
      training: 'थिननाय फोरोंथाय एबा वार्कशपाव बाहागो लानायनि थाखाय छुटि गोनां।', familyFunction: 'गोनांथार नखरारि एबा धोरोमारि हाबाफारियाव बाहागो लानायनि थाखाय छुटि गोनां।',
      travel: 'बाइजोआव दावबायनांगोन बेखायनो छुटि गोनां।', emergency: 'गोब्राब निजि जेंनानि थाखाय छुटि गोनां।',
      bereavement: 'नखराव सोखनि जाहोनाव छुटि गोनां।', personal: 'गोनांथार निजि खामानिनि थाखाय छुटि गोनां।'
    }
  },
  {
    code: 'doi', label: 'डोगरी (Dogri)', locale: 'doi-IN',
    single: 'मैं {start} गी छुट्टी दी विनती करदा/करदी आं। {purpose}',
    range: 'मैं {start} थमां {end} तगर छुट्टी दी विनती करदा/करदी आं। {purpose}',
    halfMorning: 'मैं {start} गी सवेरे दे सत्र आस्तै आधे दिन दी छुट्टी दी विनती करदा/करदी आं। {purpose}',
    halfAfternoon: 'मैं {start} गी दपैहर दे सत्र आस्तै आधे दिन दी छुट्टी दी विनती करदा/करदी आं। {purpose}',
    purposes: {
      health: 'मेरी तबीयत ठीक नेईं ऐ ते आराम दी लोड़ ऐ।', medical: 'डाक्टरी सलाह, इलाज जां सेहतयाबी आस्तै छुट्टी दी लोड़ ऐ।',
      familyCare: 'परिवार दी देखभाल दी जिम्मेदारी आस्तै छुट्टी दी लोड़ ऐ।', official: 'सौंपी गेदी सरकारी/दफ्तरी ड्यूटी निभाने आस्तै छुट्टी दी लोड़ ऐ।',
      training: 'तय प्रशिक्षण जां कार्यशाला च हिस्सा लैने आस्तै छुट्टी दी लोड़ ऐ।', familyFunction: 'जरूरी पारिवारिक जां धार्मिक समारोह च हिस्सा लैने आस्तै छुट्टी दी लोड़ ऐ।',
      travel: 'शैहर कोला बाहर जाना ऐ, इस कारण छुट्टी दी लोड़ ऐ।', emergency: 'जरूरी निजी आपात स्थिति दे कारण छुट्टी दी लोड़ ऐ।',
      bereavement: 'परिवार च शोक दे कारण छुट्टी दी लोड़ ऐ।', personal: 'जरूरी निजी कम्म आस्तै छुट्टी दी लोड़ ऐ।'
    }
  },
  {
    code: 'gu', label: 'ગુજરાતી (Gujarati)', locale: 'gu-IN',
    single: 'હું {start} ના રોજ રજાની વિનંતી કરું છું. {purpose}',
    range: 'હું {start} થી {end} સુધી રજાની વિનંતી કરું છું. {purpose}',
    halfMorning: 'હું {start} ના રોજ સવારના સત્ર માટે અડધા દિવસની રજાની વિનંતી કરું છું. {purpose}',
    halfAfternoon: 'હું {start} ના રોજ બપોરના સત્ર માટે અડધા દિવસની રજાની વિનંતી કરું છું. {purpose}',
    purposes: {
      health: 'મારી તબિયત સારી નથી અને આરામ તથા સ્વસ્થ થવાની જરૂર છે.', medical: 'તબીબી સલાહ, સારવાર અથવા સ્વસ્થ થવા માટે રજાની જરૂર છે.',
      familyCare: 'પરિવારની સંભાળની જવાબદારી માટે રજાની જરૂર છે.', official: 'સોંપાયેલ સત્તાવાર ફરજ બજાવવા માટે રજાની જરૂર છે.',
      training: 'નિયત તાલીમ અથવા વર્કશોપમાં હાજરી આપવા માટે રજાની જરૂર છે.', familyFunction: 'મહત્વપૂર્ણ પારિવારિક અથવા ધાર્મિક પ્રસંગમાં હાજરી આપવા માટે રજાની જરૂર છે.',
      travel: 'મારે શહેર બહાર જવાનું હોવાથી રજાની જરૂર છે.', emergency: 'તાત્કાલિક વ્યક્તિગત પરિસ્થિતિને કારણે રજાની જરૂર છે.',
      bereavement: 'પરિવારમાં શોકના કારણે રજાની જરૂર છે.', personal: 'મહત્વપૂર્ણ વ્યક્તિગત કામ માટે રજાની જરૂર છે.'
    }
  },
  {
    code: 'hi', label: 'हिन्दी (Hindi)', locale: 'hi-IN',
    single: 'मैं {start} को अवकाश का अनुरोध करता/करती हूँ। {purpose}',
    range: 'मैं {start} से {end} तक अवकाश का अनुरोध करता/करती हूँ। {purpose}',
    halfMorning: 'मैं {start} को प्रातःकालीन सत्र के लिए आधे दिन के अवकाश का अनुरोध करता/करती हूँ। {purpose}',
    halfAfternoon: 'मैं {start} को दोपहर सत्र के लिए आधे दिन के अवकाश का अनुरोध करता/करती हूँ। {purpose}',
    purposes: {
      health: 'मैं अस्वस्थ हूँ और मुझे आराम तथा स्वास्थ्य लाभ की आवश्यकता है।', medical: 'चिकित्सकीय परामर्श, उपचार या स्वास्थ्य लाभ के लिए अवकाश आवश्यक है।',
      familyCare: 'पारिवारिक देखभाल की जिम्मेदारियों के लिए अवकाश आवश्यक है।', official: 'सौंपे गए आधिकारिक कार्य को पूरा करने के लिए अवकाश आवश्यक है।',
      training: 'निर्धारित प्रशिक्षण या कार्यशाला में भाग लेने के लिए अवकाश आवश्यक है।', familyFunction: 'महत्वपूर्ण पारिवारिक या धार्मिक कार्यक्रम में शामिल होने के लिए अवकाश आवश्यक है।',
      travel: 'मुझे शहर से बाहर यात्रा करनी है, इसलिए अवकाश आवश्यक है।', emergency: 'अत्यावश्यक व्यक्तिगत परिस्थिति के कारण अवकाश आवश्यक है।',
      bereavement: 'परिवार में शोक की स्थिति के कारण अवकाश आवश्यक है।', personal: 'महत्वपूर्ण व्यक्तिगत कार्य के लिए अवकाश आवश्यक है।'
    }
  },
  {
    code: 'kn', label: 'ಕನ್ನಡ (Kannada)', locale: 'kn-IN',
    single: 'ನಾನು {start} ರಂದು ರಜೆಯನ್ನು ವಿನಂತಿಸುತ್ತೇನೆ. {purpose}',
    range: 'ನಾನು {start} ರಿಂದ {end} ರವರೆಗೆ ರಜೆಯನ್ನು ವಿನಂತಿಸುತ್ತೇನೆ. {purpose}',
    halfMorning: 'ನಾನು {start} ರಂದು ಬೆಳಗಿನ ಅವಧಿಗೆ ಅರ್ಧ ದಿನದ ರಜೆಯನ್ನು ವಿನಂತಿಸುತ್ತೇನೆ. {purpose}',
    halfAfternoon: 'ನಾನು {start} ರಂದು ಮಧ್ಯಾಹ್ನದ ಅವಧಿಗೆ ಅರ್ಧ ದಿನದ ರಜೆಯನ್ನು ವಿನಂತಿಸುತ್ತೇನೆ. {purpose}',
    purposes: {
      health: 'ನನ್ನ ಆರೋಗ್ಯ ಸರಿಯಿಲ್ಲ ಮತ್ತು ವಿಶ್ರಾಂತಿ ಹಾಗೂ ಚೇತರಿಕೆ ಅಗತ್ಯವಿದೆ.', medical: 'ವೈದ್ಯಕೀಯ ಸಲಹೆ, ಚಿಕಿತ್ಸೆ ಅಥವಾ ಚೇತರಿಕೆಗೆ ರಜೆ ಅಗತ್ಯವಿದೆ.',
      familyCare: 'ಕುಟುಂಬದ ಆರೈಕೆ ಜವಾಬ್ದಾರಿಗಳಿಗಾಗಿ ರಜೆ ಅಗತ್ಯವಿದೆ.', official: 'ನಿಯೋಜಿಸಲಾದ ಅಧಿಕೃತ ಕರ್ತವ್ಯ ನಿರ್ವಹಿಸಲು ರಜೆ ಅಗತ್ಯವಿದೆ.',
      training: 'ನಿಗದಿತ ತರಬೇತಿ ಅಥವಾ ಕಾರ್ಯಾಗಾರದಲ್ಲಿ ಭಾಗವಹಿಸಲು ರಜೆ ಅಗತ್ಯವಿದೆ.', familyFunction: 'ಮುಖ್ಯ ಕುಟುಂಬ ಅಥವಾ ಧಾರ್ಮಿಕ ಕಾರ್ಯಕ್ರಮದಲ್ಲಿ ಭಾಗವಹಿಸಲು ರಜೆ ಅಗತ್ಯವಿದೆ.',
      travel: 'ಊರಿನಿಂದ ಹೊರಗೆ ಪ್ರಯಾಣಿಸಬೇಕಿರುವುದರಿಂದ ರಜೆ ಅಗತ್ಯವಿದೆ.', emergency: 'ತುರ್ತು ವೈಯಕ್ತಿಕ ಪರಿಸ್ಥಿತಿಯಿಂದ ರಜೆ ಅಗತ್ಯವಿದೆ.',
      bereavement: 'ಕುಟುಂಬದಲ್ಲಿ ಶೋಕದ ಕಾರಣ ರಜೆ ಅಗತ್ಯವಿದೆ.', personal: 'ಮುಖ್ಯ ವೈಯಕ್ತಿಕ ಕೆಲಸಕ್ಕಾಗಿ ರಜೆ ಅಗತ್ಯವಿದೆ.'
    }
  },
  {
    code: 'ks', label: 'کٲشُر (Kashmiri)', locale: 'ks-IN',
    single: 'بہٕ {start} دۄہ چھُس رُخصتی خٲطرٕ درخواست کران۔ {purpose}',
    range: 'بہٕ {start} پٮ۪ٹھ {end} تام چھُس رُخصتی خٲطرٕ درخواست کران۔ {purpose}',
    halfMorning: 'بہٕ {start} دۄہ صُبحکِس سیشن خٲطرٕ نِم دۄہ رُخصتی درخواست کران۔ {purpose}',
    halfAfternoon: 'بہٕ {start} دۄہ دۄپہرکِس سیشن خٲطرٕ نِم دۄہ رُخصتی درخواست کران۔ {purpose}',
    purposes: {
      health: 'میٛون صحت چھُ ٹھیک نہٕ تہٕ آرام تہٕ صحت یابی چھِ ضروٗرت۔', medical: 'طبی مشورٕ، علاج یا صحت یابی خٲطرٕ رُخصتی چھِ ضروٗرت۔',
      familyCare: 'گھرٕکین دیکھ بالٕچ ذمہ دارین خٲطرٕ رُخصتی چھِ ضروٗرت۔', official: 'مقرر سرکاری/دفتری ڈیوٹی انجام دِنہٕ خٲطرٕ رُخصتی چھِ ضروٗرت۔',
      training: 'مقرر تربیت یا ورکشاپس منز شرکت خٲطرٕ رُخصتی چھِ ضروٗرت۔', familyFunction: 'اہم خاندانی یا مذہبی تقریبس منز شرکت خٲطرٕ رُخصتی چھِ ضروٗرت۔',
      travel: 'شہرٕ نِش باہر سفر کرُن چھُ، امہِ موجوب رُخصتی چھِ ضروٗرت۔', emergency: 'فوری ذاتی صورتحال موجوب رُخصتی چھِ ضروٗرت۔',
      bereavement: 'خاندانَس منز غم/وفات موجوب رُخصتی چھِ ضروٗرت۔', personal: 'اہم ذاتی کٲم خٲطرٕ رُخصتی چھِ ضروٗرت۔'
    }
  },
  {
    code: 'kok', label: 'कोंकणी (Konkani)', locale: 'kok-IN',
    single: 'हांव {start} दिसा रजेची विनंती करता/करती. {purpose}',
    range: 'हांव {start} सावन {end} मेरेन रजेची विनंती करता/करती. {purpose}',
    halfMorning: 'हांव {start} दिसा सकाळच्या सत्रा खातीर अर्द्या दिसाची रजा मागता/मागती. {purpose}',
    halfAfternoon: 'हांव {start} दिसा दनपारच्या सत्रा खातीर अर्द्या दिसाची रजा मागता/मागती. {purpose}',
    purposes: {
      health: 'म्हजी तब्येत बरी ना आनी विश्रांतीची गरज आसा.', medical: 'वैद्यकीय सल्लो, उपचार वा बरे जावपाखातीर रजेची गरज आसा.',
      familyCare: 'कुटुंबाची देखभाल करपाच्या जबाबदारीखातीर रजेची गरज आसा.', official: 'दिल्ली अधिकृत ड्युटी पूर्ण करपाखातीर रजेची गरज आसा.',
      training: 'ठरयल्ल्या प्रशिक्षण वा कार्यशाळेंत वांटो घेवपाखातीर रजेची गरज आसा.', familyFunction: 'महत्त्वाच्या कौटुंबिक वा धार्मिक कार्यक्रमांत वांटो घेवपाखातीर रजेची गरज आसा.',
      travel: 'शारा भायर प्रवास करचो आसा, म्हणून रजेची गरज आसा.', emergency: 'तातडीच्या वैयक्तिक परिस्थितीमुळे रजेची गरज आसा.',
      bereavement: 'कुटुंबांत शोक जाल्ल्यान रजेची गरज आसा.', personal: 'महत्त्वाच्या वैयक्तिक कामाखातीर रजेची गरज आसा.'
    }
  },
  {
    code: 'mai', label: 'मैथिली (Maithili)', locale: 'mai-IN',
    single: 'हम {start} केँ अवकाशक अनुरोध करैत छी। {purpose}',
    range: 'हम {start} सँ {end} धरि अवकाशक अनुरोध करैत छी। {purpose}',
    halfMorning: 'हम {start} केँ प्रातः सत्र लेल आधा दिनक अवकाशक अनुरोध करैत छी। {purpose}',
    halfAfternoon: 'हम {start} केँ अपराह्न सत्र लेल आधा दिनक अवकाशक अनुरोध करैत छी। {purpose}',
    purposes: {
      health: 'हम अस्वस्थ छी आ आराम तथा स्वास्थ्य लाभक आवश्यकता अछि।', medical: 'चिकित्सकीय परामर्श, उपचार अथवा स्वास्थ्य लाभ लेल अवकाश आवश्यक अछि।',
      familyCare: 'परिवारक देखभालक जिम्मेदारी लेल अवकाश आवश्यक अछि।', official: 'सौंपल आधिकारिक काज पूरा करबाक लेल अवकाश आवश्यक अछि।',
      training: 'निर्धारित प्रशिक्षण अथवा कार्यशालामे भाग लेबाक लेल अवकाश आवश्यक अछि।', familyFunction: 'महत्त्वपूर्ण पारिवारिक अथवा धार्मिक कार्यक्रममे भाग लेबाक लेल अवकाश आवश्यक अछि।',
      travel: 'शहर सँ बाहर यात्रा करबाक कारण अवकाश आवश्यक अछि।', emergency: 'तात्कालिक व्यक्तिगत परिस्थितिक कारण अवकाश आवश्यक अछि।',
      bereavement: 'परिवारमे शोकक कारण अवकाश आवश्यक अछि।', personal: 'महत्त्वपूर्ण व्यक्तिगत काज लेल अवकाश आवश्यक अछि।'
    }
  },
  {
    code: 'ml', label: 'മലയാളം (Malayalam)', locale: 'ml-IN',
    single: 'ഞാൻ {start} തീയതിയിൽ അവധിക്ക് അപേക്ഷിക്കുന്നു. {purpose}',
    range: 'ഞാൻ {start} മുതൽ {end} വരെ അവധിക്ക് അപേക്ഷിക്കുന്നു. {purpose}',
    halfMorning: 'ഞാൻ {start} തീയതിയിൽ രാവിലെ സെഷനായി അരദിവസ അവധിക്ക് അപേക്ഷിക്കുന്നു. {purpose}',
    halfAfternoon: 'ഞാൻ {start} തീയതിയിൽ ഉച്ചതിരിഞ്ഞ് സെഷനായി അരദിവസ അവധിക്ക് അപേക്ഷിക്കുന്നു. {purpose}',
    purposes: {
      health: 'എനിക്ക് അസുഖമായതിനാൽ വിശ്രമവും സുഖപ്രാപ്തിയും ആവശ്യമാണ്.', medical: 'വൈദ്യോപദേശം, ചികിത്സ അല്ലെങ്കിൽ സുഖപ്രാപ്തിക്കായി അവധി ആവശ്യമാണ്.',
      familyCare: 'കുടുംബപരിചരണ ഉത്തരവാദിത്വങ്ങൾക്കായി അവധി ആവശ്യമാണ്.', official: 'നൽകിയ ഔദ്യോഗിക ചുമതല നിർവഹിക്കാൻ അവധി ആവശ്യമാണ്.',
      training: 'നിശ്ചയിച്ച പരിശീലനത്തിലോ വർക്ക്‌ഷോപ്പിലോ പങ്കെടുക്കാൻ അവധി ആവശ്യമാണ്.', familyFunction: 'പ്രധാന കുടുംബ/മതപരമായ ചടങ്ങിൽ പങ്കെടുക്കാൻ അവധി ആവശ്യമാണ്.',
      travel: 'നഗരത്തിന് പുറത്തേക്ക് യാത്ര ചെയ്യേണ്ടതിനാൽ അവധി ആവശ്യമാണ്.', emergency: 'അടിയന്തര വ്യക്തിപരമായ സാഹചര്യത്തെ തുടർന്ന് അവധി ആവശ്യമാണ്.',
      bereavement: 'കുടുംബത്തിലെ ദുഃഖസംഭവത്തെ തുടർന്ന് അവധി ആവശ്യമാണ്.', personal: 'പ്രധാന വ്യക്തിപരമായ ആവശ്യത്തിനായി അവധി ആവശ്യമാണ്.'
    }
  },
  {
    code: 'mni', label: 'মৈতৈলোন (Manipuri)', locale: 'mni-IN',
    single: 'ꯑꯩ {start} ꯗ ꯂꯤꯚ ꯄꯤꯕꯤꯌꯨ ꯍꯥꯏꯅ ꯍꯥꯏꯖꯔꯤ। {purpose}',
    range: 'ꯑꯩ {start} ꯗꯒꯤ {end} ꯐꯥꯎꯕ ꯂꯤꯚ ꯄꯤꯕꯤꯌꯨ ꯍꯥꯏꯅ ꯍꯥꯏꯖꯔꯤ। {purpose}',
    halfMorning: 'ꯑꯩ {start} ꯗ ꯑꯌꯨꯛ ꯁꯦꯁꯟꯒꯤ ꯍꯥꯐ ꯗꯦ ꯂꯤꯚ ꯍꯥꯏꯖꯔꯤ। {purpose}',
    halfAfternoon: 'ꯑꯩ {start} ꯗ ꯅꯨꯡꯊꯤꯜ ꯁꯦꯁꯟꯒꯤ ꯍꯥꯐ ꯗꯦ ꯂꯤꯚ ꯍꯥꯏꯖꯔꯤ। {purpose}',
    purposes: {
      health: 'ꯑꯩ ꯍꯛꯆꯥꯡ ꯐꯠꯇꯕꯅ ꯄꯣꯠꯊꯕ ꯑꯃꯁꯨꯡ ꯐꯖꯕ ꯃꯊꯧ ꯇꯥꯔꯤ।', medical: 'ꯃꯦꯗꯤꯀꯦꯜ ꯄꯥꯎꯇꯥꯛ, ꯂꯥꯌꯦꯡ ꯅꯠꯇ꯭ꯔꯒ ꯐꯖꯕꯒꯤꯗꯃꯛ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।',
      familyCare: 'ꯏꯃꯨꯡꯒꯤ ꯌꯦꯡꯁꯤꯟꯕꯒꯤ ꯊꯧꯗꯥꯡꯒꯤꯗꯃꯛ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।', official: 'ꯄꯤꯔꯤꯕ ꯑꯣꯐꯤꯁꯤꯌꯦꯜ ꯊꯕꯛ ꯄꯥꯡꯊꯣꯛꯅꯕ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।',
      training: 'ꯁꯦꯃ ꯁꯥꯔꯕ ꯇ꯭ꯔꯦꯅꯤꯡ/ꯋꯥꯔꯛꯁꯣꯞꯇ ꯌꯥꯎꯅꯕ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।', familyFunction: 'ꯃꯔꯨꯑꯣꯏꯕ ꯏꯃꯨꯡ ꯅꯠꯇ꯭ꯔꯒ ꯂꯥꯏꯅꯤꯡꯒꯤ ꯊꯧꯔꯃꯗ ꯌꯥꯎꯅꯕ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।',
      travel: 'ꯁꯍꯔ ꯃꯄꯥꯟꯗ ꯆꯠꯄ ꯃꯊꯧ ꯇꯥꯕꯅ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।', emergency: 'ꯍꯛꯆꯥꯡꯒꯤ ꯑꯊꯨꯕ ꯊꯧꯗꯣꯛꯀꯤ ꯃꯔꯃꯅ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।',
      bereavement: 'ꯏꯃꯨꯡꯗ ꯑꯋꯥꯕ ꯊꯧꯗꯣꯛꯀꯤ ꯃꯔꯃꯅ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।', personal: 'ꯃꯔꯨꯑꯣꯏꯕ ꯃꯁꯥꯒꯤ ꯊꯕꯛꯀꯤꯗꯃꯛ ꯂꯤꯚ ꯃꯊꯧ ꯇꯥꯔꯤ।'
    }
  },
  {
    code: 'mr', label: 'मराठी (Marathi)', locale: 'mr-IN',
    single: 'मी {start} रोजी रजेची विनंती करतो/करते. {purpose}',
    range: 'मी {start} ते {end} या कालावधीसाठी रजेची विनंती करतो/करते. {purpose}',
    halfMorning: 'मी {start} रोजी सकाळच्या सत्रासाठी अर्ध्या दिवसाच्या रजेची विनंती करतो/करते. {purpose}',
    halfAfternoon: 'मी {start} रोजी दुपारच्या सत्रासाठी अर्ध्या दिवसाच्या रजेची विनंती करतो/करते. {purpose}',
    purposes: {
      health: 'माझी प्रकृती ठीक नसल्यामुळे विश्रांती व आरोग्य लाभाची गरज आहे.', medical: 'वैद्यकीय सल्ला, उपचार किंवा आरोग्य लाभासाठी रजेची आवश्यकता आहे.',
      familyCare: 'कुटुंबाची देखभाल करण्याच्या जबाबदारीसाठी रजेची आवश्यकता आहे.', official: 'सोपवलेले अधिकृत कर्तव्य पार पाडण्यासाठी रजेची आवश्यकता आहे.',
      training: 'नियोजित प्रशिक्षण किंवा कार्यशाळेत सहभागी होण्यासाठी रजेची आवश्यकता आहे.', familyFunction: 'महत्त्वाच्या कौटुंबिक किंवा धार्मिक कार्यक्रमात सहभागी होण्यासाठी रजेची आवश्यकता आहे.',
      travel: 'मला शहराबाहेर प्रवास करायचा असल्यामुळे रजेची आवश्यकता आहे.', emergency: 'तातडीच्या वैयक्तिक परिस्थितीमुळे रजेची आवश्यकता आहे.',
      bereavement: 'कुटुंबातील दुःखद घटनेमुळे रजेची आवश्यकता आहे.', personal: 'महत्त्वाच्या वैयक्तिक कामासाठी रजेची आवश्यकता आहे.'
    }
  },
  {
    code: 'ne', label: 'नेपाली (Nepali)', locale: 'ne-IN',
    single: 'म {start} मा बिदाको अनुरोध गर्दछु। {purpose}',
    range: 'म {start} देखि {end} सम्म बिदाको अनुरोध गर्दछु। {purpose}',
    halfMorning: 'म {start} मा बिहानको सत्रका लागि आधा दिन बिदाको अनुरोध गर्दछु। {purpose}',
    halfAfternoon: 'म {start} मा दिउँसोको सत्रका लागि आधा दिन बिदाको अनुरोध गर्दछु। {purpose}',
    purposes: {
      health: 'मेरो स्वास्थ्य ठीक नभएकाले आराम र स्वास्थ्यलाभ आवश्यक छ।', medical: 'चिकित्सकीय परामर्श, उपचार वा स्वास्थ्यलाभका लागि बिदा आवश्यक छ।',
      familyCare: 'परिवारको हेरचाहसम्बन्धी जिम्मेवारीका लागि बिदा आवश्यक छ।', official: 'तोकिएको आधिकारिक जिम्मेवारी पूरा गर्न बिदा आवश्यक छ।',
      training: 'निर्धारित तालिम वा कार्यशालामा सहभागी हुन बिदा आवश्यक छ।', familyFunction: 'महत्त्वपूर्ण पारिवारिक वा धार्मिक कार्यक्रममा सहभागी हुन बिदा आवश्यक छ।',
      travel: 'शहरबाहिर यात्रा गर्नुपर्ने भएकाले बिदा आवश्यक छ।', emergency: 'आकस्मिक व्यक्तिगत परिस्थितिका कारण बिदा आवश्यक छ।',
      bereavement: 'परिवारमा शोक परेको कारण बिदा आवश्यक छ।', personal: 'महत्त्वपूर्ण व्यक्तिगत कामका लागि बिदा आवश्यक छ।'
    }
  },
  {
    code: 'or', label: 'ଓଡ଼ିଆ (Odia)', locale: 'or-IN',
    single: 'ମୁଁ {start} ତାରିଖରେ ଛୁଟି ପାଇଁ ଅନୁରୋଧ କରୁଛି। {purpose}',
    range: 'ମୁଁ {start} ରୁ {end} ପର୍ଯ୍ୟନ୍ତ ଛୁଟି ପାଇଁ ଅନୁରୋଧ କରୁଛି। {purpose}',
    halfMorning: 'ମୁଁ {start} ତାରିଖରେ ସକାଳ ସେସନ୍ ପାଇଁ ଅର୍ଦ୍ଧଦିନ ଛୁଟି ଅନୁରୋଧ କରୁଛି। {purpose}',
    halfAfternoon: 'ମୁଁ {start} ତାରିଖରେ ଅପରାହ୍ଣ ସେସନ୍ ପାଇଁ ଅର୍ଦ୍ଧଦିନ ଛୁଟି ଅନୁରୋଧ କରୁଛି। {purpose}',
    purposes: {
      health: 'ମୋର ସ୍ୱାସ୍ଥ୍ୟ ଭଲ ନଥିବାରୁ ବିଶ୍ରାମ ଓ ସୁସ୍ଥତା ଆବଶ୍ୟକ।', medical: 'ଚିକିତ୍ସା ପରାମର୍ଶ, ଚିକିତ୍ସା କିମ୍ବା ସୁସ୍ଥତା ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।',
      familyCare: 'ପରିବାରର ଯତ୍ନ ଦାୟିତ୍ୱ ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।', official: 'ନିର୍ଦ୍ଦିଷ୍ଟ ସରକାରୀ/ଅଧିକାରିକ କର୍ତ୍ତବ୍ୟ ପାଳନ ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।',
      training: 'ନିର୍ଦ୍ଧାରିତ ପ୍ରଶିକ୍ଷଣ କିମ୍ବା କର୍ମଶାଳାରେ ଯୋଗଦେବା ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।', familyFunction: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପାରିବାରିକ କିମ୍ବା ଧାର୍ମିକ କାର୍ଯ୍ୟକ୍ରମରେ ଯୋଗଦେବା ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।',
      travel: 'ସହର ବାହାରେ ଯାତ୍ରା କରିବାକୁ ଥିବାରୁ ଛୁଟି ଆବଶ୍ୟକ।', emergency: 'ଜରୁରୀ ବ୍ୟକ୍ତିଗତ ପରିସ୍ଥିତି ଯୋଗୁଁ ଛୁଟି ଆବଶ୍ୟକ।',
      bereavement: 'ପରିବାରରେ ଶୋକ ଯୋଗୁଁ ଛୁଟି ଆବଶ୍ୟକ।', personal: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ବ୍ୟକ୍ତିଗତ କାମ ପାଇଁ ଛୁଟି ଆବଶ୍ୟକ।'
    }
  },
  {
    code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', locale: 'pa-IN',
    single: 'ਮੈਂ {start} ਨੂੰ ਛੁੱਟੀ ਲਈ ਬੇਨਤੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ। {purpose}',
    range: 'ਮੈਂ {start} ਤੋਂ {end} ਤੱਕ ਛੁੱਟੀ ਲਈ ਬੇਨਤੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ। {purpose}',
    halfMorning: 'ਮੈਂ {start} ਨੂੰ ਸਵੇਰੇ ਦੇ ਸੈਸ਼ਨ ਲਈ ਅੱਧੇ ਦਿਨ ਦੀ ਛੁੱਟੀ ਦੀ ਬੇਨਤੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ। {purpose}',
    halfAfternoon: 'ਮੈਂ {start} ਨੂੰ ਦੁਪਹਿਰ ਦੇ ਸੈਸ਼ਨ ਲਈ ਅੱਧੇ ਦਿਨ ਦੀ ਛੁੱਟੀ ਦੀ ਬੇਨਤੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ। {purpose}',
    purposes: {
      health: 'ਮੇਰੀ ਤਬੀਅਤ ਠੀਕ ਨਹੀਂ ਹੈ ਅਤੇ ਆਰਾਮ ਤੇ ਸਿਹਤਯਾਬੀ ਦੀ ਲੋੜ ਹੈ।', medical: 'ਡਾਕਟਰੀ ਸਲਾਹ, ਇਲਾਜ ਜਾਂ ਸਿਹਤਯਾਬੀ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।',
      familyCare: 'ਪਰਿਵਾਰ ਦੀ ਦੇਖਭਾਲ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।', official: 'ਸੌਂਪੀ ਗਈ ਅਧਿਕਾਰਿਕ ਡਿਊਟੀ ਨਿਭਾਉਣ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।',
      training: 'ਨਿਰਧਾਰਤ ਟ੍ਰੇਨਿੰਗ ਜਾਂ ਵਰਕਸ਼ਾਪ ਵਿੱਚ ਹਿੱਸਾ ਲੈਣ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।', familyFunction: 'ਮਹੱਤਵਪੂਰਨ ਪਰਿਵਾਰਕ ਜਾਂ ਧਾਰਮਿਕ ਸਮਾਗਮ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਣ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।',
      travel: 'ਸ਼ਹਿਰ ਤੋਂ ਬਾਹਰ ਯਾਤਰਾ ਕਰਨੀ ਹੈ, ਇਸ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।', emergency: 'ਤੁਰੰਤ ਨਿੱਜੀ ਐਮਰਜੈਂਸੀ ਕਾਰਨ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।',
      bereavement: 'ਪਰਿਵਾਰ ਵਿੱਚ ਸੋਗ ਦੇ ਕਾਰਨ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।', personal: 'ਮਹੱਤਵਪੂਰਨ ਨਿੱਜੀ ਕੰਮ ਲਈ ਛੁੱਟੀ ਦੀ ਲੋੜ ਹੈ।'
    }
  },
  {
    code: 'sa', label: 'संस्कृतम् (Sanskrit)', locale: 'sa-IN',
    single: 'अहं {start} दिने अवकाशं प्रार्थये। {purpose}',
    range: 'अहं {start} तः {end} पर्यन्तम् अवकाशं प्रार्थये। {purpose}',
    halfMorning: 'अहं {start} दिने प्रातःसत्राय अर्धदिवसीयम् अवकाशं प्रार्थये। {purpose}',
    halfAfternoon: 'अहं {start} दिने अपराह्णसत्राय अर्धदिवसीयम् अवकाशं प्रार्थये। {purpose}',
    purposes: {
      health: 'मम स्वास्थ्यं सम्यक् नास्ति, विश्रामस्य स्वास्थ्यलाभस्य च आवश्यकता अस्ति।', medical: 'वैद्यकीयपरामर्शाय उपचाराय वा स्वास्थ्यलाभाय अवकाशस्य आवश्यकता अस्ति।',
      familyCare: 'कुटुम्बपरिचर्यायाः दायित्वाय अवकाशस्य आवश्यकता अस्ति।', official: 'नियुक्तम् आधिकारिकं कर्तव्यं सम्पादयितुम् अवकाशस्य आवश्यकता अस्ति।',
      training: 'निर्धारितप्रशिक्षणे कार्यशालायां वा भागं ग्रहीतुम् अवकाशस्य आवश्यकता अस्ति।', familyFunction: 'महत्त्वपूर्णे कौटुम्बिके धार्मिके वा कार्यक्रमे भागं ग्रहीतुम् अवकाशस्य आवश्यकता अस्ति।',
      travel: 'नगरात् बहिः यात्रा कर्तव्या, अतः अवकाशस्य आवश्यकता अस्ति।', emergency: 'तात्कालिकव्यक्तिगतपरिस्थितेः कारणात् अवकाशस्य आवश्यकता अस्ति।',
      bereavement: 'कुटुम्बे शोकस्य कारणात् अवकाशस्य आवश्यकता अस्ति।', personal: 'महत्त्वपूर्णव्यक्तिगतकार्याय अवकाशस्य आवश्यकता अस्ति।'
    }
  },
  {
    code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', locale: 'sat-Olck-IN',
    single: 'ᱤᱧ {start} ᱫᱤᱱ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱨᱫᱟᱥ ᱮᱫᱟᱹᱧ। {purpose}',
    range: 'ᱤᱧ {start} ᱠᱷᱚᱱ {end} ᱫᱷᱟᱹᱵᱤᱡ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱨᱫᱟᱥ ᱮᱫᱟᱹᱧ। {purpose}',
    halfMorning: 'ᱤᱧ {start} ᱫᱤᱱ ᱥᱮᱛᱟᱜ ᱥᱮᱥᱚᱱ ᱞᱟᱹᱜᱤᱫ ᱟᱫᱷᱟ ᱫᱤᱱ ᱪᱷᱩᱴᱤ ᱟᱨᱫᱟᱥ ᱮᱫᱟᱹᱧ। {purpose}',
    halfAfternoon: 'ᱤᱧ {start} ᱫᱤᱱ ᱛᱟᱭᱚᱢ ᱥᱮᱥᱚᱱ ᱞᱟᱹᱜᱤᱫ ᱟᱫᱷᱟ ᱫᱤᱱ ᱪᱷᱩᱴᱤ ᱟᱨᱫᱟᱥ ᱮᱫᱟᱹᱧ। {purpose}',
    purposes: {
      health: 'ᱤᱧ ᱵᱮᱥ ᱵᱟᱹᱧ ᱛᱟᱦᱮᱸᱱᱟ ᱟᱨ ᱨᱩᱲᱩᱫ ᱞᱟᱹᱠᱛᱤ।', medical: 'ᱫᱟᱠᱛᱟᱨ ᱟᱨᱥᱟᱞ, ᱨᱟᱱ ᱟᱨ ᱵᱮᱥᱚᱜ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।',
      familyCare: 'ᱜᱷᱟᱨᱚᱧᱡ ᱡᱚᱛᱚᱱ ᱫᱟᱭᱤᱛᱚ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।', official: 'ᱮᱢ ᱟᱠᱟᱱ ᱚᱯᱷᱤᱥ ᱫᱟᱭᱤᱛᱚ ᱯᱩᱨᱟᱹ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।',
      training: 'ᱴᱨᱮᱱᱤᱝ ᱟᱨ ᱣᱟᱨᱠᱥᱚᱯ ᱨᱮ ᱥᱮᱞᱮᱫ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।', familyFunction: 'ᱢᱩᱞᱩᱠ ᱜᱷᱟᱨᱚᱧᱡ ᱟᱨ ᱫᱷᱚᱨᱚᱢ ᱟᱱᱩᱥᱴᱷᱟᱱ ᱨᱮ ᱥᱮᱞᱮᱫ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।',
      travel: 'ᱥᱚᱦᱚᱨ ᱵᱟᱦᱨᱮ ᱥᱮᱱᱚᱜ ᱞᱟᱹᱠᱛᱤ, ᱚᱱᱟᱛᱮ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।', emergency: 'ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤ ᱱᱤᱡᱮᱨ ᱡᱟᱹᱨᱩᱨᱤ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।',
      bereavement: 'ᱜᱷᱟᱨᱚᱧᱡ ᱨᱮ ᱥᱚᱠ ᱠᱟᱱᱟ, ᱚᱱᱟᱛᱮ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।', personal: 'ᱢᱩᱞᱩᱠ ᱱᱤᱡᱮᱨ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱪᱷᱩᱴᱤ ᱞᱟᱹᱠᱛᱤ।'
    }
  },
  {
    code: 'sd', label: 'سنڌي (Sindhi)', locale: 'sd-IN',
    single: 'مان {start} تي موڪل جي درخواست ڪريان ٿو/ٿي. {purpose}',
    range: 'مان {start} کان {end} تائين موڪل جي درخواست ڪريان ٿو/ٿي. {purpose}',
    halfMorning: 'مان {start} تي صبح واري سيشن لاءِ اڌ ڏينهن جي موڪل جي درخواست ڪريان ٿو/ٿي. {purpose}',
    halfAfternoon: 'مان {start} تي منجهند واري سيشن لاءِ اڌ ڏينهن جي موڪل جي درخواست ڪريان ٿو/ٿي. {purpose}',
    purposes: {
      health: 'منهنجي طبيعت ٺيڪ ناهي ۽ آرام ۽ صحتيابي جي ضرورت آهي.', medical: 'طبي صلاح، علاج يا صحتيابي لاءِ موڪل جي ضرورت آهي.',
      familyCare: 'خاندان جي سنڀال جي ذميوارين لاءِ موڪل جي ضرورت آهي.', official: 'مقرر سرڪاري/دفتري ذميواري نڀائڻ لاءِ موڪل جي ضرورت آهي.',
      training: 'مقرر تربيت يا ورڪشاپ ۾ شرڪت لاءِ موڪل جي ضرورت آهي.', familyFunction: 'اهم خانداني يا مذهبي تقريب ۾ شرڪت لاءِ موڪل جي ضرورت آهي.',
      travel: 'شهر کان ٻاهر سفر ڪرڻو آهي، تنهنڪري موڪل جي ضرورت آهي.', emergency: 'تڪڙي ذاتي هنگامي صورتحال سبب موڪل جي ضرورت آهي.',
      bereavement: 'خاندان ۾ سوڳ سبب موڪل جي ضرورت آهي.', personal: 'اهم ذاتي ڪم لاءِ موڪل جي ضرورت آهي.'
    }
  },
  {
    code: 'ta', label: 'தமிழ் (Tamil)', locale: 'ta-IN',
    single: 'நான் {start} அன்று விடுப்பு கோருகிறேன். {purpose}',
    range: 'நான் {start} முதல் {end} வரை விடுப்பு கோருகிறேன். {purpose}',
    halfMorning: 'நான் {start} அன்று காலை அமர்விற்காக அரை நாள் விடுப்பு கோருகிறேன். {purpose}',
    halfAfternoon: 'நான் {start} அன்று பிற்பகல் அமர்விற்காக அரை நாள் விடுப்பு கோருகிறேன். {purpose}',
    purposes: {
      health: 'எனக்கு உடல்நலம் சரியில்லை; ஓய்வும் குணமடைவதும் தேவையாக உள்ளது.', medical: 'மருத்துவ ஆலோசனை, சிகிச்சை அல்லது குணமடைவதற்காக விடுப்பு தேவை.',
      familyCare: 'குடும்ப பராமரிப்பு பொறுப்புகளுக்காக விடுப்பு தேவை.', official: 'ஒதுக்கப்பட்ட அதிகாரப்பூர்வ பணியை நிறைவேற்ற விடுப்பு தேவை.',
      training: 'திட்டமிடப்பட்ட பயிற்சி அல்லது பணிமனையில் பங்கேற்க விடுப்பு தேவை.', familyFunction: 'முக்கிய குடும்ப அல்லது மத நிகழ்ச்சியில் பங்கேற்க விடுப்பு தேவை.',
      travel: 'ஊருக்கு வெளியே பயணம் செய்ய வேண்டியதால் விடுப்பு தேவை.', emergency: 'அவசர தனிப்பட்ட சூழ்நிலை காரணமாக விடுப்பு தேவை.',
      bereavement: 'குடும்பத்தில் ஏற்பட்ட துயர நிகழ்வு காரணமாக விடுப்பு தேவை.', personal: 'முக்கிய தனிப்பட்ட பணிக்காக விடுப்பு தேவை.'
    }
  },
  {
    code: 'te', label: 'తెలుగు (Telugu)', locale: 'te-IN',
    single: 'నేను {start} తేదీన సెలవు కోరుతున్నాను. {purpose}',
    range: 'నేను {start} నుండి {end} వరకు సెలవు కోరుతున్నాను. {purpose}',
    halfMorning: 'నేను {start} తేదీన ఉదయం సెషన్ కోసం అర్ధదిన సెలవు కోరుతున్నాను. {purpose}',
    halfAfternoon: 'నేను {start} తేదీన మధ్యాహ్న సెషన్ కోసం అర్ధదిన సెలవు కోరుతున్నాను. {purpose}',
    purposes: {
      health: 'నా ఆరోగ్యం బాగోలేదు; విశ్రాంతి మరియు కోలుకోవడం అవసరం.', medical: 'వైద్య సలహా, చికిత్స లేదా కోలుకోవడానికి సెలవు అవసరం.',
      familyCare: 'కుటుంబ సంరక్షణ బాధ్యతల కోసం సెలవు అవసరం.', official: 'అప్పగించిన అధికారిక విధిని నిర్వహించడానికి సెలవు అవసరం.',
      training: 'నిర్దేశించిన శిక్షణ లేదా వర్క్‌షాప్‌లో పాల్గొనడానికి సెలవు అవసరం.', familyFunction: 'ముఖ్యమైన కుటుంబ లేదా మత కార్యక్రమంలో పాల్గొనడానికి సెలవు అవసరం.',
      travel: 'పట్టణం వెలుపల ప్రయాణించాల్సి ఉండడంతో సెలవు అవసరం.', emergency: 'అత్యవసర వ్యక్తిగత పరిస్థితి కారణంగా సెలవు అవసరం.',
      bereavement: 'కుటుంబంలో శోకం కారణంగా సెలవు అవసరం.', personal: 'ముఖ్యమైన వ్యక్తిగత పనికి సెలవు అవసరం.'
    }
  },
  {
    code: 'ur', label: 'اردو (Urdu)', locale: 'ur-IN',
    single: 'میں {start} کو رخصت کی درخواست کرتا/کرتی ہوں۔ {purpose}',
    range: 'میں {start} سے {end} تک رخصت کی درخواست کرتا/کرتی ہوں۔ {purpose}',
    halfMorning: 'میں {start} کو صبح کے سیشن کے لیے نصف دن کی رخصت کی درخواست کرتا/کرتی ہوں۔ {purpose}',
    halfAfternoon: 'میں {start} کو دوپہر کے سیشن کے لیے نصف دن کی رخصت کی درخواست کرتا/کرتی ہوں۔ {purpose}',
    purposes: {
      health: 'میری طبیعت ٹھیک نہیں ہے اور مجھے آرام اور صحت یابی کی ضرورت ہے۔', medical: 'طبی مشورے، علاج یا صحت یابی کے لیے رخصت درکار ہے۔',
      familyCare: 'خاندان کی دیکھ بھال کی ذمہ داریوں کے لیے رخصت درکار ہے۔', official: 'تفویض کردہ سرکاری/دفتری ذمہ داری انجام دینے کے لیے رخصت درکار ہے۔',
      training: 'مقررہ تربیت یا ورکشاپ میں شرکت کے لیے رخصت درکار ہے۔', familyFunction: 'اہم خاندانی یا مذہبی تقریب میں شرکت کے لیے رخصت درکار ہے۔',
      travel: 'مجھے شہر سے باہر سفر کرنا ہے، اس لیے رخصت درکار ہے۔', emergency: 'فوری ذاتی ہنگامی صورتحال کی وجہ سے رخصت درکار ہے۔',
      bereavement: 'خاندان میں سوگ کی وجہ سے رخصت درکار ہے۔', personal: 'اہم ذاتی کام کے لیے رخصت درکار ہے۔'
    }
  }
];

const LEAVE_REASON_LOCALE_MAP = Object.fromEntries(
  LEAVE_REASON_LOCALES.map(item => [item.code, item])
) as Record<LeaveReasonLanguageCode, LeaveReasonLocale>;

const getDefaultReasonLanguage = (uiLanguage: Language): LeaveReasonLanguageCode => {
  if (uiLanguage === 'hi') return 'hi';
  if (uiLanguage === 'ur') return 'ur';
  return 'en';
};

const formatAutoLeaveDate = (isoDate: string, languageCode: LeaveReasonLanguageCode) => {
  if (!isoDate) return '';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  const locale = LEAVE_REASON_LOCALE_MAP[languageCode]?.locale || 'en-IN';
  try {
    return parsed.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }
};

const resolveLeavePurposeKey = (leaveType: string): LeavePurposeKey => {
  const normalized = leaveType.toLowerCase();
  if (normalized.includes('sick') || normalized.includes('fever')) return 'health';
  if (normalized.includes('medical')) return 'medical';
  if (normalized.includes('maternity') || normalized.includes('paternity') || normalized.includes('child care')) return 'familyCare';
  if (normalized.includes('official duty') || normalized.includes('election duty') || normalized.includes('examination duty')) return 'official';
  if (normalized.includes('training') || normalized.includes('workshop')) return 'training';
  if (normalized.includes('family function') || normalized.includes('marriage') || normalized.includes('religious')) return 'familyFunction';
  if (normalized.includes('out of city') || normalized.includes('out of station') || normalized.includes('travel')) return 'travel';
  if (normalized.includes('emergency')) return 'emergency';
  if (normalized.includes('death in family') || normalized.includes('bereavement')) return 'bereavement';
  return 'personal';
};

const fillLeaveReasonTemplate = (template: string, start: string, end: string, purpose: string) => template
  .replaceAll('{start}', start)
  .replaceAll('{end}', end)
  .replaceAll('{purpose}', purpose);

const buildAutomaticLeaveReason = (
  leaveType: string,
  startDate: string,
  endDate: string,
  isHalfDayLeave: boolean,
  halfDaySession: 'Morning Session' | 'Afternoon Session',
  languageCode: LeaveReasonLanguageCode
) => {
  if (!leaveType || !startDate || !endDate) return '';

  const locale = LEAVE_REASON_LOCALE_MAP[languageCode] || LEAVE_REASON_LOCALE_MAP.en;
  const startLabel = formatAutoLeaveDate(startDate, languageCode);
  const endLabel = formatAutoLeaveDate(endDate, languageCode);
  const purpose = locale.purposes[resolveLeavePurposeKey(leaveType)] || locale.purposes.personal;

  const template = isHalfDayLeave
    ? (halfDaySession === 'Afternoon Session' ? locale.halfAfternoon : locale.halfMorning)
    : startDate === endDate
      ? locale.single
      : locale.range;

  return fillLeaveReasonTemplate(template, startLabel, endLabel, purpose);
};

const LEAVE_FEATURE_TAB: Record<string, LeaveWorkspaceTab> = {
  'student-leave-review': 'dashboard',
  'staff-leave-review': 'dashboard',
  'leave-escalations': 'dashboard',
  'leave-history': 'reports',
  'leave-policy-reports': 'master_settings',
  'cl-apply-leave': 'apply',
  'cl-my-leave-status': 'dashboard',
  'cl-my-leave-history': 'reports',
  'cl-leave-summary': 'dashboard'
};

export default function SmartLeaveManager({ lang, user, onRefreshData, activeFeatureId = null, focusedMode = false, focusedTitle = 'Leave Management' }: SmartLeaveManagerProps) {
  const t = translations[lang] || translations['en'];
  const isUrdu = lang === 'ur';

  // --- CORE STATE ---
  const [reasons, setReasons] = useState<LeaveReason[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [notifications, setNotifications] = useState<LeaveNotification[]>([]);
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);

  // --- SMART LEAVE CALENDAR & HOLIDAY MASTER STATES ---
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const stored = localStorage.getItem('nhs_erp_holidays');
    if (!stored) return [];
    try { return JSON.parse(stored); } catch { return []; }
  });

  const [leaveRule, setLeaveRule] = useState<'Rule A' | 'Rule B' | 'Rule C'>(() => {
    const stored = localStorage.getItem('nhs_erp_leave_rule');
    return (stored as 'Rule A' | 'Rule B' | 'Rule C') || 'Rule A';
  });

  const [leaveSettingsCloudReady, setLeaveSettingsCloudReady] = useState(false);
  const loadHeadmasterLeaveSettings = async () => {
    if (user.role !== 'headmaster') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Secure Headmaster session unavailable.');
      const response = await fetch('/api/headmaster/leave-settings', { headers:{Authorization:`Bearer ${session.access_token}`}, cache:'no-store' });
      const payload = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Leave settings could not be loaded.');
      if(Array.isArray(payload.holidays)){setHolidays(payload.holidays);localStorage.setItem('nhs_erp_holidays',JSON.stringify(payload.holidays));}
      if(['Rule A','Rule B','Rule C'].includes(payload.leaveRule)){setLeaveRule(payload.leaveRule);localStorage.setItem('nhs_erp_leave_rule',payload.leaveRule);}
      if(payload.activeAcademicYear?.year)setNewHolidayAcademicYear(String(payload.activeAcademicYear.year));
      setLeaveSettingsCloudReady(true);
    } catch(error){ console.warn('Headmaster Leave settings cloud refresh failed; using compatibility cache.',error); setLeaveSettingsCloudReady(false); }
  };

  useEffect(()=>{ void loadHeadmasterLeaveSettings(); },[user.id,user.role]);

  const saveHeadmasterHolidayCloud = async (holiday: Holiday) => {
    const { data: { session } } = await supabase.auth.getSession();
    if(!session?.access_token) throw new Error('Secure Headmaster session unavailable.');
    const response=await fetch('/api/headmaster/leave-settings/holidays',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({holiday})});
    const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload.error||'Holiday could not be saved.'); return payload;
  };

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth()); // 0-indexed

  // Holiday master sub-tab toggle: 'reasons' | 'holidays'
  const [masterSubTab, setMasterSubTab] = useState<'reasons' | 'holidays'>('reasons');

  // Holiday Editor Form States
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<Holiday['type']>('Government Holiday');
  const [newHolidayStart, setNewHolidayStart] = useState('');
  const [newHolidayEnd, setNewHolidayEnd] = useState('');
  const [newHolidayClasses, setNewHolidayClasses] = useState('All');
  const [newHolidayRemarks, setNewHolidayRemarks] = useState('');
  const [newHolidayAcademicYear, setNewHolidayAcademicYear] = useState('2026-27');
  const [holidayReminderEnabled, setHolidayReminderEnabled] = useState(true);
  const [holidayChannels, setHolidayChannels] = useState({ website: true, email: true, sms: true, whatsapp: true });

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    holidays.filter(holiday => holiday.reminderEnabled !== false && holiday.startDate === tomorrowKey).forEach(holiday => {
      const deliveryKey = `nhs_holiday_reminder_${holiday.id}_${tomorrowKey}`;
      if (localStorage.getItem(deliveryKey)) return;

      const channels = holiday.notificationChannels || { website: true, email: true, sms: true, whatsapp: true };
      const message = `Holiday tomorrow: ${holiday.name} (${holiday.startDate}${holiday.endDate !== holiday.startDate ? ` to ${holiday.endDate}` : ''}). ${holiday.remarks || ''}`.trim();

      if (channels.website) {
        LocalERPDatabase.addSystemNotification('all', `Holiday Reminder: ${holiday.name}`, message);
      }

      localStorage.setItem(deliveryKey, new Date().toISOString());

      if (channels.email || channels.sms || channels.whatsapp) {
        void (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            await fetch('/api/notifications/holiday-reminder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ holiday, channels, message })
            });
          } catch (error) {
            console.error('Holiday external notification dispatch failed', error);
          }
        })();
      }
    });
  }, [holidays]);

  // --- NAVIGATION STATE ---
  // 'dashboard' | 'apply' | 'master_settings' | 'reports' | 'notifications'
  const [activeTab, setActiveTab] = useState<LeaveWorkspaceTab>('dashboard');

  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = LEAVE_FEATURE_TAB[activeFeatureId];
    if (nextTab) setActiveTab(nextTab);

    const reviewFeature = ['student-leave-review', 'staff-leave-review', 'leave-escalations', 'cl-my-leave-status', 'cl-leave-summary'].includes(activeFeatureId);
    if (reviewFeature) setViewMode('list');

    setFilterStatus(['leave-escalations'].includes(activeFeatureId) ? 'Pending' : 'All');
    setFilterRole(['student-leave-review'].includes(activeFeatureId) ? 'student' : ['staff-leave-review'].includes(activeFeatureId) ? 'staff' : 'All');
    setSearchTerm('');
    setFilterClassId('All');
    setFilterLeaveType('All');
    setFilterDate('');
  }, [activeFeatureId]);

  // --- SEARCH AND FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterLeaveType, setFilterLeaveType] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // --- FORM STATES ---
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayOption, setHalfDayOption] = useState<'Morning Session' | 'Afternoon Session'>('Morning Session');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [customReasonEnabled, setCustomReasonEnabled] = useState(false);
  const [customLeaveType, setCustomLeaveType] = useState('');
  const [leaveReasonText, setLeaveReasonText] = useState('');
  const [reasonAutoMode, setReasonAutoMode] = useState(true);
  const [reasonLanguage, setReasonLanguage] = useState<LeaveReasonLanguageCode>(() => getDefaultReasonLanguage(lang));
  const [reasonGenerating, setReasonGenerating] = useState(false);
  const [reasonGenerationSource, setReasonGenerationSource] = useState<'auto' | 'ai' | 'template' | 'manual'>('auto');
  const [attachmentFile, setAttachmentFile] = useState<string>('');
  const [formRemarks, setFormRemarks] = useState('');

  const autoLeaveReason = useMemo(() => {
    if (user.role === 'student') return '';
    const finalType = customReasonEnabled ? customLeaveType.trim() : selectedLeaveType;
    return buildAutomaticLeaveReason(finalType, leaveStart, leaveEnd, isHalfDay, halfDayOption, reasonLanguage);
  }, [user.role, customReasonEnabled, customLeaveType, selectedLeaveType, leaveStart, leaveEnd, isHalfDay, halfDayOption, reasonLanguage]);

  useEffect(() => {
    if (user.role === 'student' || !reasonAutoMode) return;
    setLeaveReasonText(autoLeaveReason);
    if (autoLeaveReason) setReasonGenerationSource('auto');
  }, [user.role, reasonAutoMode, autoLeaveReason]);

  // Review & Remarks Modal / Form Context
  const [reviewingLeave, setReviewingLeave] = useState<LeaveApplication | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // --- REASON MASTER EDITOR STATES ---
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editReasonName, setEditReasonName] = useState('');
  const [newReasonName, setNewReasonName] = useState('');
  const [newReasonCategory, setNewReasonCategory] = useState<'student' | 'teacher' | 'staff'>('student');

  // --- REPORT FILTER STATES ---
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly' | 'student_register' | 'teacher_register' | 'holiday_list' | 'working_days' | 'monthly_holidays' | 'academic_calendar'>('monthly');

  useEffect(() => {
    if (activeFeatureId === 'leave-history' || activeFeatureId === 'cl-my-leave-history') {
      setReportType('monthly');
      setReportStatusFilter('All');
    }
  }, [activeFeatureId]);

  const focusedFeatureDescription = activeFeatureId === 'cl-apply-leave'
    ? 'Submit your own Clerk leave application. The request remains Pending until the Headmaster gives the final decision.'
    : activeFeatureId === 'cl-my-leave-status'
      ? 'Track only your own Clerk leave applications and see whether each request is Pending, Approved, Rejected or Cancelled.'
      : activeFeatureId === 'cl-my-leave-history'
        ? 'Review and export only your own Clerk leave history. Other school users are excluded from this workspace.'
        : activeFeatureId === 'cl-leave-summary'
          ? 'See your own total, pending, approved, rejected and cancelled leave-request counts.'
          : activeFeatureId === 'student-leave-review'
            ? 'Review only student leave applications in the authorized Headmaster workflow.'
            : activeFeatureId === 'staff-leave-review'
              ? 'Review Teacher and staff leave applications in the authorized Headmaster workflow.'
              : activeFeatureId === 'leave-escalations'
                ? 'Pending leave cases requiring Headmaster attention. This queue stays locked to pending requests.'
                : activeFeatureId === 'leave-history'
                  ? 'Read and export the historical leave register without mixing it with attendance entry screens.'
                  : activeFeatureId === 'leave-policy-reports'
                    ? 'Manage canonical leave reasons, holiday rules and the active sandwich-policy configuration.'
                    : 'Fully automated workflow links approved leave with the attendance register without duplicating attendance entry.';

  const focusedListTitle = activeFeatureId === 'cl-my-leave-status'
    ? 'My Leave Applications'
    : activeFeatureId === 'cl-leave-summary'
      ? 'My Leave Summary & Applications'
      : activeFeatureId === 'student-leave-review'
        ? 'Student Leave Application Queue'
        : activeFeatureId === 'staff-leave-review'
          ? 'Staff & Teacher Leave Application Queue'
          : activeFeatureId === 'leave-escalations'
            ? 'Pending Approval Queue'
            : user.role === 'clerk' || user.role === 'student' ? 'My Leave Application Records' : 'System Wide Leave Applications';
  const [reportMonth, setReportMonth] = useState('2026-06');
  const [reportYear, setReportYear] = useState('2026');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportStatusFilter, setReportStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [printSize, setPrintSize] = useState<'A4' | 'A3'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [printTheme, setPrintTheme] = useState<'Color' | 'BW'>('Color');

  // --- SEED MASTER LEAVE REASONS ---
  const defaultStudentReasons = [
    'Sick Leave', 'Fever', 'Medical Check-up', 'Hospital Visit', 'Dental Treatment',
    'Eye Check-up', 'Family Function', 'Marriage Function', 'Some Domestic Work',
    'Out of City', 'Religious Function', 'Personal Work', 'Emergency', 'Death in Family',
    'Sports Competition', 'Educational Tour', 'Government Work', 'Transport Problem',
    'Heavy Rain / Flood', 'Other'
  ];

  const defaultTeacherStaffReasons = [
    'Casual Leave (CL)', 'Sick Leave (SL)', 'Medical Leave', 'Earned Leave (EL)',
    'Maternity Leave', 'Paternity Leave', 'Child Care Leave', 'Official Duty',
    'Training', 'Workshop', 'Election Duty', 'Examination Duty', 'Family Function',
    'Some Domestic Work', 'Out of City', 'Religious Function', 'Personal Work',
    'Emergency', 'Death in Family', 'Other'
  ];

  // --- LOAD INITIAL DATA ---
  useEffect(() => {
    // 1. Classes and Users
    setClasses(LocalERPDatabase.getClasses());
    setAllUsers(LocalERPDatabase.getUsers());

    // 2. Load or Seed Leave Reasons
    const storedReasons = localStorage.getItem('nhs_erp_leave_reasons');
    if (storedReasons) {
      setReasons(JSON.parse(storedReasons));
    } else {
      const seeded: LeaveReason[] = [];
      let currentOrder = 1;

      defaultStudentReasons.forEach(name => {
        seeded.push({
          id: `reason_stud_${currentOrder}`,
          name,
          category: 'student',
          isActive: true,
          order: currentOrder++
        });
      });

      defaultTeacherStaffReasons.forEach(name => {
        // Seed both teacher and staff
        seeded.push({
          id: `reason_teach_${currentOrder}`,
          name,
          category: 'teacher',
          isActive: true,
          order: currentOrder++
        });

        seeded.push({
          id: `reason_staff_${currentOrder}`,
          name,
          category: 'staff',
          isActive: true,
          order: currentOrder++
        });
      });

      setReasons(seeded);
      localStorage.setItem('nhs_erp_leave_reasons', JSON.stringify(seeded));
    }

    // 3. Load or Seed Leave Applications
    const storedLeaves = localStorage.getItem('nhs_erp_student_leaves');
    const parsedLeaves: LeaveApplication[] = [];
    if (storedLeaves) {
      const existing = JSON.parse(storedLeaves);
      // Format adaptation for safety
      existing.forEach((item: any) => {
        parsedLeaves.push({
          id: item.id || `lv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          applicantId: item.studentId || item.applicantId || 'unknown_st',
          applicantName: item.studentName || item.applicantName || 'Unknown student',
          applicantRole: item.applicantRole || 'student',
          classId: item.classId || '',
          className: item.className || '',
          division: item.division || '',
          grNumber: item.grNumber || '',
          shalarthId: item.shalarthId || '',
          employeeCode: item.employeeCode || '',
          startDate: item.startDate || item.date || '',
          endDate: item.endDate || item.date || '',
          isHalfDay: item.isHalfDay || false,
          halfDayOption: item.halfDayOption || 'Morning Session',
          leaveType: item.leaveType || 'Sick Leave',
          reason: item.reason || 'Not Specified',
          status: item.status || 'Pending',
          attachmentName: item.attachmentName || '',
          remarks: item.remarks || '',
          reviewedBy: item.approvedBy || item.reviewedBy || '',
          reviewedById: item.reviewedById || '',
          reviewedAt: item.reviewedAt || '',
          appliedAt: item.appliedAt || ''
        });
      });
    }

    // Seed realistic Teacher and Staff leaves if empty
    

    setLeaves(parsedLeaves);
    localStorage.setItem('nhs_erp_student_leaves', JSON.stringify(parsedLeaves));

    // Set default selected leave category based on current role
    const currentCategory = user.role === 'student' ? 'student' : (user.role === 'teacher' ? 'teacher' : 'staff');
    const availableTypes = reasons.filter(r => r.category === currentCategory && r.isActive);
    if (availableTypes.length > 0) {
      setSelectedLeaveType(availableTypes[0].name);
    } else {
      setSelectedLeaveType(user.role === 'student' ? 'Sick Leave' : 'Casual Leave (CL)');
    }

    // 4. Load notifications
    const storedNotifs = localStorage.getItem('nhs_erp_leave_notifications');
    if (storedNotifs) {
      setNotifications(JSON.parse(storedNotifs));
    } else {
      setNotifications([]);
    }
  }, [user, reasons.length]);

  // Cloud is the production source of truth for leave applications. The browser copy
  // below remains a compatibility cache for older installs and offline rendering only.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch('/api/leave-management/applications', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!response.ok) return;
        const payload = await response.json();
        const cloudLeaves = Array.isArray(payload?.applications) ? payload.applications : [];
        if (cancelled) return;
        setLeaves(cloudLeaves);
        localStorage.setItem('nhs_erp_student_leaves', JSON.stringify(cloudLeaves));
      } catch (error) {
        console.error('Leave cloud load failed; compatibility cache remains visible.', error);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id, user.role]);

  const leaveApi = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your login session is required for Leave Management.');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Leave Management cloud request failed.');
    return payload;
  };


  const handleGenerateLeaveReasonWithAI = async () => {
    const finalType = customReasonEnabled ? customLeaveType.trim() : selectedLeaveType;
    if (!finalType || !leaveStart || !leaveEnd) {
      alert('Select Leave Type, From Date and To Date before generating the Detailed Reason.');
      return;
    }
    const fallbackText = buildAutomaticLeaveReason(finalType, leaveStart, leaveEnd, isHalfDay, halfDayOption, reasonLanguage);
    if (!fallbackText) return;

    setReasonGenerating(true);
    try {
      const payload = await leaveApi('/api/leave-management/generate-reason', {
        method: 'POST',
        body: JSON.stringify({
          leaveType: finalType,
          startDate: leaveStart,
          endDate: leaveEnd,
          halfDayOption: isHalfDay ? halfDayOption : '',
          language: LEAVE_REASON_LOCALE_MAP[reasonLanguage].label,
          fallbackText
        })
      });
      setLeaveReasonText(String(payload?.text || fallbackText));
      setReasonAutoMode(false);
      setReasonGenerationSource(payload?.source === 'gemini' ? 'ai' : 'template');
    } catch (error) {
      console.error('AI leave reason generation failed; using localized template.', error);
      setLeaveReasonText(fallbackText);
      setReasonAutoMode(false);
      setReasonGenerationSource('template');
    } finally {
      setReasonGenerating(false);
    }
  };

  // --- HELPERS ---
  const saveReasons = (updated: LeaveReason[]) => {
    setReasons(updated);
    localStorage.setItem('nhs_erp_leave_reasons', JSON.stringify(updated));
  };

  const saveLeaves = (updated: LeaveApplication[]) => {
    setLeaves(updated);
    localStorage.setItem('nhs_erp_student_leaves', JSON.stringify(updated));
    if (onRefreshData) onRefreshData();
  };

  const saveNotifications = (updated: LeaveNotification[]) => {
    setNotifications(updated);
    localStorage.setItem('nhs_erp_leave_notifications', JSON.stringify(updated));
  };

  const triggerNotification = (targetUserId: string, title: string, message: string, type: LeaveNotification['type']) => {
    const newNotif: LeaveNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: targetUserId,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      type
    };
    const updated = [newNotif, ...notifications];
    saveNotifications(updated);
  };

  const saveHolidays = (updated: Holiday[]) => {
    setHolidays(updated);
    localStorage.setItem('nhs_erp_holidays', JSON.stringify(updated));
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayStart || !newHolidayEnd) {
      alert("Please fill all required holiday fields.");
      return;
    }

    if (newHolidayStart > newHolidayEnd) {
      alert("Start Date must not be greater than End Date.");
      return;
    }

    if (editingHolidayId) {
      // Edit mode
      const updated = holidays.map(h => {
        if (h.id === editingHolidayId) {
          return {
            ...h,
            name: newHolidayName,
            type: newHolidayType,
            startDate: newHolidayStart,
            endDate: newHolidayEnd,
            applicableClasses: newHolidayClasses,
            remarks: newHolidayRemarks,
            academicYear: newHolidayAcademicYear,
            reminderEnabled: holidayReminderEnabled,
            notificationChannels: holidayChannels
          };
        }
        return h;
      });
      const changed = updated.find(h => h.id === editingHolidayId)!;
      try { const cloud = await saveHeadmasterHolidayCloud(changed); if (cloud?.id) changed.id = cloud.id; }
      catch (error:any) { alert(error?.message || 'Holiday could not be saved to cloud.'); return; }
      saveHolidays(updated);
      setEditingHolidayId(null);
      alert("Holiday updated successfully!");
    } else {
      // Add mode
      const newHoliday: Holiday = {
        id: `hol_${Date.now()}`,
        name: newHolidayName,
        type: newHolidayType,
        startDate: newHolidayStart,
        endDate: newHolidayEnd,
        applicableClasses: newHolidayClasses,
        remarks: newHolidayRemarks,
        academicYear: newHolidayAcademicYear,
        reminderEnabled: holidayReminderEnabled,
        notificationChannels: holidayChannels
      };
      try { const cloud = await saveHeadmasterHolidayCloud(newHoliday); if (cloud?.id) newHoliday.id = cloud.id; }
      catch (error:any) { alert(error?.message || 'Holiday could not be saved to cloud.'); return; }
      saveHolidays([...holidays, newHoliday]);
      alert("New Holiday declared and integrated successfully!");
    }

    // Reset Form
    setNewHolidayName('');
    setNewHolidayStart('');
    setNewHolidayEnd('');
    setNewHolidayClasses('All');
    setNewHolidayRemarks('');
    setHolidayReminderEnabled(true);
    setHolidayChannels({ website: true, email: true, sms: true, whatsapp: true });
  };

  const handleEditHoliday = (h: Holiday) => {
    setEditingHolidayId(h.id);
    setNewHolidayName(h.name);
    setNewHolidayType(h.type);
    setNewHolidayStart(h.startDate);
    setNewHolidayEnd(h.endDate);
    setNewHolidayClasses(h.applicableClasses);
    setNewHolidayRemarks(h.remarks || '');
    setNewHolidayAcademicYear(h.academicYear);
    setHolidayReminderEnabled(h.reminderEnabled !== false);
    setHolidayChannels(h.notificationChannels || { website: true, email: true, sms: true, whatsapp: true });
  };

  const handleDeleteHoliday = async (id: string) => {
    if (await requestActionConfirm({ title: 'Delete holiday?', message: 'Are you sure you want to permanently delete this holiday? It will instantly affect working leave counts.', confirmLabel: 'Delete Holiday', tone: 'danger' })) {
      if (user.role === 'headmaster' && /^[0-9a-f-]{36}$/i.test(id)) {
        try { const { data:{session} }=await supabase.auth.getSession(); if(!session?.access_token)throw new Error('Secure Headmaster session unavailable.'); const response=await fetch(`/api/headmaster/leave-settings/holidays/${encodeURIComponent(id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${session.access_token}`}}); const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload.error||'Holiday could not be deleted.'); }
        catch(error:any){alert(error?.message||'Holiday could not be deleted from cloud.');return;}
      }
      const updated = holidays.filter(h => h.id !== id);
      saveHolidays(updated);
    }
  };

  const handleUpdateLeaveRule = async (rule: 'Rule A' | 'Rule B' | 'Rule C') => {
    if (user.role === 'headmaster') {
      try { const {data:{session}}=await supabase.auth.getSession(); if(!session?.access_token)throw new Error('Secure Headmaster session unavailable.'); const response=await fetch('/api/headmaster/leave-settings/policy',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({leaveRule:rule})}); const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload.error||'Leave policy could not be saved.'); }
      catch(error:any){alert(error?.message||'Leave policy could not be saved to cloud.');return;}
    }
    setLeaveRule(rule);
    localStorage.setItem('nhs_erp_leave_rule', rule);
    setLeaveSettingsCloudReady(user.role === 'headmaster' ? true : leaveSettingsCloudReady);
    alert(`Leave policy rule updated to: ${rule}`);
  };

  // --- SMART LEAVE CALCULATION ENGINE ---
  const calculateLeaveBreakdown = (startStr: string, endStr: string, isHalfDayLeave: boolean) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (start > end) return null;

    const dateList: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split('T')[0]);
    }

    const totalDays = dateList.length;
    let sundayCount = 0;
    let holidayCount = 0;
    let vacationDays = 0;
    let halfDays = 0;
    let workingDays = 0;

    // Map through each date to resolve type
    const dateStatuses = dateList.map(dateStr => {
      const d = new Date(dateStr);
      const isSun = d.getDay() === 0;

      // Find if there is a declared holiday/vacation in Holiday Master
      const matchedHoliday = holidays.find(h => dateStr >= h.startDate && dateStr <= h.endDate);

      let statusType: 'working' | 'sunday' | 'holiday' | 'vacation' | 'half_day' = 'working';
      let label = 'Working Day';

      if (matchedHoliday) {
        if (matchedHoliday.type === 'School Vacation') {
          statusType = 'vacation';
          label = matchedHoliday.name;
        } else if (matchedHoliday.type === 'Half-Day Holiday') {
          statusType = 'half_day';
          label = matchedHoliday.name;
        } else {
          statusType = 'holiday';
          label = matchedHoliday.name;
        }
      } else if (isSun) {
        statusType = 'sunday';
        label = 'Sunday';
      }

      return {
        date: dateStr,
        statusType,
        label,
        isSunday: isSun,
        matchedHoliday
      };
    });

    dateStatuses.forEach(ds => {
      if (ds.statusType === 'sunday') sundayCount++;
      else if (ds.statusType === 'holiday') holidayCount++;
      else if (ds.statusType === 'vacation') vacationDays++;
      else if (ds.statusType === 'half_day') halfDays++;
      else workingDays++;
    });

    // Establish net leave days based on Headmaster's active leave rule
    const countsAsLeaveMap = new Map<string, boolean>();
    dateStatuses.forEach(ds => {
      if (ds.statusType === 'working') {
        countsAsLeaveMap.set(ds.date, true);
      } else if (ds.statusType === 'half_day') {
        countsAsLeaveMap.set(ds.date, true);
      } else {
        countsAsLeaveMap.set(ds.date, false);
      }
    });

    if (leaveRule === 'Rule B') {
      // Rule B: Intervening Sundays/Holidays count as leave (sandwiched)
      for (let i = 0; i < dateStatuses.length; i++) {
        const ds = dateStatuses[i];
        if (ds.statusType === 'sunday' || ds.statusType === 'holiday' || ds.statusType === 'vacation') {
          let hasLeaveBefore = false;
          let hasLeaveAfter = false;

          for (let j = 0; j < i; j++) {
            if (dateStatuses[j].statusType === 'working' || dateStatuses[j].statusType === 'half_day') {
              hasLeaveBefore = true;
              break;
            }
          }
          for (let j = i + 1; j < dateStatuses.length; j++) {
            if (dateStatuses[j].statusType === 'working' || dateStatuses[j].statusType === 'half_day') {
              hasLeaveAfter = true;
              break;
            }
          }

          if (hasLeaveBefore && hasLeaveAfter) {
            countsAsLeaveMap.set(ds.date, true);
          }
        }
      }
    } else if (leaveRule === 'Rule C') {
      // Rule C: Only intervening Sundays count (ignore other holidays)
      for (let i = 0; i < dateStatuses.length; i++) {
        const ds = dateStatuses[i];
        if (ds.statusType === 'sunday') {
          let hasLeaveBefore = false;
          let hasLeaveAfter = false;

          for (let j = 0; j < i; j++) {
            if (dateStatuses[j].statusType === 'working' || dateStatuses[j].statusType === 'half_day') {
              hasLeaveBefore = true;
              break;
            }
          }
          for (let j = i + 1; j < dateStatuses.length; j++) {
            if (dateStatuses[j].statusType === 'working' || dateStatuses[j].statusType === 'half_day') {
              hasLeaveAfter = true;
              break;
            }
          }

          if (hasLeaveBefore && hasLeaveAfter) {
            countsAsLeaveMap.set(ds.date, true);
          }
        }
      }
    }

    let netLeaveDays = 0;
    dateStatuses.forEach(ds => {
      if (countsAsLeaveMap.get(ds.date)) {
        if (ds.statusType === 'half_day') {
          netLeaveDays += 0.5;
        } else {
          netLeaveDays += 1;
        }
      }
    });

    if (isHalfDayLeave) {
      netLeaveDays = 0.5 * workingDays;
    }

    return {
      totalDays,
      workingDays,
      holidayCount,
      sundayCount,
      vacationDays,
      halfDays,
      netLeaveDays,
      dateStatuses
    };
  };

  // --- CONFLICT VALIDATION ---
  const checkLeaveConflicts = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (start > end) return [];

    const warnings: string[] = [];
    const dateList: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split('T')[0]);
    }

    // 1. Overlaps another leave request of the same user
    const overlapping = leaves.find(l => 
      isOwnLeave(l) && 
      l.status !== 'Cancelled' && 
      l.status !== 'Rejected' &&
      ((startStr >= l.startDate && startStr <= l.endDate) ||
       (endStr >= l.startDate && endStr <= l.endDate) ||
       (startStr <= l.startDate && endStr >= l.endDate))
    );
    if (overlapping) {
      if (overlapping.startDate === startStr && overlapping.endDate === endStr) {
        warnings.push(`Duplicate Request: You have an identical leave record for these dates (Status: ${overlapping.status}).`);
      } else {
        warnings.push(`Overlap Detected: This request conflicts with an existing leave from ${overlapping.startDate} to ${overlapping.endDate} (Status: ${overlapping.status}).`);
      }
    }

    // 2. Completely within vacation
    let allVacation = true;
    let anyVacation = false;
    dateList.forEach(d => {
      const isVac = holidays.some(h => h.type === 'School Vacation' && d >= h.startDate && d <= h.endDate);
      if (isVac) anyVacation = true;
      else allVacation = false;
    });

    if (allVacation && dateList.length > 0) {
      warnings.push("Vacation Overlap: The selected leave span is entirely covered by a declared School Vacation.");
    } else if (anyVacation) {
      warnings.push("Partial Vacation Overlap: Some requested days fall within a scheduled School Vacation break.");
    }

    // 3. Fall on declared holidays
    dateList.forEach(d => {
      const activeHol = holidays.find(h => h.type !== 'School Vacation' && d >= h.startDate && d <= h.endDate);
      if (activeHol) {
        warnings.push(`Holiday Clash: ${d} is a declared ${activeHol.type} (${activeHol.name}).`);
      }
    });

    return warnings;
  };

  // --- ATTENDANCE SYNC INTEGRATION ---
  /**
   * Automatically marks/updates student attendance when leave is approved!
   */
  const syncApprovedLeaveToAttendance = (leave: LeaveApplication) => {
    if (leave.applicantRole !== 'student') return; // Attendance sync only for students as per school daily registers

    const storedAttendance = localStorage.getItem('nhs_erp_attendance_v2');
    let attRecords: any[] = [];
    if (storedAttendance) {
      attRecords = JSON.parse(storedAttendance);
    }

    // Determine target attendance code status based on leave type
    // Statuses: 'LV' (Approved Leave), 'ML' (Medical Leave), 'HD' (Half Day), etc.
    let targetStatus: 'LV' | 'ML' | 'HD' = 'LV';
    const lowerType = leave.leaveType.toLowerCase();
    if (leave.isHalfDay) {
      targetStatus = 'HD';
    } else if (lowerType.includes('medical') || lowerType.includes('sick') || lowerType.includes('fever') || lowerType.includes('hospital')) {
      targetStatus = 'ML';
    }

    // Generate list of dates between startDate and endDate
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const dateList: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split('T')[0]);
    }

    const currentSetup = LocalERPDatabase.getAcademicSetup();
    const activeYear = currentSetup.academicYears.find((y: any) => y.isActive)?.year || '2026-27';

    // Loop through each date and insert/update daily and subject records
    let recordsModified = false;

    dateList.forEach(date => {
      // 1. Daily master roll call update
      const dailyKey = `att_daily_${leave.classId}_${date}_${leave.applicantId}_daily`;
      const dailyIdx = attRecords.findIndex(r => r.date === date && r.classId === leave.classId && r.studentId === leave.applicantId && r.type === 'daily');

      const dailyEntry = {
        id: dailyKey,
        academicYear: activeYear,
        date,
        type: 'daily',
        classId: leave.classId || 'c3',
        teacherId: leave.reviewedById || user.id,
        teacherName: leave.reviewedBy || user.name,
        studentId: leave.applicantId,
        studentName: leave.applicantName,
        grNumber: leave.grNumber || 'GR001',
        rollNo: 0,
        status: targetStatus,
        isDraft: false,
        isLocked: true, // Approved leaves are locked automatically
        submittedAt: new Date().toISOString(),
        notes: `System Synced: Approved Leave ID ${leave.id}. Reason: ${leave.leaveType}`
      };

      if (dailyIdx >= 0) {
        attRecords[dailyIdx] = { ...attRecords[dailyIdx], status: targetStatus, isLocked: true, notes: dailyEntry.notes };
      } else {
        attRecords.push(dailyEntry);
      }

      // 2. Period/subject-wise updates
      const timetableList = LocalERPDatabase.getTimetable();
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }) as any;
      const classSlots = timetableList.filter(t => t.classId === leave.classId && t.day === dayName);

      classSlots.forEach(slot => {
        const subKey = `att_subject_${leave.classId}_${slot.period}_${date}_${leave.applicantId}`;
        const subIdx = attRecords.findIndex(r => r.date === date && r.classId === leave.classId && r.studentId === leave.applicantId && r.type === 'subject' && r.period === slot.period);

        const subEntry = {
          id: subKey,
          academicYear: activeYear,
          date,
          type: 'subject',
          classId: leave.classId || 'c3',
          period: slot.period,
          subject: slot.subject,
          teacherId: slot.teacherName || 'sys',
          teacherName: slot.teacherName || 'System Sync',
          studentId: leave.applicantId,
          studentName: leave.applicantName,
          grNumber: leave.grNumber || 'GR001',
          rollNo: 0,
          status: targetStatus,
          isDraft: false,
          isLocked: true,
          submittedAt: new Date().toISOString(),
          notes: `System Synced: Approved Leave ID ${leave.id}. Reason: ${leave.leaveType}`
        };

        if (subIdx >= 0) {
          attRecords[subIdx] = { ...attRecords[subIdx], status: targetStatus, isLocked: true, notes: subEntry.notes };
        } else {
          attRecords.push(subEntry);
        }
      });

      recordsModified = true;
    });

    if (recordsModified) {
      localStorage.setItem('nhs_erp_attendance_v2', JSON.stringify(attRecords));
      
      // Legacy compatibility format save
      const legacyRecords: Record<string, { present: boolean }> = {};
      attRecords.forEach(rec => {
        if (rec.type === 'subject') {
          const key = `${rec.classId}_${rec.subject}_${rec.date}_${rec.studentId}`;
          legacyRecords[key] = { present: rec.status === 'P' || rec.status === 'L' || rec.status === 'HD' };
        } else {
          const key = `daily_${rec.classId}_${rec.date}_${rec.studentId}`;
          legacyRecords[key] = { present: rec.status === 'P' || rec.status === 'L' || rec.status === 'HD' };
        }
      });
      localStorage.setItem('nhs_erp_attendance_subject', JSON.stringify(legacyRecords));
    }
  };

  // --- ACTIONS ---

  // Leave Form Submit Action
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leaveStart || !leaveEnd) {
      alert("Please select both Start and End Dates!");
      return;
    }

    if (leaveStart > leaveEnd) {
      alert("Start Date cannot be after End Date!");
      return;
    }

    const finalLeaveType = customReasonEnabled ? (customLeaveType || 'Other Custom') : selectedLeaveType;
    if (!finalLeaveType) {
      alert("Please specify a valid Leave Type/Category!");
      return;
    }

    const newApplication: LeaveApplication = {
      id: `lv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      applicantId: user.id,
      applicantName: user.name,
      applicantRole: user.role === 'student' ? 'student' : (user.role === 'teacher' ? 'teacher' : 'staff'),
      classId: user.classId || undefined,
      className: user.classId ? classes.find(c => c.id === user.classId)?.className : undefined,
      division: user.classId ? classes.find(c => c.id === user.classId)?.division : undefined,
      grNumber: user.grNumber || undefined,
      shalarthId: user.shalarthId || undefined,
      employeeCode: user.employeeCode || undefined,
      startDate: leaveStart,
      endDate: leaveEnd,
      isHalfDay,
      halfDayOption: isHalfDay ? halfDayOption : undefined,
      leaveType: finalLeaveType,
      reason: leaveReasonText.trim() || autoLeaveReason,
      reasonLanguage: user.role === 'student' ? undefined : reasonLanguage,
      status: 'Pending',
      attachmentName: attachmentFile ? 'Medical_Certificate_Receipt.pdf' : '',
      appliedAt: new Date().toISOString()
    };

    let officialApplication = newApplication;
    try {
      const cloud = await leaveApi('/api/leave-management/applications', {
        method: 'POST',
        body: JSON.stringify({ application: newApplication })
      });
      if (!cloud?.application?.id) throw new Error('Cloud leave request was not created.');
      officialApplication = { ...newApplication, ...cloud.application };
    } catch (error: any) {
      alert(error?.message || 'Leave application could not be submitted to the school cloud. Please try again.');
      return;
    }

    const updated = [officialApplication, ...leaves.filter(item => item.id !== officialApplication.id)];
    saveLeaves(updated);

    // Audit Log Entry
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'APPLY_LEAVE',
      'Leave Management System',
      `Applied for leave from ${leaveStart} to ${leaveEnd} (${finalLeaveType})`
    );

    // Trigger Notifications downstream
    if (user.role === 'student') {
      // Notify class teacher and headmaster
      const ctUser = allUsers.find(u => LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === u.id) && u.classId === user.classId);
      if (ctUser) {
        triggerNotification(
          ctUser.id, 
          "New Student Leave Application", 
          `Student ${user.name} (GR: ${user.grNumber || '-'}) applied for ${finalLeaveType} from ${leaveStart} to ${leaveEnd}`, 
          'applied'
        );
      }
      // Also notify headmaster
      const hmUsers = allUsers.filter(u => u.role === 'headmaster');
      hmUsers.forEach(hm => {
        triggerNotification(
          hm.id, 
          "New Student Leave Applied", 
          `Class ${newApplication.className || '-'} student ${user.name} applied for leave.`, 
          'applied'
        );
      });
    } else {
      // Teachers and staff notify headmaster
      const hmUsers = allUsers.filter(u => u.role === 'headmaster');
      hmUsers.forEach(hm => {
        triggerNotification(
          hm.id,
          user.role === 'clerk' ? "New Clerk Leave Application" : "New Staff Leave Application",
          `${user.name} (${user.role.toUpperCase()}) applied for ${finalLeaveType} from ${leaveStart} to ${leaveEnd}`,
          'applied'
        );
      });
    }

    // Reset Form
    setLeaveStart('');
    setLeaveEnd('');
    setIsHalfDay(false);
    setLeaveReasonText('');
    setReasonAutoMode(true);
    setReasonGenerationSource('auto');
    setReasonLanguage(getDefaultReasonLanguage(lang));
    setAttachmentFile('');
    setCustomReasonEnabled(false);
    setCustomLeaveType('');

    alert(isUrdu ? "رخصت کی درخواست کامیابی کے ساتھ جمع کر دی گئی ہے!" : "Leave application successfully submitted!");
    setActiveTab('dashboard');
  };

  // Review (Approve/Reject) Leave Request
  const handleReviewLeaveSubmit = async (status: 'Approved' | 'Rejected') => {
    if (!reviewingLeave) return;

    if (reviewingLeave.cloudRequestId) {
      try {
        await leaveApi(`/api/leave-management/applications/${encodeURIComponent(reviewingLeave.cloudRequestId)}/decision`, {
          method: 'POST',
          body: JSON.stringify({
            decision: status === 'Approved' ? 'approve' : 'reject',
            remarks: reviewRemarks,
            reviewedByName: user.name
          })
        });
      } catch (error: any) {
        alert(error?.message || 'Leave decision could not be saved to the school cloud.');
        return;
      }
    }

    const updated = leaves.map(l => {
      if (l.id === reviewingLeave.id) {
        const reviewed: LeaveApplication = {
          ...l,
          status,
          remarks: reviewRemarks,
          reviewedBy: user.name,
          reviewedById: user.id,
          reviewedAt: new Date().toISOString()
        };

        // If student and approved, sync to attendance auto-marker!
        if (reviewed.applicantRole === 'student' && status === 'Approved') {
          syncApprovedLeaveToAttendance(reviewed);
        }

        return reviewed;
      }
      return l;
    });

    saveLeaves(updated);

    // Trigger notification to applicant
    triggerNotification(
      reviewingLeave.applicantId,
      `Leave Application ${status}`,
      `Your leave request for ${reviewingLeave.leaveType} from ${reviewingLeave.startDate} to ${reviewingLeave.endDate} has been ${status.toUpperCase()} by ${user.name}.`,
      status === 'Approved' ? 'approved' : 'rejected'
    );

    // Audit Log
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      `REVIEW_LEAVE_${status.toUpperCase()}`,
      'Leave Management System',
      `Reviewed leave for ${reviewingLeave.applicantName} status set to ${status}. Remarks: ${reviewRemarks}`
    );

    setReviewingLeave(null);
    setReviewRemarks('');
    alert(`Leave application ${status.toLowerCase()} successfully.`);
  };


  // Cancel Pending Leave Application
  const handleCancelLeave = async (leaveId: string) => {
    const confirmation = await requestActionConfirm({ title: 'Cancel leave application?', message: 'Are you sure you want to cancel this leave application?', confirmLabel: 'Cancel Leave', tone: 'danger' });
    if (!confirmation) return;

    const leaveObjForCloud = leaves.find(l => l.id === leaveId);
    if (leaveObjForCloud?.cloudRequestId) {
      try {
        await leaveApi(`/api/leave-management/applications/${encodeURIComponent(leaveObjForCloud.cloudRequestId)}/cancel`, { method: 'POST' });
      } catch (error: any) {
        alert(error?.message || 'Leave cancellation could not be saved to the school cloud.');
        return;
      }
    }

    const updated = leaves.map(l => {
      if (l.id === leaveId) {
        return { ...l, status: 'Cancelled' as const };
      }
      return l;
    });

    saveLeaves(updated);

    const leaveObj = leaves.find(l => l.id === leaveId);
    if (leaveObj) {
      // Audit
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'CANCEL_LEAVE',
        'Leave Management System',
        `User cancelled leave request ID: ${leaveId}`
      );
      // Notify reviewers (Headmaster)
      const hmUsers = allUsers.filter(u => u.role === 'headmaster');
      hmUsers.forEach(hm => {
        triggerNotification(
          hm.id,
          "Leave Application Cancelled",
          `Applicant ${user.name} cancelled their leave application for ${leaveObj.leaveType}`,
          'cancelled'
        );
      });
    }
    alert("Leave application cancelled successfully.");
  };

  // --- REASON MASTER ACTIONS ---
  const handleAddReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonName.trim()) return;

    const nextId = `reason_${Date.now()}`;
    const newReason: LeaveReason = {
      id: nextId,
      name: newReasonName.trim(),
      category: newReasonCategory,
      isActive: true,
      order: reasons.length + 1
    };

    saveReasons([...reasons, newReason]);
    setNewReasonName('');
    
    // Audit
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'ADD_LEAVE_REASON',
      'Leave Reason Master Settings',
      `Headmaster added new leave reason: ${newReasonName} under category: ${newReasonCategory.toUpperCase()}`
    );

    alert("Leave reason master updated successfully.");
  };

  const handleToggleReasonActive = (id: string) => {
    const updated = reasons.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    saveReasons(updated);
  };

  const handleDeleteReason = async (id: string) => {
    const confirmation = await requestActionConfirm({ title: 'Delete leave reason?', message: 'Are you sure you want to delete this leave reason from Master List?', confirmLabel: 'Delete Reason', tone: 'danger' });
    if (!confirmation) return;
    const updated = reasons.filter(r => r.id !== id);
    saveReasons(updated);
  };

  const handleStartEditReason = (reason: LeaveReason) => {
    setEditingReasonId(reason.id);
    setEditReasonName(reason.name);
  };

  const handleSaveEditReason = (id: string) => {
    const updated = reasons.map(r => r.id === id ? { ...r, name: editReasonName } : r);
    saveReasons(updated);
    setEditingReasonId(null);
    setEditReasonName('');
  };

  const handleReorderReason = (id: string, direction: 'up' | 'down') => {
    const index = reasons.findIndex(r => r.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reasons.length) return;

    const updated = [...reasons];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Refresh orders
    updated.forEach((r, idx) => {
      r.order = idx + 1;
    });

    saveReasons(updated);
  };

  const currentUserLeaveIds = useMemo(() => new Set([user.id, user.authUserId].filter(Boolean).map(String)), [user.id, user.authUserId]);
  const isOwnLeave = (leave: LeaveApplication) => currentUserLeaveIds.has(String(leave.applicantId || ''));

  // --- COMPUTED DATA GRID FILTERS ---
  const filteredLeavesList = useMemo(() => {
    return leaves.filter(l => {
      // 1. Role boundaries (who is allowed to see what)
      if (user.role === 'student' || user.role === 'clerk') {
        // Students and Clerks see only their own leave applications. Clerk has no office-wide leave-review access.
        if (!isOwnLeave(l)) return false;
      } else if (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id)) {
        // Class teachers see their own class students' leaves AND their own teacher leaves
        const isMyClassStudent = l.applicantRole === 'student' && l.classId === user.classId;
        const isMyOwnLeave = l.applicantId === user.id;
        if (!isMyClassStudent && !isMyOwnLeave) return false;
      } else if (user.role === 'teacher') {
        // Non-class teachers see only their own leaves
        if (l.applicantId !== user.id) return false;
      }
      // Headmaster sees the authorized school-wide workflow; Clerk is self-service only.

      // 2. Search Box Query
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const nameMatch = l.applicantName.toLowerCase().includes(query);
        const reasonMatch = l.reason.toLowerCase().includes(query);
        const grMatch = l.grNumber && l.grNumber.toLowerCase().includes(query);
        const shalarthMatch = l.shalarthId && l.shalarthId.toLowerCase().includes(query);
        const typeMatch = l.leaveType.toLowerCase().includes(query);
        
        if (!nameMatch && !reasonMatch && !grMatch && !shalarthMatch && !typeMatch) {
          return false;
        }
      }

      // 3. Status filter
      if (filterStatus !== 'All' && l.status !== filterStatus) return false;

      // 4. Class filter (Students list)
      if (filterClassId !== 'All' && l.classId !== filterClassId) return false;

      // 5. Role filter (Student vs Staff)
      if (filterRole !== 'All') {
        if (filterRole === 'student' && l.applicantRole !== 'student') return false;
        if (filterRole === 'staff' && l.applicantRole === 'student') return false;
      }

      // 6. Leave Type filter
      if (filterLeaveType !== 'All' && l.leaveType !== filterLeaveType) return false;

      // 7. Date Match filter
      if (filterDate !== '') {
        if (l.startDate !== filterDate && l.endDate !== filterDate && (l.startDate > filterDate || l.endDate < filterDate)) {
          return false;
        }
      }

      return true;
    });
  }, [leaves, searchTerm, filterStatus, filterClassId, filterRole, filterLeaveType, filterDate, user, currentUserLeaveIds]);

  // --- STATS COUNT CALCULATIONS ---
  const statsCounts = useMemo(() => {
    // Current active list boundaries
    const targetLeaves = leaves.filter(l => {
      if (user.role === 'student' || user.role === 'clerk') return isOwnLeave(l);
      if (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id)) return (l.applicantRole === 'student' && l.classId === user.classId) || l.applicantId === user.id;
      if (user.role === 'teacher') return l.applicantId === user.id;
      return true;
    });

    const pending = targetLeaves.filter(l => l.status === 'Pending').length;
    const approved = targetLeaves.filter(l => l.status === 'Approved').length;
    const rejected = targetLeaves.filter(l => l.status === 'Rejected').length;
    const cancelled = targetLeaves.filter(l => l.status === 'Cancelled').length;
    const approvedLeaveDays = targetLeaves
      .filter(l => l.status === 'Approved')
      .reduce((sum, leave) => sum + (calculateLeaveBreakdown(leave.startDate, leave.endDate, leave.isHalfDay)?.netLeaveDays || 0), 0);

    return { total: targetLeaves.length, pending, approved, rejected, cancelled, approvedLeaveDays };
  }, [leaves, user, currentUserLeaveIds, holidays, leaveRule]);

  // --- REPORT GENERATION PREVIEWS ---
  const generatedReportData = useMemo(() => {
    let repList = user.role === 'clerk' || user.role === 'student' || user.role === 'teacher' ? leaves.filter(isOwnLeave) : [...leaves];

    // Filter by date parameters
    if (reportType === 'daily') {
      repList = repList.filter(l => l.startDate <= reportDate && l.endDate >= reportDate);
    } else if (reportType === 'monthly') {
      repList = repList.filter(l => l.startDate.startsWith(reportMonth) || l.endDate.startsWith(reportMonth));
    } else if (reportType === 'yearly') {
      repList = repList.filter(l => l.startDate.startsWith(reportYear) || l.endDate.startsWith(reportYear));
    } else if (reportType === 'student_register') {
      repList = repList.filter(l => l.applicantRole === 'student');
    } else if (reportType === 'teacher_register') {
      repList = repList.filter(l => l.applicantRole === 'teacher' || l.applicantRole === 'staff');
    } else if (['holiday_list', 'working_days', 'monthly_holidays', 'academic_calendar'].includes(reportType)) {
      return []; // Handled separately in custom rendering lists
    }

    // Status filter
    if (reportStatusFilter !== 'All') {
      repList = repList.filter(l => l.status === reportStatusFilter);
    }

    return repList;
  }, [leaves, reportType, reportDate, reportMonth, reportYear, reportStatusFilter, user.role, currentUserLeaveIds]);

  // Export Report to Simulated Excel file (CSV Download)
  const handleExportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === 'holiday_list' || reportType === 'academic_calendar') {
      csvContent += "Holiday ID,Occasion Name,Break Type,Start Date,End Date,Applicable Classes,Academic Year,Remarks\n";
      holidays.forEach(h => {
        csvContent += `"${h.id}","${h.name}","${h.type}","${h.startDate}","${h.endDate}","${h.applicableClasses}","${h.academicYear}","${h.remarks || '-'}"\n`;
      });
    } else if (reportType === 'monthly_holidays') {
      csvContent += "Holiday ID,Occasion Name,Break Type,Start Date,End Date,Applicable Classes,Academic Year,Remarks\n";
      const monthStr = reportMonth; // e.g. "2026-06"
      const monthlyHols = holidays.filter(h => h.startDate.startsWith(monthStr) || h.endDate.startsWith(monthStr));
      monthlyHols.forEach(h => {
        csvContent += `"${h.id}","${h.name}","${h.type}","${h.startDate}","${h.endDate}","${h.applicableClasses}","${h.academicYear}","${h.remarks || '-'}"\n`;
      });
    } else if (reportType === 'working_days') {
      csvContent += "Month,Total Days,Sundays,Holidays,Declared Vacations,Teaching Working Days\n";
      
      const academicMonths = [
        { name: 'June 2026', range: ['2026-06-01', '2026-06-30'] },
        { name: 'July 2026', range: ['2026-07-01', '2026-07-31'] },
        { name: 'August 2026', range: ['2026-08-01', '2026-08-31'] },
        { name: 'September 2026', range: ['2026-09-01', '2026-09-30'] },
        { name: 'October 2026', range: ['2026-10-01', '2026-10-31'] },
        { name: 'November 2026', range: ['2026-11-01', '2026-11-30'] },
        { name: 'December 2026', range: ['2026-12-01', '2026-12-31'] },
        { name: 'January 2027', range: ['2027-01-01', '2027-01-31'] },
        { name: 'February 2027', range: ['2027-02-01', '2027-02-28'] },
        { name: 'March 2027', range: ['2027-03-01', '2027-03-31'] },
        { name: 'April 2027', range: ['2027-04-01', '2027-04-30'] },
        { name: 'May 2027', range: ['2027-05-01', '2027-05-31'] }
      ];

      academicMonths.forEach(m => {
        const breakdown = calculateLeaveBreakdown(m.range[0], m.range[1], false);
        if (breakdown) {
          csvContent += `"${m.name}","${breakdown.totalDays}","${breakdown.sundayCount}","${breakdown.holidayCount}","${breakdown.vacationDays}","${breakdown.workingDays}"\n`;
        }
      });
    } else {
      csvContent += "Leave ID,Applicant Name,Role,Class/Details,Leave Type,Reason,From Date,To Date,Duration,Status,Reviewed By,Remarks\n";
      generatedReportData.forEach(l => {
        const classDetails = l.applicantRole === 'student' ? `${l.className} - ${l.division || 'A'}` : l.shalarthId || l.employeeCode || 'N/A';
        const durationLabel = l.isHalfDay ? `Half Day (${l.halfDayOption})` : "Full Day";
        const row = `"${l.id}","${l.applicantName}","${l.applicantRole}","${classDetails}","${l.leaveType}","${l.reason}","${l.startDate}","${l.endDate}","${durationLabel}","${l.status}","${l.reviewedBy || '-'}","${l.remarks || '-'}"`;
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NHS_Taloda_Leave_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preloaded Category Reasons for the Active form selection dropdown
  const activeFormReasons = useMemo(() => {
    const currentCategory = user.role === 'student' ? 'student' : (user.role === 'teacher' ? 'teacher' : 'staff');
    return reasons.filter(r => r.category === currentCategory && r.isActive);
  }, [reasons, user]);

  return (
    <div className="space-y-6 text-left">
      
      {/* ================= HEADER CONTROL BAR ================= */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[9px] font-extrabold uppercase font-mono tracking-wider rounded">
              Module 14
            </span>
            <span className="text-slate-400 font-mono text-xs">National High School, Taloda</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400 animate-pulse" />
            <UrduWrapper lang={lang}>
              {focusedMode ? focusedTitle : (lang === 'ur' ? 'اسمارٹ رخصت اور حاضری انضمام نظام' : lang === 'hi' ? 'स्मार्ट अवकाश और उपस्थिति प्रणाली' : 'Smart Leave & Attendance Integration System')}
            </UrduWrapper>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            {focusedMode ? focusedFeatureDescription : 'Fully automated workflow links approved leave with the active attendance register while keeping attendance entry and leave approval as separate owner workflows.'}
          </p>
        </div>

        {!focusedMode && <div className="flex flex-wrap gap-2">
          {/* Dashboard tab */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            Dashboard
          </button>

          {/* Apply Leave tab */}
            <button
              onClick={() => {
                setActiveTab('apply');
                // Ensure default values are loaded for safety
                if (activeFormReasons.length > 0) {
                  setSelectedLeaveType(activeFormReasons[0].name);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'apply' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Apply Leave
            </button>

          {/* Leave Reason Master Settings (Headmaster only) */}
          {user.role === 'headmaster' && (
            <button
              onClick={() => setActiveTab('master_settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'master_settings' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              Reason Master
            </button>
          )}

          {/* Analytical Reports tab */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            Reports Desk
          </button>

          {/* Notifications */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 relative cursor-pointer"
            title="Leave Notifications Panel"
          >
            <Bell className="w-4 h-4" />
            {notifications.filter(n => !n.isRead && n.userId === user.id).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-bounce"></span>
            )}
          </button>
        </div>}
      </div>

      {focusedMode && activeFeatureId && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 px-5 py-4 no-print" data-leave-focused-feature={activeFeatureId}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Focused Leave Workspace</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-black text-slate-900">{focusedTitle}</h3>
            <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">Leave owner module</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{focusedFeatureDescription}</p>
        </div>
      )}

      {/* ================= METRIC HIGHLIGHT PANELS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Requests</p>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{statsCounts.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider font-mono">Pending Approvals</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{statsCounts.pending}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider font-mono">{user.role === 'clerk' ? 'Approved Requests' : 'Approved Leaves'}</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{statsCounts.approved}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider font-mono">Rejected Requests</p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">{statsCounts.rejected}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
          {user.role === 'clerk' ? (
            <>
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider font-mono">Approved Leave Days</p>
              <p className="text-xl font-extrabold text-indigo-700 mt-1">{statsCounts.approvedLeaveDays}</p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sync Status</p>
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                <Check className="w-3 h-3" />
                Attendance Synced
              </span>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* SCREEN 1: CENTRAL CONTROL DASHBOARD & GRID VIEW          */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* VIEW MODE TOGGLE & DASHBOARD SELECTOR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-xl border border-slate-200 p-4 shadow-sm gap-3 no-print">
            {focusedMode && ['student-leave-review', 'staff-leave-review', 'leave-escalations', 'cl-my-leave-status', 'cl-leave-summary'].includes(activeFeatureId || '') ? (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span>{focusedListTitle}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Interactive Calendar View</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>List Search Register</span>
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-bold">
                Academic Year: <span className="text-indigo-600 font-mono font-extrabold">2026-27</span>
              </span>
              <span className="h-4 w-[1px] bg-slate-200" />
              <span className="text-slate-400 font-bold">
                Policy Rule: <span className="text-indigo-600 font-mono font-extrabold">{leaveRule === 'Rule A' ? 'A (Ignore Holidays)' : leaveRule === 'Rule B' ? 'B (Sandwich All)' : 'C (Sandwich Sundays)'}</span>
              </span>
            </div>
          </div>

          {/* ROLE-SPECIFIC WORKSPACE DASHBOARD WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            
            {/* STUDENT DASHBOARD INTEGRATION */}
            {user.role === 'student' && (
              <>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-5 space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-indigo-800">
                    <Calendar className="w-4 h-4" />
                    <span>My Upcoming School Breaks</span>
                  </h4>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {holidays
                      .filter(h => h.endDate >= new Date().toISOString().split('T')[0])
                      .sort((a,b) => a.startDate.localeCompare(b.startDate))
                      .slice(0, 4)
                      .map(h => (
                        <div key={h.id} className="bg-white p-2.5 rounded-lg border border-indigo-100/50 shadow-sm text-[11px]">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-800 truncate max-w-[130px]">{h.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-50 text-indigo-600">
                              {h.type.replace(' Holiday', '')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            {h.startDate === h.endDate ? h.startDate : `${h.startDate} to ${h.endDate}`}
                          </div>
                        </div>
                      ))}
                    {holidays.filter(h => h.endDate >= new Date().toISOString().split('T')[0]).length === 0 && (
                      <p className="text-slate-400 italic text-[11px] text-center py-4">No upcoming scheduled breaks.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 md:col-span-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>My Approved Leaves & Attendance Sync logs</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                    {leaves
                      .filter(l => l.applicantId === user.id && l.status === 'Approved')
                      .slice(0, 4)
                      .map(l => (
                        <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span className="font-extrabold text-slate-800">{l.leaveType}</span>
                            <span className="text-emerald-600 font-extrabold text-[9px] uppercase font-mono">Synced</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">{l.startDate} to {l.endDate}</p>
                          <p className="text-slate-400 italic text-[10px] truncate">"{l.reason}"</p>
                        </div>
                      ))}
                    {leaves.filter(l => l.applicantId === user.id && l.status === 'Approved').length === 0 && (
                      <div className="col-span-2 text-slate-400 italic text-[11px] text-center py-6">
                        No approved leaves registered on this account yet.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TEACHER/CLASS TEACHER DASHBOARD INTEGRATION */}
            {(user.role === 'teacher') && (
              <>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-5 space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-800">
                    <User className="w-4 h-4" />
                    <span>My Personal Leave Tracker</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">My Approved</p>
                      <p className="text-lg font-extrabold text-purple-700 mt-0.5">
                        {leaves.filter(l => l.applicantId === user.id && l.status === 'Approved').length}
                      </p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">My Pending</p>
                      <p className="text-lg font-extrabold text-amber-600 mt-0.5">
                        {leaves.filter(l => l.applicantId === user.id && l.status === 'Pending').length}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('apply');
                      if (activeFormReasons.length > 0) setSelectedLeaveType(activeFormReasons[0].name);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer transition-colors"
                  >
                    Quickly Apply Personal Leave
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 md:col-span-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Bell className="w-4 h-4 text-amber-500 animate-swing" />
                      <span>Pending Class Student Requests</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 font-mono font-extrabold">
                      {LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) ? `Class ${classes.find(c => c.id === user.classId)?.className || ''}` : 'Action Needed'}
                    </span>
                  </h4>
                  
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {leaves
                      .filter(l => l.status === 'Pending' && l.applicantRole === 'student' && (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) ? l.classId === user.classId : false))
                      .map(l => (
                        <div key={l.id} className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{l.applicantName}</span>
                            <span className="text-slate-400 mx-1.5">|</span>
                            <span className="text-slate-500">{l.leaveType}</span>
                            <span className="text-slate-400 mx-1.5">|</span>
                            <span className="font-mono text-slate-600">{l.startDate} to {l.endDate}</span>
                          </div>
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewRemarks('');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded cursor-pointer transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    {leaves.filter(l => l.status === 'Pending' && l.applicantRole === 'student' && (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) ? l.classId === user.classId : false)).length === 0 && (
                      <p className="text-slate-400 italic text-[11px] text-center py-6">
                        No pending student leave requests currently. Excellent!
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* HEADMASTER DASHBOARD INTEGRATION */}
            {user.role === 'headmaster' && (
              <>
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 space-y-4">
                  <h4 className="font-extrabold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Master Policy Dashboard</span>
                  </h4>
                  <div className="text-[11px] text-slate-300 space-y-3 leading-relaxed">
                    <p>Configure intervening Sunday/holiday calculations dynamically. Current active school ruleset: </p>
                    <div className="bg-white/10 rounded-lg p-2.5 border border-white/10 font-mono text-slate-100">
                      <strong>{leaveRule === 'Rule A' ? 'Rule A: Ignored' : leaveRule === 'Rule B' ? 'Rule B: Sandwiched' : 'Rule C: Sunday Sandwich Only'}</strong>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {leaveRule === 'Rule A' && "Holidays and Sundays do not consume leave days."}
                        {leaveRule === 'Rule B' && "Intervening holidays and Sundays count as leave days."}
                        {leaveRule === 'Rule C' && "Intervening Sundays count as leave, individual holidays ignored."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('master_settings');
                      setMasterSubTab('holidays');
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-lg cursor-pointer transition-all"
                  >
                    Change Rule & Add Holidays
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                    <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Staff Pending Approvals</span>
                  </h4>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {leaves
                      .filter(l => l.status === 'Pending' && l.applicantRole !== 'student')
                      .map(l => (
                        <div key={l.id} className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{l.applicantName}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono ml-1.5 uppercase">{l.applicantRole}</span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{l.startDate} to {l.endDate} ({l.leaveType})</div>
                          </div>
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewRemarks('');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded cursor-pointer transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    {leaves.filter(l => l.status === 'Pending' && l.applicantRole !== 'student').length === 0 && (
                      <p className="text-slate-400 italic text-[11px] text-center py-6">
                        No pending staff leave applications. All clear!
                      </p>
                    )}
                  </div>
                </div>

                {/* Monthly Leave Statistics (High-craft SVG visualizer) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-700">
                    Monthly Leave Stats (Active Term)
                  </h4>
                  <div className="space-y-2.5 pt-1 text-[11px]">
                    {/* Compute categories */}
                    {['Sick Leave', 'Casual Leave (CL)', 'Earned Leave (EL)', 'Other'].map(cat => {
                      const count = leaves.filter(l => l.status === 'Approved' && (cat === 'Other' ? (!l.leaveType.includes('Sick') && !l.leaveType.includes('Casual') && !l.leaveType.includes('Earned')) : l.leaveType.includes(cat))).length;
                      const percentage = leaves.filter(l => l.status === 'Approved').length > 0 ? Math.round((count / leaves.filter(l => l.status === 'Approved').length) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{cat}</span>
                            <span>{count} Approved ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(5, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

          </div>

          {/* DYNAMIC SCREEN VIEW 1A: SMART LEAVE CALENDAR */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 no-print">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="text-indigo-600 w-4 h-4" />
                    <span>Smart Leave & Holiday Academic Calendar</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Click on any colored date block to view comprehensive details.</p>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center gap-2">
                  <select
                    value={calendarMonth}
                    onChange={e => setCalendarMonth(parseInt(e.target.value))}
                    className="border border-slate-200 bg-white rounded-lg p-1.5 text-xs font-bold font-sans"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={calendarYear}
                    onChange={e => setCalendarYear(parseInt(e.target.value))}
                    className="border border-slate-200 bg-white rounded-lg p-1.5 text-xs font-bold font-mono"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>

                  <button
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonth(today.getMonth());
                      setCalendarYear(today.getFullYear());
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-bold"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* CALENDAR LEGEND */}
              <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150 text-[10px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider mr-2 self-center text-[9px] font-mono">Colors Legend:</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 block"></span><span className="text-emerald-800">Approved Leave</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 block"></span><span className="text-amber-800">Pending Leave</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 border border-rose-600 block"></span><span className="text-rose-800">Rejected Leave</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 border border-blue-700 block"></span><span className="text-blue-800">School / Govt Holiday</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-600 border border-purple-700 block"></span><span className="text-purple-800">School Vacation</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500 border border-orange-600 block"></span><span className="text-orange-800">Half-Day Holiday</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-300 border border-slate-400 block"></span><span className="text-slate-700">Sunday</span></span>
              </div>

              {/* CALENDAR GRID */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {/* Week Day Labels */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 font-mono font-bold text-slate-400 uppercase text-[10px]">
                    {day}
                  </div>
                ))}

                {/* Previous month day cells */}
                {(() => {
                  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                  const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();
                  const cells = [];

                  for (let i = firstDayIndex - 1; i >= 0; i--) {
                    const dayNum = prevMonthDays - i;
                    cells.push(
                      <div key={`prev-${dayNum}`} className="p-3 bg-slate-50/50 text-slate-300 rounded-xl border border-slate-100 opacity-40 font-mono text-[11px] h-16 flex items-start justify-start select-none">
                        {dayNum}
                      </div>
                    );
                  }

                  // Current month day cells
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isSun = new Date(calendarYear, calendarMonth, d).getDay() === 0;

                    // Fetch active holiday
                    const matchedHoliday = holidays.find(h => dateStr >= h.startDate && dateStr <= h.endDate);

                    // Fetch leaves for this day
                    const matchedLeaves = leaves.filter(l => {
                      if (l.status === 'Cancelled') return false;
                      // Secure visibility boundaries
                      if (user.role === 'student' || user.role === 'clerk') return isOwnLeave(l);
                      if (LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id)) return l.applicantId === user.id || (l.applicantRole === 'student' && l.classId === user.classId);
                      return true; // Headmaster & clerk see all
                    });
                    const activeLeaveOnDay = matchedLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);

                    // Resolve day styling
                    let cellClass = "bg-white text-slate-700 hover:bg-slate-50 border border-slate-100";
                    let dayLabel = "";

                    if (activeLeaveOnDay) {
                      if (activeLeaveOnDay.status === 'Approved') {
                        cellClass = "bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white shadow-sm font-bold";
                        dayLabel = `${activeLeaveOnDay.applicantName.split(' ')[0]} (LV)`;
                      } else if (activeLeaveOnDay.status === 'Pending') {
                        cellClass = "bg-amber-400 hover:bg-amber-50 border border-amber-500 text-slate-900 shadow-sm font-bold";
                        dayLabel = `${activeLeaveOnDay.applicantName.split(' ')[0]} (PND)`;
                      } else if (activeLeaveOnDay.status === 'Rejected') {
                        cellClass = "bg-rose-500 hover:bg-rose-600 border border-rose-600 text-white shadow-sm font-bold";
                        dayLabel = "Rejected";
                      }
                    } else if (matchedHoliday) {
                      if (matchedHoliday.type === 'School Vacation') {
                        cellClass = "bg-purple-600 hover:bg-purple-700 border border-purple-700 text-white shadow-sm font-bold";
                        dayLabel = "Vacation";
                      } else if (matchedHoliday.type === 'Half-Day Holiday') {
                        cellClass = "bg-orange-500 hover:bg-orange-600 border border-orange-600 text-white shadow-sm font-bold";
                        dayLabel = "Half Day";
                      } else {
                        cellClass = "bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white shadow-sm font-bold";
                        dayLabel = matchedHoliday.name.length > 10 ? matchedHoliday.name.substring(0, 10) + '..' : matchedHoliday.name;
                      }
                    } else if (isSun) {
                      cellClass = "bg-slate-100 text-slate-500 border border-slate-200 font-bold";
                      dayLabel = "Sunday";
                    }

                    cells.push(
                      <button
                        key={`curr-${d}`}
                        onClick={() => {
                          // Assemble popover details
                          let detailMsg = `Date: ${dateStr}\n\n`;
                          if (isSun) detailMsg += "• Sunday: School weekly holiday\n";
                          if (matchedHoliday) {
                            detailMsg += `• ${matchedHoliday.type}: "${matchedHoliday.name}"\n  Remarks: ${matchedHoliday.remarks || 'N/A'}\n  Classes: ${matchedHoliday.applicableClasses}\n\n`;
                          }
                          if (matchedLeaves.length > 0) {
                            detailMsg += "• Leave Requests registered on this date:\n";
                            matchedLeaves.forEach((ml, mi) => {
                              detailMsg += `  ${mi+1}. ${ml.applicantName} (${ml.applicantRole.toUpperCase()})\n     Type: ${ml.leaveType}\n     Status: ${ml.status}\n     Reason: "${ml.reason}"\n`;
                            });
                          }
                          if (!isSun && !matchedHoliday && matchedLeaves.length === 0) {
                            detailMsg += "Standard active school day. Regular lecture timetables apply.";
                          }
                          alert(detailMsg);
                        }}
                        className={`p-2 rounded-xl h-16 flex flex-col justify-between items-start cursor-pointer text-left transition-all ${cellClass}`}
                      >
                        <span className="font-mono font-bold text-[11px]">{d}</span>
                        {dayLabel && (
                          <span className="text-[8px] font-extrabold tracking-tight truncate w-full block">
                            {dayLabel}
                          </span>
                        )}
                      </button>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>
          )}

          {/* DYNAMIC SCREEN VIEW 1B: LIST SEARCH TABLE (ONLY SHOWS IF viewMode === 'list') */}
          {viewMode === 'list' && (
            <>
              {/* SEARCH & FILTERS CONTROLS */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center justify-between no-print">
                <div className="flex flex-1 min-w-[240px] items-center gap-2 border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-1.5">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by student name, GR, SHALARTH ID, leave types..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {/* Class filter for student roles */}
                  {user.role !== 'student' && user.role !== 'teacher' && (
                    <select 
                      value={filterClassId} 
                      onChange={e => setFilterClassId(e.target.value)}
                      className="border border-slate-200 bg-white rounded-lg p-1.5 font-sans"
                    >
                      <option value="All">All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.className} ({c.division || 'A'})</option>
                      ))}
                    </select>
                  )}

                  {/* Status filter */}
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    disabled={focusedMode && activeFeatureId === 'leave-escalations'}
                    className="border border-slate-200 bg-white rounded-lg p-1.5 font-sans disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {/* Leave Type Filter */}
                  <select 
                    value={filterLeaveType} 
                    onChange={e => setFilterLeaveType(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-1.5 font-sans max-w-[150px]"
                  >
                    <option value="All">All Leave Types</option>
                    {Array.from(new Set(leaves.map(l => l.leaveType))).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Date Filter */}
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-1.5 font-mono text-[11px]"
                  />

                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterClassId('All');
                      setFilterStatus(activeFeatureId === 'leave-escalations' ? 'Pending' : 'All');
                      setFilterRole(activeFeatureId === 'student-leave-review' ? 'student' : activeFeatureId === 'staff-leave-review' ? 'staff' : 'All');
                      setFilterLeaveType('All');
                      setFilterDate('');
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold"
                    title="Clear Filters"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* MAIN DATA TABLE / GRID */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {focusedMode ? focusedListTitle : (user.role === 'student' || user.role === 'clerk' ? 'My Leave Application Records' : 'System Wide Leave Applications')}
                    </h3>
                    <p className="text-[10px] text-slate-400">Showing {filteredLeavesList.length} total matched logs.</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">
                    Academic Year: 2026-27
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider font-mono text-[9px] border-b border-slate-100">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Applicant Name</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Details (Class/SHALARTH)</th>
                        <th className="p-3.5">Leave Type</th>
                        <th className="p-3.5">Duration (From - To)</th>
                        <th className="p-3.5">Reason Preview</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 text-right no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredLeavesList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                            No matching leave requests registered in system.
                          </td>
                        </tr>
                      ) : (
                        filteredLeavesList.map(l => (
                          <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-3.5 font-mono text-[10px] text-slate-400">
                              #{l.id.substring(3, 8)}...
                            </td>
                            <td className="p-3.5 font-bold text-slate-800">
                              {l.applicantName}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                l.applicantRole === 'student' ? 'bg-blue-50 text-blue-600' :
                                l.applicantRole === 'teacher' ? 'bg-purple-50 text-purple-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {l.applicantRole}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {l.applicantRole === 'student' ? (
                                <span className="font-mono text-slate-600">
                                  {l.className} ({l.division || 'A'})
                                  {l.grNumber && <div className="text-[10px] text-slate-400">GR: {l.grNumber}</div>}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-600 text-[11px]">
                                  {l.shalarthId || l.employeeCode || 'NHS-STAFF'}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">
                                {l.leaveType}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                              <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong>
                              {l.isHalfDay && (
                                <div className="text-amber-600 text-[9px] font-sans font-bold uppercase">
                                  Half Day ({l.halfDayOption})
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate" title={l.reason}>
                              "{l.reason}"
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono border ${
                                l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                l.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                l.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right no-print whitespace-nowrap">
                              {/* Student cancels own pending leaves */}
                              {user.role === 'student' && l.status === 'Pending' && (
                                <button
                                  onClick={() => handleCancelLeave(l.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              )}

                              {/* Class Teacher approves/rejects class student pending leaves */}
                              {LocalERPDatabase.getAcademicSetup()?.classTeacherAssignments?.some((a: any) => a.teacherId === user.id) && l.applicantRole === 'student' && l.classId === user.classId && l.status === 'Pending' && (
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      setReviewingLeave(l);
                                      setReviewRemarks('');
                                    }}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                  >
                                    Review Request
                                  </button>
                                </div>
                              )}

                              {/* Headmaster approves/rejects teacher, staff, and views student leaves */}
                              {user.role === 'headmaster' && l.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    setReviewingLeave(l);
                                    setReviewRemarks('');
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  Review
                                </button>
                              )}

                              {/* Read Only detail viewer */}
                              <button
                                onClick={() => {
                                  alert(`Leave Details:\n\nApplicant: ${l.applicantName}\nRole: ${l.applicantRole.toUpperCase()}\nType: ${l.leaveType}\nDuration: ${l.startDate} to ${l.endDate}\nReason: "${l.reason}"\n\nStatus: ${l.status}\nRemarks: ${l.remarks || 'No remarks recorded yet'}\nReviewed By: ${l.reviewedBy || 'Pending Review'}`);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 ml-1.5 cursor-pointer inline-block"
                                title="Quick View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* QUICK HELP BLOCK */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm text-xs space-y-2 no-print">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Leave Approval Workflow Guidance:</span>
            </h4>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>Students request leave: Evaluated and signed-off by their respective <strong>Class Teachers</strong>.</li>
              <li>Teachers / Non-Teaching Staff request leave: Audited and signed-off strictly by the <strong>Headmaster</strong>.</li>
              <li>Once a student's leave is approved, the <strong>Smart Attendance Engine</strong> automatically populates and locks attendance statuses like <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1 py-0.5 font-mono text-[10px] rounded">ML</span> (Medical Leave) or <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 font-mono text-[10px] rounded">LV</span> (Approved Leave) for all matching dates.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 2: APPLY FOR LEAVE APPLICATION FORM               */}
      {/* ========================================================= */}
      {activeTab === 'apply' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900">New Leave Application Form</h3>
              <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">R4.9.6 · 23 Reason Languages</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Fill in leave details, choose any Indian Scheduled Language, then use AI Generate Reason or edit the generated text manually.</p>
          </div>

          <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 text-xs">
            
            {/* Applicant Meta Preview */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Applicant Name</p>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{user.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Registered Role</p>
                <p className="font-extrabold text-slate-800 uppercase text-xs mt-0.5">{user.role}</p>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date (Start)</label>
                <input 
                  type="date" 
                  value={leaveStart}
                  onChange={e => setLeaveStart(e.target.value)}
                  required
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date (End)</label>
                <input 
                  type="date" 
                  value={leaveEnd}
                  onChange={e => setLeaveEnd(e.target.value)}
                  required
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 font-mono"
                />
              </div>
            </div>

            {/* Half Day Option Toggle */}
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150 space-y-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="half_day_toggle"
                  checked={isHalfDay}
                  onChange={e => setIsHalfDay(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="half_day_toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Is this a Half Day Leave request?
                </label>
              </div>

              {isHalfDay && (
                <div className="pl-6 animate-fade-in">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mr-3">Session Slot:</span>
                  {['Morning Session', 'Afternoon Session'].map(option => (
                    <label key={option} className="inline-flex items-center gap-1.5 mr-4 cursor-pointer">
                      <input 
                        type="radio" 
                        name="half_day_session"
                        checked={halfDayOption === option}
                        onChange={() => setHalfDayOption(option as any)}
                        className="w-3.5 h-3.5 text-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Leave Type / Category Master Select */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Leave Type / Category
                </label>
                <button
                  type="button"
                  onClick={() => setCustomReasonEnabled(!customReasonEnabled)}
                  className="text-[10px] text-indigo-600 font-extrabold hover:underline"
                >
                  {customReasonEnabled ? "Select from pre-loaded Master Reasons" : "Type custom reason category"}
                </button>
              </div>

              {customReasonEnabled ? (
                <input 
                  type="text"
                  placeholder="e.g. Special Marriage Leave, Sudden Emergency..."
                  value={customLeaveType}
                  onChange={e => setCustomLeaveType(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 font-sans"
                  required
                />
              ) : (
                <select
                  value={selectedLeaveType}
                  onChange={e => setSelectedLeaveType(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 bg-no-repeat bg-right"
                  required
                >
                  {activeFormReasons.length === 0 ? (
                    <option value="Other">Other</option>
                  ) : (
                    activeFormReasons.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Attachment (Optional Simulation) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Upload Medical Certificate / Supporting Documents (Optional)
              </label>
              <div className="border border-slate-200 border-dashed rounded-lg p-3 text-center bg-slate-50/50">
                <input 
                  type="file" 
                  id="form_attachment"
                  onChange={e => {
                    const name = e.target.files?.[0]?.name || '';
                    setAttachmentFile(name);
                  }}
                  className="hidden" 
                />
                <label htmlFor="form_attachment" className="cursor-pointer inline-flex items-center gap-1.5 text-indigo-600 font-extrabold hover:underline">
                  <Download className="w-4 h-4 rotate-180" />
                  <span>{attachmentFile ? `Selected: ${attachmentFile}` : 'Choose PDF/Image files to attach'}</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Accepts up to 5MB (Simulated Vault)</p>
              </div>
            </div>

            {user.role !== 'student' && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Auto Reason Language
                </label>
                <select
                  value={reasonLanguage}
                  onChange={e => {
                    setReasonLanguage(e.target.value as LeaveReasonLanguageCode);
                    setReasonAutoMode(true);
                    setReasonGenerationSource('auto');
                  }}
                  className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs font-bold text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  {LEAVE_REASON_LOCALES.map(option => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                  English + all 22 Scheduled Indian languages. Changing the language regenerates the editable Detailed Reason in that language.
                </p>
              </div>
            )}

            {/* Remarks / Reason Description */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Detailed Reason / Reason
                </label>
                {user.role !== 'student' && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReasonAutoMode(true);
                        setLeaveReasonText(autoLeaveReason);
                        setReasonGenerationSource('auto');
                      }}
                      disabled={!autoLeaveReason || reasonGenerating}
                      className="text-[10px] font-extrabold text-indigo-600 hover:underline disabled:text-slate-300 disabled:no-underline"
                    >
                      Auto Fill
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateLeaveReasonWithAI}
                      disabled={!autoLeaveReason || reasonGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-300"
                    >
                      {reasonGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {reasonGenerating ? 'Generating...' : 'AI Generate Reason'}
                    </button>
                  </div>
                )}
              </div>
              {user.role !== 'student' && (
                <p className="mb-1.5 text-[10px] leading-4 text-slate-400">
                  Auto-generated from leave type, dates and half-day session. You can edit the text before submitting.
                </p>
              )}
              <textarea 
                value={leaveReasonText}
                dir={['ur', 'ks', 'sd'].includes(reasonLanguage) ? 'rtl' : 'ltr'}
                onChange={e => {
                  setLeaveReasonText(e.target.value);
                  if (user.role !== 'student') {
                    setReasonAutoMode(false);
                    setReasonGenerationSource('manual');
                  }
                }}
                required
                rows={3}
                placeholder={user.role === 'student'
                  ? "Provide precise details, dates, context, or contact details during the leave period..."
                  : "Select leave type and dates to auto-generate the reason..."}
                className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-400"
              />
              {user.role !== 'student' && leaveReasonText && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                  {reasonGenerationSource === 'ai' ? <RefreshCw className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                  {reasonGenerationSource === 'ai' ? 'AI generated' : reasonGenerationSource === 'manual' ? 'Manually edited' : reasonGenerationSource === 'template' ? 'Smart generated' : 'Auto-generated'}
                  {' · '}{LEAVE_REASON_LOCALE_MAP[reasonLanguage].label}{' · Editable'}
                </div>
              )}
            </div>

            {/* LIVE SMART LEAVE CALCULATOR & CONFLICT VALIDATOR */}
            {(() => {
              const breakdown = calculateLeaveBreakdown(leaveStart, leaveEnd, isHalfDay);
              const conflicts = checkLeaveConflicts(leaveStart, leaveEnd);
              if (!breakdown) return null;

              return (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in text-left">
                  <div className="border-b border-slate-150 pb-2">
                    <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Smart Leave Calculation Preview</span>
                    </h4>
                    <p className="text-[10px] text-slate-455 mt-0.5">Automated date analyzer resolved using school calendars and holiday tables.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Calendar Span</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{breakdown.totalDays} Days</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Sundays</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{breakdown.sundayCount}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Holidays / Vacs</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{breakdown.holidayCount + breakdown.vacationDays}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 bg-indigo-50/20">
                      <span className="text-[9px] text-indigo-600 font-bold block uppercase">Net Leave Days</span>
                      <span className="text-sm font-extrabold text-indigo-700 font-mono">{breakdown.netLeaveDays} Days</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    * Calculated under Headmaster's active <strong>{leaveRule === 'Rule A' ? 'Rule A' : leaveRule === 'Rule B' ? 'Rule B (Sandwich All)' : 'Rule C (Sandwich Sundays Only)'}</strong> policy guidelines.
                  </p>

                  {/* Conflict Warnings */}
                  {conflicts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 mt-2">
                      <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>System Conflict Warning alerts:</span>
                      </div>
                      <ul className="list-disc pl-5 text-[10px] text-amber-700 space-y-1 font-bold">
                        {conflicts.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            <button 
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Submit Official Leave Application
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 3: LEAVE REASON & HOLIDAY MASTER SETTINGS (HM ONLY) */}
      {/* ========================================================= */}
      {activeTab === 'master_settings' && user.role === 'headmaster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          {/* MASTER SUB-TAB NAVIGATION */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">National Master configuration Desk</h3>
              <p className="text-xs text-slate-400">Add, edit, deactivate leave reasons or configure scheduled school breaks and vacations.</p>
            </div>
            
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setMasterSubTab('reasons')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  masterSubTab === 'reasons' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Leave Reasons Master
              </button>
              <button
                onClick={() => setMasterSubTab('holidays')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  masterSubTab === 'holidays' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Holidays & Vacations Master
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: LEAVE REASONS EDITOR */}
          {masterSubTab === 'reasons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form to Add New Reason */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs h-fit">
                <h4 className="font-bold text-slate-800 text-sm">Add New Custom Reason</h4>
                <form onSubmit={handleAddReason} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Target Group Category</label>
                    <select 
                      value={newReasonCategory}
                      onChange={e => setNewReasonCategory(e.target.value as any)}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher (Academic Staff)</option>
                      <option value="staff">Non-Teaching Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Reason Name / Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Special Bereavement, Official Deputation..."
                      value={newReasonName}
                      onChange={e => setNewReasonName(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition-colors cursor-pointer"
                  >
                    Save Reason to Master
                  </button>
                </form>
              </div>

              {/* Right Column: Manage Grid Lists Grouped by Category */}
              <div className="lg:col-span-2 space-y-6">
                {['student', 'teacher', 'staff'].map(category => {
                  const catReasons = reasons.filter(r => r.category === category);
                  return (
                    <div key={category} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                          {category} Group Reasons
                        </span>
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {catReasons.length} Items
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {catReasons.map((r, idx) => (
                          <div key={r.id} className="p-3 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                              {editingReasonId === r.id ? (
                                <input 
                                  type="text"
                                  value={editReasonName}
                                  onChange={e => setEditReasonName(e.target.value)}
                                  className="border border-slate-300 rounded px-1.5 py-0.5 w-[200px]"
                                  autoFocus
                                />
                              ) : (
                                <span className={`font-semibold ${r.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                  {r.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Toggle Active status */}
                              <button
                                onClick={() => handleToggleReasonActive(r.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  r.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}
                              >
                                {r.isActive ? 'Active' : 'Disabled'}
                              </button>

                              {/* Editing buttons */}
                              {editingReasonId === r.id ? (
                                <button
                                  onClick={() => handleSaveEditReason(r.id)}
                                  className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded cursor-pointer"
                                  title="Save Edit"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartEditReason(r)}
                                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title="Edit Label"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Order adjust buttons */}
                              <button
                                onClick={() => handleReorderReason(r.id, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleReorderReason(r.id, 'down')}
                                disabled={idx === catReasons.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                                title="Move Down"
                              >
                                ▼
                              </button>

                              {/* Delete */}
                              <button type="button"
                                onClick={() => handleDeleteReason(r.id)}
                                className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: HOLIDAYS & POLICY RULE MASTER */}
          {masterSubTab === 'holidays' && (
            <div className="space-y-6 text-xs text-left">
              
              {/* LEAVE POLICY / SANDWICH RULE MASTER */}
              <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-850 space-y-4">
                <div className="border-b border-white/10 pb-2">
                  <h4 className="text-sm font-extrabold text-indigo-300">Intelligent Intervening Sunday/Holiday Sandwich Policy</h4>
                  <p className="text-[11px] text-slate-350">Choose how the system calculates working leave counts when holidays fall in-between a student/staff leave duration.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'Rule A',
                      title: 'Rule A (Standard)',
                      desc: 'Intervening Sundays and holidays are IGNORED. Only physical working days subtract from the user leave ledger balance.'
                    },
                    {
                      id: 'Rule B',
                      title: 'Rule B (Strict Sandwich)',
                      desc: 'ALL intervening holidays and Sundays falling inside a leave span are automatically COUNTED as active consumed leave.'
                    },
                    {
                      id: 'Rule C',
                      title: 'Rule C (Sunday Sandwich)',
                      desc: 'Only intervening SUNDAYS are counted as consumed leave; other declared individual festival/local holidays are ignored.'
                    }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleUpdateLeaveRule(r.id as any)}
                      className={`p-4 rounded-xl text-left border cursor-pointer transition-all ${
                        leaveRule === r.id 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-2 ring-indigo-500/50' 
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <strong className="block text-xs text-indigo-200">{r.title}</strong>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Declared Holiday Form */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                    <span>{editingHolidayId ? 'Edit Selected Break' : 'Declare New School Break'}</span>
                  </h4>

                  <form onSubmit={handleAddHoliday} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Break Name / Occasion</label>
                      <input
                        type="text"
                        placeholder="e.g. Diwali Vacation, Eid-ul-Fitr, Holi..."
                        value={newHolidayName}
                        onChange={e => setNewHolidayName(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Break Type</label>
                        <select
                          value={newHolidayType}
                          onChange={e => setNewHolidayType(e.target.value as any)}
                          className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                        >
                          <option value="Government Holiday">Government</option>
                          <option value="School Holiday">School Holiday</option>
                          <option value="School Vacation">Vacation Break</option>
                          <option value="Exam Holiday">Exam Holiday</option>
                          <option value="Local Holiday">Local Holiday</option>
                          <option value="Half-Day Holiday">Half Day</option>
                          <option value="Emergency Holiday">Emergency Off</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                        <select
                          value={newHolidayAcademicYear}
                          onChange={e => setNewHolidayAcademicYear(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        >
                          <option value="2026-27">2026-27</option>
                          <option value="2027-28">2027-28</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={newHolidayStart}
                          onChange={e => setNewHolidayStart(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={newHolidayEnd}
                          onChange={e => setNewHolidayEnd(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Applicable Classes</label>
                      <select
                        value={newHolidayClasses}
                        onChange={e => setNewHolidayClasses(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="All">All Grade Divisions (1 to 12)</option>
                        <option value="Primary (1-5)">Primary only (Classes 1-5)</option>
                        <option value="Secondary (6-10)">Secondary only (Classes 6-10)</option>
                        <option value="Higher Secondary (11-12)">Higher Secondary (11-12)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official remarks / Notice</label>
                      <textarea
                        rows={2}
                        placeholder="Add special instructions or school orders..."
                        value={newHolidayRemarks}
                        onChange={e => setNewHolidayRemarks(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-extrabold text-indigo-900">
                        <input type="checkbox" checked={holidayReminderEnabled} onChange={e => setHolidayReminderEnabled(e.target.checked)} />
                        Send reminder one day before the holiday
                      </label>
                      {holidayReminderEnabled && (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700">
                          {(['website', 'email', 'sms', 'whatsapp'] as const).map(channel => (
                            <label key={channel} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 capitalize">
                              <input
                                type="checkbox"
                                checked={holidayChannels[channel]}
                                onChange={e => setHolidayChannels(prev => ({ ...prev, [channel]: e.target.checked }))}
                              />
                              {channel === 'website' ? 'ERP Dashboard' : channel}
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="text-[9px] text-slate-500">ERP dashboard reminders work automatically. Email, SMS and WhatsApp delivery uses the configured server providers and records failures instead of showing a false success.</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition-all cursor-pointer"
                      >
                        {editingHolidayId ? 'Save Updates' : 'Declare & Sync'}
                      </button>
                      {editingHolidayId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHolidayId(null);
                            setNewHolidayName('');
                            setNewHolidayStart('');
                            setNewHolidayEnd('');
                            setNewHolidayRemarks('');
                          }}
                          className="py-2 px-3 bg-slate-200 text-slate-600 font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Column: Registered Break List & Table */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                        Registered Academic Calendar Breaks
                      </span>
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        {holidays.length} Active Events
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase font-mono text-[9px] border-b border-slate-100">
                          <tr>
                            <th className="p-3">Occasion</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Dates</th>
                            <th className="p-3">Target</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {holidays.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-extrabold text-slate-800">{h.name}</div>
                                {h.remarks && <p className="text-[10px] text-slate-400 italic font-normal">"{h.remarks}"</p>}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  h.type === 'School Vacation' ? 'bg-purple-100 text-purple-700' :
                                  h.type === 'Government Holiday' ? 'bg-blue-100 text-blue-700' :
                                  h.type === 'Half-Day Holiday' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {h.type.replace(' Holiday', '')}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                {h.startDate === h.endDate ? h.startDate : `${h.startDate} to ${h.endDate}`}
                              </td>
                              <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                {h.applicableClasses}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleEditHoliday(h)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer inline-block mr-1.5"
                                  title="Edit Holiday Details"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => handleDeleteHoliday(h.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer inline-block"
                                  title="Delete Holiday"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {holidays.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-6 text-center italic text-slate-400">
                                No holidays registered yet. Add one on the left.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 4: ANALYTICAL REPORTS DESK & EXPORT               */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Reports Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap gap-4 items-end text-xs no-print">
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Report Target</label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value as any)}
                className="border border-slate-200 bg-white rounded-lg p-2 font-sans"
              >
                {user.role === 'clerk' ? (
                  <>
                    <option value="daily">My Daily Leave Record</option>
                    <option value="monthly">My Monthly Leave History</option>
                    <option value="yearly">My Yearly Leave Summary</option>
                  </>
                ) : (
                  <>
                    <option value="daily">Daily Leave Report</option>
                    <option value="monthly">Monthly Leave Report</option>
                    <option value="yearly">Yearly Leave Summary</option>
                    <option value="student_register">Student Leave Register</option>
                    <option value="teacher_register">Teacher & Staff Leave Register</option>
                    <option value="holiday_list">Official Holiday List</option>
                    <option value="working_days">Working Days Analysis Report</option>
                    <option value="monthly_holidays">Monthly Holiday Report</option>
                    <option value="academic_calendar">Academic Calendar</option>
                  </>
                )}
              </select>
            </div>

            {reportType === 'daily' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Date</label>
                <input 
                  type="date" 
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="border border-slate-200 bg-white rounded-lg p-2 font-mono"
                />
              </div>
            )}

            {(reportType === 'monthly' || reportType === 'monthly_holidays') && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Month</label>
                <input 
                  type="month" 
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  className="border border-slate-200 bg-white rounded-lg p-2 font-mono"
                />
              </div>
            )}

            {reportType === 'yearly' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Academic Year</label>
                <select 
                  value={reportYear}
                  onChange={e => setReportYear(e.target.value)}
                  className="border border-slate-200 bg-white rounded-lg p-2 font-mono"
                >
                  <option value="2026">2026-27 (Active)</option>
                  <option value="2027">2027-28</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Approval Status</label>
              <select
                value={reportStatusFilter}
                onChange={e => setReportStatusFilter(e.target.value as any)}
                className="border border-slate-200 bg-white rounded-lg p-2 font-sans"
              >
                <option value="All">All Requests</option>
                <option value="Pending">Pending Only</option>
                <option value="Approved">Approved Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
            </div>

            {/* Layout adjustments */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Page Format</label>
              <div className="flex gap-2">
                <select 
                  value={printSize} 
                  onChange={e => setPrintSize(e.target.value as any)}
                  className="border border-slate-200 bg-white rounded-lg p-2"
                >
                  <option value="A4">A4 Size</option>
                  <option value="A3">A3 Size</option>
                </select>
                <select 
                  value={printOrientation} 
                  onChange={e => setPrintOrientation(e.target.value as any)}
                  className="border border-slate-200 bg-white rounded-lg p-2"
                >
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleExportToExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              
              <button
                type="button"
                onClick={() => printSectionById('leave-register-print', 'Official Leave Register Report')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Register
              </button>
            </div>
          </div>

          {/* REPORT PRINT VIEW CONTAINER */}
          <div id="leave-register-print" className={`bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-xs font-sans space-y-6 print-container`}>
            
            {/* National High School Official Letterhead Header */}
            <PrintLetterhead lang={lang} subtitle="Official Leave Register Report" />

            <div className="border-b border-slate-200 pb-4 text-center">
              <h2 className="text-sm font-extrabold tracking-wide uppercase font-mono text-slate-800">
                OFFICIAL LEAVE REGISTER REPORT
              </h2>
              <p className="text-[10px] text-slate-500 uppercase mt-1">
                Report Type: <strong>{reportType.replace('_', ' ')}</strong> | Period Range: <strong>{reportType === 'daily' ? reportDate : reportType === 'monthly' ? reportMonth : reportYear}</strong>
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                Generated Date/Time: {new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} | Active Academic Year: 2026-27
              </p>
            </div>

            {/* Conditional Reports Rendering depending on Report Type */}
            {['holiday_list', 'academic_calendar', 'monthly_holidays'].includes(reportType) ? (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600 uppercase font-mono font-bold text-[9px]">
                    <th className="p-2 border">Holiday ID</th>
                    <th className="p-2 border">Occasion Name</th>
                    <th className="p-2 border">Break Type</th>
                    <th className="p-2 border">Start Date</th>
                    <th className="p-2 border">End Date</th>
                    <th className="p-2 border">Applicable Classes</th>
                    <th className="p-2 border">Academic Year</th>
                    <th className="p-2 border">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {(() => {
                    const targetHols = reportType === 'monthly_holidays'
                      ? holidays.filter(h => h.startDate.startsWith(reportMonth) || h.endDate.startsWith(reportMonth))
                      : holidays;
                    
                    if (targetHols.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                            No school breaks registered under these constraints.
                          </td>
                        </tr>
                      );
                    }

                    return targetHols.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="p-2 border font-mono text-[9px] text-slate-400">#{h.id}</td>
                        <td className="p-2 border font-bold text-slate-800">{h.name}</td>
                        <td className="p-2 border font-mono text-[9px]">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold uppercase">{h.type}</span>
                        </td>
                        <td className="p-2 border font-mono text-[10px]">{h.startDate}</td>
                        <td className="p-2 border font-mono text-[10px]">{h.endDate}</td>
                        <td className="p-2 border text-slate-500">{h.applicableClasses}</td>
                        <td className="p-2 border font-mono text-[10px]">{h.academicYear}</td>
                        <td className="p-2 border text-slate-500 italic">{h.remarks || '-'}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            ) : reportType === 'working_days' ? (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600 uppercase font-mono font-bold text-[9px]">
                    <th className="p-2 border">Academic Month</th>
                    <th className="p-2 border">Total Calendar Days</th>
                    <th className="p-2 border">Sundays</th>
                    <th className="p-2 border">Individual Holidays</th>
                    <th className="p-2 border">Declared Vacation Days</th>
                    <th className="p-2 border bg-indigo-50 text-indigo-700 text-center font-extrabold">Net Teaching Working Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[10px]">
                  {[
                    { name: 'June 2026', range: ['2026-06-01', '2026-06-30'] },
                    { name: 'July 2026', range: ['2026-07-01', '2026-07-31'] },
                    { name: 'August 2026', range: ['2026-08-01', '2026-08-31'] },
                    { name: 'September 2026', range: ['2026-09-01', '2026-09-30'] },
                    { name: 'October 2026', range: ['2026-10-01', '2026-10-31'] },
                    { name: 'November 2026', range: ['2026-11-01', '2026-11-30'] },
                    { name: 'December 2026', range: ['2026-12-01', '2026-12-31'] },
                    { name: 'January 2027', range: ['2027-01-01', '2027-01-31'] },
                    { name: 'February 2027', range: ['2027-02-01', '2027-02-28'] },
                    { name: 'March 2027', range: ['2027-03-01', '2027-03-31'] },
                    { name: 'April 2027', range: ['2027-04-01', '2027-04-30'] },
                    { name: 'May 2027', range: ['2027-05-01', '2027-05-31'] }
                  ].map(m => {
                    const breakdown = calculateLeaveBreakdown(m.range[0], m.range[1], false);
                    if (!breakdown) return null;
                    return (
                      <tr key={m.name} className="hover:bg-slate-50/50">
                        <td className="p-2.5 border font-sans font-bold text-slate-800 text-xs">{m.name}</td>
                        <td className="p-2.5 border">{breakdown.totalDays} Days</td>
                        <td className="p-2.5 border">{breakdown.sundayCount} Sundays</td>
                        <td className="p-2.5 border">{breakdown.holidayCount} Days</td>
                        <td className="p-2.5 border">{breakdown.vacationDays} Days</td>
                        <td className="p-2.5 border bg-indigo-50/30 text-indigo-700 text-center text-xs font-extrabold">{breakdown.workingDays} Days</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600 uppercase font-mono font-bold text-[9px]">
                    <th className="p-2 border">Applicant ID</th>
                    <th className="p-2 border">Applicant Name</th>
                    <th className="p-2 border">Role</th>
                    <th className="p-2 border">Class / Details</th>
                    <th className="p-2 border">Leave Category</th>
                    <th className="p-2 border">Start Date</th>
                    <th className="p-2 border">End Date</th>
                    <th className="p-2 border">Duration</th>
                    <th className="p-2 border text-center">Status</th>
                    <th className="p-2 border">Approver/Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {generatedReportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        No records registered under the specified date constraints.
                      </td>
                    </tr>
                  ) : (
                    generatedReportData.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="p-2 border font-mono text-[9px] text-slate-400">
                          #{l.id.substring(3, 8)}
                        </td>
                        <td className="p-2 border font-bold text-slate-800">
                          {l.applicantName}
                        </td>
                        <td className="p-2 border font-bold text-slate-500 uppercase text-[9px]">
                          {l.applicantRole}
                        </td>
                        <td className="p-2 border">
                          {l.applicantRole === 'student' ? `${l.className} - ${l.division || 'A'}` : l.shalarthId || l.employeeCode || '-'}
                        </td>
                        <td className="p-2 border">
                          {l.leaveType}
                        </td>
                        <td className="p-2 border font-mono text-[10px]">
                          {l.startDate}
                        </td>
                        <td className="p-2 border font-mono text-[10px]">
                          {l.endDate}
                        </td>
                        <td className="p-2 border font-mono text-[10px]">
                          {l.isHalfDay ? `Half Day (${l.halfDayOption})` : 'Full Day'}
                        </td>
                        <td className="p-2 border text-center font-bold font-mono text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            l.status === 'Approved' ? 'text-emerald-700 font-extrabold' :
                            l.status === 'Rejected' ? 'text-rose-700 font-extrabold' :
                            'text-slate-500'
                          }`}>
                            {l.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 border text-slate-500 italic max-w-[150px] truncate" title={l.remarks}>
                          {l.reviewedBy ? `${l.reviewedBy}: "${l.remarks}"` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Print Signatures */}
            <PrintSignatureArea lang={lang} />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 5: NOTIFICATIONS TIMELINE LOG                      */}
      {/* ========================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Your Leave Notifications Log</h3>
              <p className="text-xs text-slate-400">Keep track of leave approvals and triggers dynamically in real-time.</p>
            </div>
            <button 
              onClick={() => {
                const read = notifications.map(n => ({ ...n, isRead: true }));
                saveNotifications(read);
              }}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.filter(n => n.userId === user.id).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">No notifications received yet.</p>
            ) : (
              notifications.filter(n => n.userId === user.id).map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-4 border rounded-xl flex items-start gap-3 transition-all ${
                    notif.isRead ? 'bg-slate-50/50 border-slate-200' : 'bg-indigo-50/30 border-indigo-150 shadow-sm'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    notif.type === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    notif.type === 'rejected' ? 'bg-rose-50 text-rose-600' :
                    notif.type === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold text-slate-900">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REVIEW DIALOG / OVERLAY SCREEN                           */}
      {/* ========================================================= */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-fade-in text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Review Leave Application</h3>
              <button 
                onClick={() => setReviewingLeave(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Applicant</span>
                  <span className="font-extrabold text-slate-800">{reviewingLeave.applicantName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Leave Category</span>
                  <span className="font-extrabold text-slate-800">{reviewingLeave.leaveType}</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Duration</span>
                <span className="font-mono text-slate-700 font-semibold">{reviewingLeave.startDate} to {reviewingLeave.endDate}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Applicant Description</span>
                <p className="text-slate-600 italic mt-0.5">"{reviewingLeave.reason}"</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Reviewer Comments / Remarks</label>
              <textarea
                value={reviewRemarks}
                onChange={e => setReviewRemarks(e.target.value)}
                placeholder="Enter remarks for approval or rejection e.g. medical verified, personal reasons valid..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <>
                <button type="button" onClick={() => handleReviewLeaveSubmit('Rejected')} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-bold cursor-pointer transition-colors">Reject Leave</button>
                <button onClick={() => handleReviewLeaveSubmit('Approved')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm">Approve Leave</button>
              </>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
