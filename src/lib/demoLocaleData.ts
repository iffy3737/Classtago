export type DemoLocaleContext = {
  familyCode:string;
  jurisdictionCode:string;
  jurisdictionName:string;
  medium:string;
  boardName:string;
};

export type DemoLocaleData = {
  schoolName:string;
  cityLabel:string;
  className:string;
  division:string;
  subject:string;
  secondarySubject:string;
  people:{
    headmaster:string;
    clerk:string;
    teacher:string;
    teacher2:string;
    student:string;
    student2:string;
    student3:string;
    parent:string;
    applicant:string;
    applicantParent:string;
  };
  grNo:string;
  admissionNo:string;
  mobile:string;
};

type Pool = Omit<DemoLocaleData,'cityLabel'|'grNo'|'admissionNo'|'mobile'>;

const pools:Record<string,Pool>={
  pan_india:{
    schoolName:'Horizon National Academy',className:'8-A',division:'A',subject:'Science',secondarySubject:'English',
    people:{headmaster:'Dr. Meera Nair',clerk:'Rohan Das',teacher:'Anita Joseph',teacher2:'Kunal Sharma',student:'Arjun Mehta',student2:'Ishaan Rao',student3:'Sara Joseph',parent:'Kavita Mehta',applicant:'Diya Thomas',applicantParent:'Maria Thomas'}
  },
  hi:{
    schoolName:'Navodaya Public Vidyalaya',className:'8-A',division:'A',subject:'Science',secondarySubject:'Hindi',
    people:{headmaster:'Dr. Neha Verma',clerk:'Amit Tiwari',teacher:'Pooja Singh',teacher2:'Vivek Mishra',student:'Aarav Gupta',student2:'Ishita Yadav',student3:'Kabir Singh',parent:'Rakesh Gupta',applicant:'Ishita Yadav',applicantParent:'Sunita Yadav'}
  },
  ur:{
    schoolName:'Ilm Horizon Urdu School',className:'8-A',division:'A',subject:'Science',secondarySubject:'Urdu',
    people:{headmaster:'Dr. Farah Shaikh',clerk:'Sameer Momin',teacher:'Nazia Sayyed',teacher2:'Imran Qureshi',student:'Ayaan Khan',student2:'Mariam Pathan',student3:'Zoya Shaikh',parent:'Shabana Khan',applicant:'Mariam Pathan',applicantParent:'Rashid Pathan'}
  },
  mr:{
    schoolName:'Sahyadri Vidya Mandir',className:'8-A',division:'A',subject:'विज्ञान',secondarySubject:'मराठी',
    people:{headmaster:'Dr. Anjali Deshmukh',clerk:'Sagar Patil',teacher:'Rutuja Kulkarni',teacher2:'Nilesh Jadhav',student:'Vedant Jadhav',student2:'Aarohi More',student3:'Aditya Patil',parent:'Meena Jadhav',applicant:'Aarohi More',applicantParent:'Sunita More'}
  },
  gu:{
    schoolName:'Navrang Vidya Sankul',className:'8-A',division:'A',subject:'વિજ્ઞાન',secondarySubject:'ગુજરાતી',
    people:{headmaster:'Dr. Neha Shah',clerk:'Harsh Patel',teacher:'Kavya Desai',teacher2:'Jignesh Mehta',student:'Dhruv Mehta',student2:'Riya Patel',student3:'Kavya Shah',parent:'Rupal Mehta',applicant:'Riya Patel',applicantParent:'Jignesh Patel'}
  },
  bn:{
    schoolName:'Udayan Vidya Niketan',className:'8-A',division:'A',subject:'বিজ্ঞান',secondarySubject:'বাংলা',
    people:{headmaster:'Dr. Ananya Sen',clerk:'Sourav Das',teacher:'Madhumita Roy',teacher2:'Arindam Bose',student:'Ritwik Ghosh',student2:'Ishani Dutta',student3:'Arko Sen',parent:'Nandita Ghosh',applicant:'Ishani Dutta',applicantParent:'Mousumi Dutta'}
  },
  ta:{
    schoolName:'Thendral Matric School',className:'8-A',division:'A',subject:'அறிவியல்',secondarySubject:'தமிழ்',
    people:{headmaster:'Dr. Lakshmi Raman',clerk:'Karthik Rajan',teacher:'Priya Narayanan',teacher2:'Arun Kumar',student:'Aditya Krishnan',student2:'Nila Subramanian',student3:'Kavin Rajan',parent:'Meena Krishnan',applicant:'Nila Subramanian',applicantParent:'Revathi Subramanian'}
  },
  te:{
    schoolName:'Pragathi Vidya Nilayam',className:'8-A',division:'A',subject:'సైన్స్',secondarySubject:'తెలుగు',
    people:{headmaster:'Dr. Srilatha Reddy',clerk:'Kiran Rao',teacher:'Anusha Naidu',teacher2:'Ravi Varma',student:'Arjun Reddy',student2:'Saanvi Rao',student3:'Nikhil Naidu',parent:'Padma Reddy',applicant:'Saanvi Rao',applicantParent:'Lakshmi Rao'}
  },
  kn:{
    schoolName:'Jnana Deepa Vidyalaya',className:'8-A',division:'A',subject:'ವಿಜ್ಞಾನ',secondarySubject:'ಕನ್ನಡ',
    people:{headmaster:'Dr. Nandini Rao',clerk:'Kiran Gowda',teacher:'Asha Hegde',teacher2:'Pradeep Shetty',student:'Vihaan Rao',student2:'Ananya Bhat',student3:'Arjun Hegde',parent:'Deepa Rao',applicant:'Ananya Bhat',applicantParent:'Shilpa Bhat'}
  },
  ml:{
    schoolName:'Malabar Vidya Bhavan',className:'8-A',division:'A',subject:'സയൻസ്',secondarySubject:'മലയാളം',
    people:{headmaster:'Dr. Anitha Menon',clerk:'Rahul Nair',teacher:'Lakshmi Pillai',teacher2:'Vivek Kurup',student:'Adith Nair',student2:'Diya Menon',student3:'Nikhil Pillai',parent:'Deepa Nair',applicant:'Diya Menon',applicantParent:'Anjali Menon'}
  },
  pa:{
    schoolName:'Punjab Heritage Public School',className:'8-A',division:'A',subject:'Science',secondarySubject:'ਪੰਜਾਬੀ',
    people:{headmaster:'Dr. Simran Kaur',clerk:'Harpreet Singh',teacher:'Navjot Kaur',teacher2:'Gurpreet Singh',student:'Armaan Singh',student2:'Meher Kaur',student3:'Gurkirat Singh',parent:'Jaspreet Kaur',applicant:'Meher Kaur',applicantParent:'Gurleen Kaur'}
  },
  or:{
    schoolName:'Utkal Vidya Niketan',className:'8-A',division:'A',subject:'ବିଜ୍ଞାନ',secondarySubject:'ଓଡ଼ିଆ',
    people:{headmaster:'Dr. Ananya Mohanty',clerk:'Sandeep Das',teacher:'Pooja Nayak',teacher2:'Rakesh Sahu',student:'Aditya Patnaik',student2:'Ira Mishra',student3:'Rohan Nayak',parent:'Madhavi Patnaik',applicant:'Ira Mishra',applicantParent:'Sushmita Mishra'}
  },
  as:{
    schoolName:'Brahmaputra Vidya Niketan',className:'8-A',division:'A',subject:'বিজ্ঞান',secondarySubject:'অসমীয়া',
    people:{headmaster:'Dr. Nandita Saikia',clerk:'Rupam Das',teacher:'Jonali Bora',teacher2:'Arup Deka',student:'Riyan Bora',student2:'Ananya Kalita',student3:'Arnav Deka',parent:'Mitali Bora',applicant:'Ananya Kalita',applicantParent:'Manisha Kalita'}
  }
};

const mediumKey=(medium:string)=>{
  const m=medium.toLowerCase();
  if(m.includes('hindi'))return 'hi';
  if(m.includes('urdu'))return 'ur';
  if(m.includes('marathi'))return 'mr';
  if(m.includes('gujarati'))return 'gu';
  if(m.includes('bengali'))return 'bn';
  if(m.includes('tamil'))return 'ta';
  if(m.includes('telugu'))return 'te';
  if(m.includes('kannada'))return 'kn';
  if(m.includes('malayalam'))return 'ml';
  if(m.includes('punjabi'))return 'pa';
  if(m.includes('odia'))return 'or';
  if(m.includes('assamese'))return 'as';
  return 'pan_india';
};

export function buildDemoLocaleData(ctx:DemoLocaleContext):DemoLocaleData{
  // National/international boards use a broad pan-India sample pool. State-board demos
  // follow the selected medium/region so names and sample context feel natural without
  // inferring or labelling any person's religion or caste.
  const key=ctx.familyCode==='state_board'?mediumKey(ctx.medium):'pan_india';
  const base=pools[key]||pools.pan_india;
  const schoolName=ctx.familyCode==='state_board' ? `${base.schoolName} · ${ctx.jurisdictionName}` : base.schoolName;
  return {
    ...base,
    schoolName,
    cityLabel:ctx.jurisdictionName||'India',
    grNo:'D-2026-0841',
    admissionNo:'ADM-2026-118',
    mobile:'+91 98XXXXXX42'
  };
}
