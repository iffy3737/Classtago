/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, Landmark, Award, Calendar, Users, 
  MapPin, Phone, Mail, ChevronRight, AlertCircle, ArrowRight
} from 'lucide-react';
import { Language, Notice } from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';
import { resolveNoticeTranslation } from '../lib/noticeTranslations';

interface WebsiteSectionProps {
  lang: Language;
  notices: Notice[];
  onOpenERP: () => void;
}

export default function WebsiteSection({ lang, notices, onOpenERP }: WebsiteSectionProps) {
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');

  const t = translations[lang];
  const isUrdu = lang === 'ur';

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail || !inquiryMsg) {
      alert("Please fill in all fields before sending your inquiry.");
      return;
    }
    setSubmitStatus('sending');
    setTimeout(() => {
      setSubmitStatus('sent');
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMsg('');
      setTimeout(() => setSubmitStatus(''), 5000);
    }, 1000);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Premium Hero Banner */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent"></div>
        
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/15 border border-blue-500/35 rounded-full text-blue-300 text-xs font-semibold uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t.admissionInfo}</span>
          </div>

          <UrduWrapper lang={lang} className="text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-normal">
              {t.schoolName}
            </h1>
            <p className="text-sm md:text-lg text-slate-300 max-w-2xl mx-auto mt-4 font-sans">
              {t.tagline}
            </p>
          </UrduWrapper>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-6">
            <button
              onClick={onOpenERP}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t.erpPortal}</span>
              <ArrowRight className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`} />
            </button>
            <a
              href="#about-section"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-sm font-semibold text-white border border-white/10 hover:border-white/25 rounded-xl transition-all text-center"
            >
              {lang === 'ur' ? 'مزید معلومات' : lang === 'hi' ? 'अधिक जानकारी' : 'Learn More'}
            </a>
          </div>
        </div>

        {/* Dynamic highlights strip */}
        <div className="bg-slate-950/40 border-t border-slate-800/60 py-4 px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto text-center divide-x divide-slate-800/40">
            <div>
              <div className="text-lg md:text-xl font-bold text-blue-300">Class 1 to 12</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Comprehensive Grades</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold text-blue-300">English, Hindi, Urdu</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Trilingual Instruction</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold text-blue-300">Nandurbar, MH</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">District Recognition</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold text-blue-300">Secular & Harmonious</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">School Culture</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: About and Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Center Column: About NHS and Message */}
        <div id="about-section" className="lg:col-span-2 space-y-8">
          {/* About Us Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3 font-sans">
              {t.aboutUs}
            </h2>
            <UrduWrapper lang={lang} className="mt-4 text-slate-600">
              <p className="leading-relaxed">{t.aboutUsText}</p>
            </UrduWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Landmark className="w-5 h-5 text-blue-600 mb-2" />
                <h4 className="font-semibold text-slate-900 text-sm">{t.vision}</h4>
                <UrduWrapper lang={lang} className="text-xs text-slate-500 mt-1">
                  <p>{t.visionText}</p>
                </UrduWrapper>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Award className="w-5 h-5 text-amber-500 mb-2" />
                <h4 className="font-semibold text-slate-900 text-sm">
                  {lang === 'ur' ? 'تعلیمی امتیاز' : lang === 'hi' ? 'शैक्षणिक उत्कृष्टता' : 'Academic Heritage'}
                </h4>
                <UrduWrapper lang={lang} className="text-xs text-slate-500 mt-1">
                  <p>
                    {lang === 'ur' 
                      ? 'مراٹھی اور اردو ثانوی بورڈ امتحانات میں مسلسل اعلیٰ فیصد نتائج حاصل کرنا۔' 
                      : lang === 'hi' 
                      ? 'लगातार शानदार बोर्ड परीक्षा परिणाम और उत्कृष्ट अनुशासन का गौरवशाली इतिहास।' 
                      : 'Consistent track record of achieving excellent SSC board examination percentages and active sports accolades.'}
                  </p>
                </UrduWrapper>
              </div>
            </div>
          </div>

          {/* Principal's Desk */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border border-blue-100 shadow-sm flex items-center justify-center">
              <Landmark className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider font-mono">From the Desk of the Headmaster</div>
              <h3 className="text-lg font-bold text-slate-900">Headmaster's Message</h3>
              <p className="text-xs text-slate-400">Official school leadership communication</p>
              
              <UrduWrapper lang={lang} className="text-xs text-slate-600 leading-relaxed pt-2">
                <p>
                  {lang === 'ur'
                    ? 'ہمارا مشن ایک ایسا سیکولر ماحول پیدا کرنا ہے جہاں نندوربار ضلع کا ہر بچہ چاہے وہ کسی بھی پس منظر سے ہو، اعلیٰ تعلیم، نظم و ضبط اور قائدانہ صلاحیتیں سیکھ کر ملک و قوم کا نام روشن کرے۔ ہم تعلیمی نصاب کے ساتھ اخلاقیات اور رواداری کو فروغ دینے میں یقین رکھتے ہیں۔'
                    : lang === 'hi'
                    ? 'हमारा मिशन एक ऐसा धर्मनिरपेक्ष वातावरण तैयार करना है जहां प्रत्येक छात्र अपनी पूरी क्षमता को उजागर कर सके। हम केवल शैक्षणिक सफलता ही नहीं, बल्कि एक जिम्मेदार नागरिक के रूप में चरित्र निर्माण को भी सर्वोच्च प्राथमिकता देते हैं।'
                    : 'We believe instruction should be secular, modern, and high-quality. Our unified ERP represents our commitment to absolute administrative clarity, making academic and financial records accessible, prompt, and secure for students, class teachers and parents alike.'}
                </p>
              </UrduWrapper>
            </div>
          </div>
        </div>

        {/* Right Column: Live Notice Board */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-md font-bold text-slate-900 font-sans">{t.noticeTitle}</h3>
            </div>

            <div className="space-y-4">
              {notices.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No notices posted yet.</p>
              ) : (
                notices.map((notice) => {
                  const translatedNotice = resolveNoticeTranslation(notice, lang);
                  const displayTitle = translatedNotice.title;
                  const displayContent = translatedNotice.content;

                  return (
                    <div 
                      key={notice.id} 
                      className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                          {notice.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {notice.date}
                        </span>
                      </div>
                      
                      <div
                        dir={translatedNotice.direction || 'ltr'}
                        className={(translatedNotice.direction || 'ltr') === 'rtl' ? 'text-right' : 'text-left'}
                      >
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">
                          {displayTitle}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                          {displayContent}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Admission Quick Info Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-white/5 rounded-full"></div>
            <h3 className="font-bold text-md mb-2 font-sans">{t.admissionInfo}</h3>
            <UrduWrapper lang={lang} className="text-xs text-blue-100 leading-relaxed mb-4">
              <p>{t.admissionText}</p>
            </UrduWrapper>
            <button
              onClick={onOpenERP}
              className="w-full py-2 bg-white text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-50 transition-all cursor-pointer shadow-sm"
            >
              {lang === 'ur' ? 'ابھی داخلہ درخواست جمع کریں' : lang === 'hi' ? 'प्रवेश के लिए आवेदन करें' : 'Apply Now via Portal'}
            </button>
          </div>
        </div>
      </div>

      {/* Inquiry and Contact section */}
      <section className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 font-sans">{t.contactUs}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              For academic concerns, verification transcripts, board examination schedules or fee clarifications, please use this form to directly notify the clerk desk.
            </p>

            <div className="space-y-3.5 pt-4">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{t.address}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Phone: Not configured</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Email: Not configured</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleInquirySubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-sans">{t.name}</label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-sans">{t.email}</label>
                <input
                  type="email"
                  required
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1 font-sans">{t.message}</label>
              <textarea
                required
                rows={3}
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              ></textarea>
            </div>

            {submitStatus === 'sent' && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                Your message has been dispatched! Clerk desk will email you back shortly.
              </div>
            )}

            <button
              type="submit"
              disabled={submitStatus === 'sending'}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitStatus === 'sending' ? 'Sending message...' : t.submit}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
