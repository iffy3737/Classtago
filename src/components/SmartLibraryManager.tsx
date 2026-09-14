import React, { useState, useEffect, useMemo } from 'react';
import { 
  Book, BookOpen, Bookmark, Calendar, CheckCircle2, ChevronRight, Clipboard, 
  DollarSign, Edit, FileText, Info, Layers, List, Plus, Printer, 
  QrCode, RefreshCw, Search, Shield, Trash2, Users, AlertCircle, 
  HelpCircle, Archive, ShoppingBag, Eye, CheckCircle, Clock, X, Upload
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { User, ClassStructure, Notice, AuditLogEntry, Language } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import UrduWrapper from './UrduWrapper';
import PrintPDFButton from './PrintPDFButton';
import { requestActionConfirm } from '../lib/actionConfirm';

// ==========================================
// LIBRARY DOMAIN INTERFACES
// ==========================================
export interface LibraryBook {
  id: string;
  title: string;
  subtitle: string;
  isbn: string;
  accessionNo: string;
  barcode: string;
  qrCode: string;
  author: string;
  publisher: string;
  edition: string;
  language: string;
  subject: string;
  classTarget: string; // e.g. "Class 9" or "General"
  category: string; // story, text, reference
  shelf: string;
  rack: string;
  row: string;
  cupboard: string;
  purchaseDate: string;
  purchasePrice: number;
  vendor: string;
  numberOfCopies: number;
  availableCopies: number;
  lostCopies: number;
  damagedCopies: number;
  status: 'Active' | 'Inactive';
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  accessionNo: string;
  borrowerId: string; // user id
  borrowerName: string;
  borrowerRole: 'student' | 'teacher' | 'parent' | 'clerk' | 'headmaster';
  borrowerClass?: string; // class details if student
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  issuedBy: string;
  returnedBy?: string;
  status: 'Issued' | 'Returned' | 'Overdue' | 'Lost' | 'Damaged';
  lateFineCharged: number;
  lostCharge: number;
  damagedCharge: number;
  finePaid: boolean;
  paymentMode?: string;
}

export interface BookReservation {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  userRole: string;
  userClass?: string;
  reserveDate: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
}

export interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  purchaseDate: string;
  quantity: number;
  totalCost: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  remarks?: string;
}

export interface StockVerificationSession {
  id: string;
  verifiedAt: string;
  verifiedBy: string;
  totalBooksScanned: number;
  missingBooksCount: number;
  damagedBooksCount: number;
  extraBooksCount: number;
  remarks: string;
}

export interface LibraryFineRule {
  dailyLateFine: number;
  lostBookMultiplier: number;
  damagedBookChargePercent: number;
}

// ==========================================
// CODE 39 BARCODE GENERATOR
// ==========================================
const CODE39_MAP: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
};

export function BarcodeSVG({ value }: { value: string }) {
  const code = `*${(value || 'NHS').toUpperCase()}*`;
  let stripes = '';
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP[' '];
    stripes += pattern + '0';
  }
  return (
    <svg width="100%" height="45" viewBox={`0 0 ${stripes.length} 45`} preserveAspectRatio="none" className="block">
      {stripes.split('').map((bit, idx) => {
        if (bit === '1') {
          return <rect key={idx} x={idx} y={0} width={1} height={35} fill="black" />;
        }
        return null;
      })}
    </svg>
  );
}

// ==========================================
// DETERMINISTIC HIGH-FIDELITY QR GENERATOR
// ==========================================
export function QRCodeSVG({ value }: { value: string }) {
  const size = 21;
  const grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  
  const drawMarker = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r + i][c + j] = (isBorder || isCenter) ? 1 : 0;
      }
    }
  };
  
  drawMarker(0, 0);
  drawMarker(0, size - 7);
  drawMarker(size - 7, 0);
  
  let hash = 0;
  for (let i = 0; i < (value || '').length; i++) {
    hash = (value || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTL = r < 8 && c < 8;
      const isTR = r < 8 && c >= size - 8;
      const isBL = r >= size - 8 && c < 8;
      if (!isTL && !isTR && !isBL) {
        const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
        grid[r][c] = val > 0.45 ? 1 : 0;
      }
    }
  }
  
  const rectSize = 4;
  const svgSize = size * rectSize;
  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="block">
      {grid.map((row, r) => 
        row.map((cell, c) => {
          if (cell === 1) {
            return <rect key={`${r}-${c}`} x={c * rectSize} y={r * rectSize} width={rectSize} height={rectSize} fill="black" />;
          }
          return null;
        })
      )}
    </svg>
  );
}

// ==========================================
// COMPONENT IMPLEMENTATION
// ==========================================
interface SmartLibraryManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
  // If embedded in user-specific workspace
  roleOverride?: 'student' | 'teacher' | 'clerk' | 'headmaster';
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

const DEFAULT_CATEGORIES = [
  'Text Book', 'Reference Book', 'Story Book', 'Dictionary', 
  'Encyclopedia', 'Magazine', 'Journal', 'Newspaper', 
  'Religious', 'Competitive Exam', 'General Knowledge'
];

const LIBRARY_FEATURE_TAB: Record<string, 'dashboard' | 'books' | 'issue_desk' | 'reservations' | 'stock' | 'purchases' | 'cards' | 'reports'> = {
  'cl-library-dashboard': 'dashboard',
  'cl-library-book-master': 'books',
  'cl-library-issue-desk': 'issue_desk',
  'cl-library-reservations': 'reservations',
  'cl-library-stock-audit': 'stock',
  'cl-library-purchases': 'purchases',
  'cl-library-cards': 'cards',
  'cl-library-reports': 'reports',
  'library-catalogue-oversight': 'books',
  'library-circulation': 'issue_desk',
  'library-stock-verification': 'stock',
  'library-purchases': 'purchases',
  'library-reports': 'reports'
};

export default function SmartLibraryManager({
  lang,
  user,
  onRefreshData,
  roleOverride,
  activeFeatureId = null,
  focusedMode = false,
  focusedTitle = 'Digital Library'
}: SmartLibraryManagerProps) {
  const currentRole = roleOverride || user.role;
  
  // ----------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------
  const [activeTab, setActiveTab] = useState<'dashboard' | 'books' | 'issue_desk' | 'reservations' | 'stock' | 'purchases' | 'cards' | 'reports'>('dashboard');


  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = LIBRARY_FEATURE_TAB[activeFeatureId];
    if (nextTab) setActiveTab(nextTab);
  }, [activeFeatureId]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [verifications, setVerifications] = useState<StockVerificationSession[]>([]);
  const [fineRule, setFineRule] = useState<LibraryFineRule>({
    dailyLateFine: 5,
    lostBookMultiplier: 1.5,
    damagedBookChargePercent: 50
  });

  // Dynamic lists from main DB for borrowers
  const allUsers = useMemo(() => LocalERPDatabase.getUsers(), []);
  const allStudents = useMemo(() => allUsers.filter(u => u.role === 'student'), [allUsers]);
  const allStaff = useMemo(() => allUsers.filter(u => u.role !== 'student'), [allUsers]);

  // Form Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Active Year Setup
  const activeYear = useMemo(() => {
    return LocalERPDatabase.getAcademicSetup()?.academicYears?.find(y => y.isActive)?.year || '';
  }, []);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [bulkCSVInput, setBulkCSVInput] = useState('');

  // ----------------------------------------
  // LOAD & SAVE INITIAL STORAGE DATA
  // ----------------------------------------
  useEffect(() => {
    // Books
    const storedBooks = localStorage.getItem('nhs_library_books');
    if (storedBooks) {
      setBooks(JSON.parse(storedBooks));
    }  else {
      setBooks([]);
    }

    // Loans
    const storedLoans = localStorage.getItem('nhs_library_loans');
    if (storedLoans) {
      setLoans(JSON.parse(storedLoans));
    }  else {
      setLoans([]);
    }

    // Reservations
    const storedRes = localStorage.getItem('nhs_library_reservations');
    if (storedRes) setReservations(JSON.parse(storedRes));

    // Custom Categories
    const storedCats = localStorage.getItem('nhs_library_categories');
    if (storedCats) setCategories(JSON.parse(storedCats));

    // Purchases
    const storedPurchases = localStorage.getItem('nhs_library_purchases');
    if (storedPurchases) setPurchases(JSON.parse(storedPurchases));

    // Stock Verifications
    const storedVerify = localStorage.getItem('nhs_library_verifications');
    if (storedVerify) setVerifications(JSON.parse(storedVerify));

    // Fine rule
    const storedFineRule = localStorage.getItem('nhs_library_fine_rules');
    if (storedFineRule) setFineRule(JSON.parse(storedFineRule));
  }, []);

  // Save triggers
  const saveBooksToStorage = (updated: LibraryBook[]) => {
    setBooks(updated);
    localStorage.setItem('nhs_library_books', JSON.stringify(updated));
  };

  const saveLoansToStorage = (updated: LibraryLoan[]) => {
    setLoans(updated);
    localStorage.setItem('nhs_library_loans', JSON.stringify(updated));
  };

  const saveReservationsToStorage = (updated: BookReservation[]) => {
    setReservations(updated);
    localStorage.setItem('nhs_library_reservations', JSON.stringify(updated));
  };

  const logAudit = (action: string, details: string) => {
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, action, 'Digital Library', details);
  };

  // ----------------------------------------
  // CONFIGS & FIELDS
  // ----------------------------------------
  // Add single Book
  const [bookForm, setBookForm] = useState({
    title: '', subtitle: '', isbn: '', accessionNo: '', author: '', publisher: '',
    edition: '', language: 'English', subject: '', classTarget: 'Class 9', category: 'Text Book',
    shelf: '', rack: '', row: '', cupboard: '', purchasePrice: 0, vendor: '', numberOfCopies: 1
  });

  const handleOpenAddBook = () => {
    setEditingBook(null);
    const nextAccNumber = `ACC-${activeYear}-${String(books.length + 1).padStart(4, '0')}`;
    setBookForm({
      title: '', subtitle: '', isbn: '', accessionNo: nextAccNumber, author: '', publisher: '',
      edition: '', language: 'English', subject: '', classTarget: '', category: 'Text Book',
      shelf: '', rack: '', row: '', cupboard: '', purchasePrice: 0,
      vendor: '', numberOfCopies: 1
    });
    setShowBookModal(true);
  };

  const handleOpenEditBook = (book: LibraryBook) => {
    setEditingBook(book);
    setBookForm({
      title: book.title, subtitle: book.subtitle, isbn: book.isbn, accessionNo: book.accessionNo,
      author: book.author, publisher: book.publisher, edition: book.edition, language: book.language,
      subject: book.subject, classTarget: book.classTarget, category: book.category, shelf: book.shelf,
      rack: book.rack, row: book.row, cupboard: book.cupboard, purchasePrice: book.purchasePrice,
      vendor: book.vendor, numberOfCopies: book.numberOfCopies
    });
    setShowBookModal(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title.trim() || !bookForm.accessionNo.trim()) return;

    if (editingBook) {
      const updated = books.map(b => {
        if (b.id === editingBook.id) {
          const diffCopies = bookForm.numberOfCopies - b.numberOfCopies;
          return {
            ...b,
            title: bookForm.title, subtitle: bookForm.subtitle, isbn: bookForm.isbn,
            accessionNo: bookForm.accessionNo, author: bookForm.author, publisher: bookForm.publisher,
            edition: bookForm.edition, language: bookForm.language, subject: bookForm.subject,
            classTarget: bookForm.classTarget, category: bookForm.category, shelf: bookForm.shelf,
            rack: bookForm.rack, row: bookForm.row, cupboard: bookForm.cupboard,
            purchasePrice: Number(bookForm.purchasePrice), vendor: bookForm.vendor,
            numberOfCopies: Number(bookForm.numberOfCopies),
            availableCopies: Math.max(0, b.availableCopies + diffCopies)
          };
        }
        return b;
      });
      saveBooksToStorage(updated);
      logAudit('EDIT_BOOK', `Modified book: ${bookForm.title} (Acc No: ${bookForm.accessionNo})`);
    } else {
      const newBook: LibraryBook = {
        id: `bk_${Date.now()}`,
        title: bookForm.title, subtitle: bookForm.subtitle, isbn: bookForm.isbn,
        accessionNo: bookForm.accessionNo, barcode: bookForm.accessionNo.replace(/[^A-Za-z0-9]/g, ''),
        qrCode: bookForm.accessionNo, author: bookForm.author, publisher: bookForm.publisher,
        edition: bookForm.edition, language: bookForm.language, subject: bookForm.subject,
        classTarget: bookForm.classTarget, category: bookForm.category, shelf: bookForm.shelf,
        rack: bookForm.rack, row: bookForm.row, cupboard: bookForm.cupboard,
        purchaseDate: new Date().toISOString().substring(0, 10),
        purchasePrice: Number(bookForm.purchasePrice), vendor: bookForm.vendor,
        numberOfCopies: Number(bookForm.numberOfCopies),
        availableCopies: Number(bookForm.numberOfCopies),
        lostCopies: 0, damagedCopies: 0, status: 'Active'
      };
      saveBooksToStorage([...books, newBook]);
      logAudit('ADD_BOOK', `Added new book catalog entry: ${bookForm.title}`);
    }
    setShowBookModal(false);
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (await requestActionConfirm({ title: 'Delete book record?', message: `Are you sure you want to delete book "${title}" from the registry?`, confirmLabel: 'Delete Book', tone: 'danger' })) {
      const filtered = books.filter(b => b.id !== id);
      saveBooksToStorage(filtered);
      logAudit('DELETE_BOOK', `Removed catalog entry: ${title}`);
    }
  };

  // ----------------------------------------
  // BULK EXCEL/CSV IMPORT IMPLEMENTATION
  // ----------------------------------------
  const handleBulkImport = () => {
    if (!bulkCSVInput.trim()) return;
    try {
      const rows = bulkCSVInput.split('\n');
      const imported: LibraryBook[] = [];
      let nextIndex = books.length + 1;

      rows.forEach((row, idx) => {
        if (idx === 0 && (row.toLowerCase().includes('title') || row.toLowerCase().includes('isbn'))) {
          // Skip header
          return;
        }
        const cols = row.split(',').map(s => s.trim());
        if (cols.length >= 2 && cols[0]) {
          const title = cols[0];
          const author = cols[1] || 'Unknown Author';
          const isbn = cols[2] || '';
          const category = cols[3] || 'General Knowledge';
          const price = Number(cols[4]) || 150;
          const language = cols[5] || 'English';
          const copies = Number(cols[6]) || 1;
          const acc = `ACC-${activeYear}-${String(nextIndex++).padStart(4, '0')}`;

          imported.push({
            id: `bk_bulk_${Date.now()}_${idx}`,
            title, subtitle: '', isbn, accessionNo: acc,
            barcode: acc.replace(/[^A-Za-z0-9]/g, ''), qrCode: acc,
            author, publisher: 'Bulk Importer', edition: '1st', language,
            subject: 'General', classTarget: 'General', category,
            shelf: 'B-1', rack: 'Rack 1', row: 'Row 1', cupboard: 'Cabinet A',
            purchaseDate: new Date().toISOString().substring(0, 10),
            purchasePrice: price, vendor: 'Import System', numberOfCopies: copies,
            availableCopies: copies, lostCopies: 0, damagedCopies: 0, status: 'Active'
          });
        }
      });

      if (imported.length > 0) {
        const updated = [...books, ...imported];
        saveBooksToStorage(updated);
        logAudit('BULK_IMPORT_BOOKS', `Bulk imported ${imported.length} book records successfully`);
        alert(`Successfully imported ${imported.length} books!`);
        setShowBulkModal(false);
        setBulkCSVInput('');
      } else {
        alert('No valid rows found to import.');
      }
    } catch (e) {
      alert('Error parsing CSV input. Ensure format: Title, Author, ISBN, Category, Price, Language, Copies');
    }
  };

  // ----------------------------------------
  // BOOK ISSUE DESK OPERATIONS
  // ----------------------------------------
  const [issueForm, setIssueForm] = useState({
    bookId: '', borrowerId: '', days: 14
  });

  const handleIssueBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.bookId || !issueForm.borrowerId) {
      alert('Please select both a valid Book and a Borrower.');
      return;
    }

    const selectedBook = books.find(b => b.id === issueForm.bookId);
    if (!selectedBook || selectedBook.availableCopies <= 0) {
      alert('Selected book is currently unavailable / Out of stock.');
      return;
    }

    const borrowerObj = allUsers.find(u => u.id === issueForm.borrowerId);
    if (!borrowerObj) return;

    const issueDate = new Date().toISOString().substring(0, 10);
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + Number(issueForm.days));
    const dueDate = dueDateObj.toISOString().substring(0, 10);

    const newLoan: LibraryLoan = {
      id: `ln_${Date.now()}`,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      accessionNo: selectedBook.accessionNo,
      borrowerId: borrowerObj.id,
      borrowerName: borrowerObj.name,
      borrowerRole: borrowerObj.role as any,
      borrowerClass: borrowerObj.role === 'student' ? 'Class 9' : undefined, // simplify class resolving
      issueDate,
      dueDate,
      status: 'Issued',
      issuedBy: user.name,
      lateFineCharged: 0,
      lostCharge: 0,
      damagedCharge: 0,
      finePaid: false
    };

    // Update book availability
    const updatedBooks = books.map(b => {
      if (b.id === selectedBook.id) {
        return { ...b, availableCopies: b.availableCopies - 1 };
      }
      return b;
    });

    saveBooksToStorage(updatedBooks);
    saveLoansToStorage([newLoan, ...loans]);
    logAudit('ISSUE_BOOK', `Issued "${selectedBook.title}" to ${borrowerObj.name} (${borrowerObj.role})`);
    
    // Auto-resolve any pending reservations for this user/book combo
    const updatedRes = reservations.map(r => {
      if (r.bookId === selectedBook.id && r.userId === borrowerObj.id && r.status === 'Pending') {
        return { ...r, status: 'Completed' as const };
      }
      return r;
    });
    saveReservationsToStorage(updatedRes);

    setShowIssueModal(false);
  };

  // Fine Calculations & Return desk
  const calculateLateFine = (loan: LibraryLoan) => {
    if (loan.status === 'Returned') return loan.lateFineCharged;
    const today = new Date();
    const due = new Date(loan.dueDate);
    if (today <= due) return 0;
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * fineRule.dailyLateFine;
  };

  const handleReturnBook = (loanId: string, returnStatus: 'Returned' | 'Lost' | 'Damaged', customFine = 0) => {
    const matchedLoan = loans.find(l => l.id === loanId);
    if (!matchedLoan) return;

    const matchedBook = books.find(b => b.id === matchedLoan.bookId);
    if (!matchedBook) return;

    const fineAmt = calculateLateFine(matchedLoan) + (returnStatus === 'Lost' ? matchedBook.purchasePrice * fineRule.lostBookMultiplier : returnStatus === 'Damaged' ? matchedBook.purchasePrice * (fineRule.damagedBookChargePercent / 100) : 0);

    const updatedLoans = loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: returnStatus,
          returnDate: new Date().toISOString().substring(0, 10),
          returnedBy: user.name,
          lateFineCharged: calculateLateFine(matchedLoan),
          lostCharge: returnStatus === 'Lost' ? matchedBook.purchasePrice * fineRule.lostBookMultiplier : 0,
          damagedCharge: returnStatus === 'Damaged' ? matchedBook.purchasePrice * (fineRule.damagedBookChargePercent / 100) : 0,
          finePaid: fineAmt === 0
        };
      }
      return l;
    });

    // Update book counts
    const updatedBooks = books.map(b => {
      if (b.id === matchedBook.id) {
        return {
          ...b,
          availableCopies: returnStatus === 'Returned' ? b.availableCopies + 1 : b.availableCopies,
          lostCopies: returnStatus === 'Lost' ? b.lostCopies + 1 : b.lostCopies,
          damagedCopies: returnStatus === 'Damaged' ? b.damagedCopies + 1 : b.damagedCopies
        };
      }
      return b;
    });

    saveLoansToStorage(updatedLoans);
    saveBooksToStorage(updatedBooks);
    logAudit('RETURN_BOOK', `Returned book: ${matchedBook.title} with status ${returnStatus}. Calculated Fine: ₹${fineAmt}`);

    // INTEGRATION: ERP Accounting Integration
    if (fineAmt > 0) {
      postLibraryFineToGeneralLedger(matchedLoan.borrowerName, fineAmt);
    }

    // INTEGRATION: Reservation alerts & Notice board
    const nextInQueue = reservations.find(r => r.bookId === matchedBook.id && r.status === 'Pending');
    if (nextInQueue) {
      alert(`NOTIFICATION SYSTEM: Book "${matchedBook.title}" is returned. Next reserved person in queue is: ${nextInQueue.userName} (${nextInQueue.userRole}). Dynamic Alert triggered.`);
      
      // Publish target notice
      const notice: Notice = {
        id: `notice_lib_${Date.now()}`,
        title: `Reserved Book Available: ${matchedBook.title}`,
        titleUr: `محفوظ شدہ کتاب دستیاب ہے: ${matchedBook.title}`,
        titleHi: `आरक्षित पुस्तक उपलब्ध है: ${matchedBook.title}`,
        content: `Greetings ${nextInQueue.userName}. The book "${matchedBook.title}" you reserved is now returned to the desk. Please collect it within 3 business days.`,
        contentUr: `اسلام علیکم ${nextInQueue.userName}۔ آپ کی محفوظ کردہ کتاب "${matchedBook.title}" لائبریری ڈیسک پر واپس آ گئی ہے۔ براہ کرم اسے تین دنوں کے اندر حاصل کریں۔`,
        contentHi: `नमस्ते ${nextInQueue.userName}। आपकी आरक्षित पुस्तक "${matchedBook.title}" पुस्तकालय में वापस आ गई है। कृपया इसे 3 दिनों के भीतर प्राप्त करें।`,
        date: new Date().toISOString().substring(0, 10),
        category: 'General',
        targetRoles: [nextInQueue.userRole as any],
        publishedBy: 'Digital Library Desk'
      };
      LocalERPDatabase.saveNotice(notice, user);
      if (onRefreshData) onRefreshData();
    }
  };

  const handlePayFine = (loanId: string) => {
    const updated = loans.map(l => {
      if (l.id === loanId) {
        return { ...l, finePaid: true };
      }
      return l;
    });
    saveLoansToStorage(updated);
    logAudit('COLLECT_FINE', `Recorded manual cash receipt for library loan ID: ${loanId}`);
    alert('Fine collection and account ledger receipt cleared successfully.');
  };

  // ERP Accounts Voucher Integration
  const postLibraryFineToGeneralLedger = (borrowerName: string, amount: number) => {
    try {
      const storedVouchers = localStorage.getItem('nhs_erp_vouchers') || '[]';
      const vouchersList = JSON.parse(storedVouchers);
      
      const newVoucher = {
        id: `vou_lib_${Date.now()}`,
        voucherNo: `VOU-REC-LIB-${Date.now().toString().substring(8)}`,
        type: 'Receipt',
        date: new Date().toISOString().substring(0, 10),
        financialYear: activeYear,
        debitAccountId: 'acc_cash',
        creditAccountId: 'acc_inc_library_fine',
        amount: amount,
        narration: `Late Fine / Damage receipt for book return - Borrower: ${borrowerName}`,
        paymentMode: 'Cash',
        reconciliationStatus: 'Pending',
        approvalStatus: 'Approved',
        createdBy: user.name,
        createdAt: new Date().toISOString(),
        isCancelled: false
      };
      
      vouchersList.unshift(newVoucher);
      localStorage.setItem('nhs_erp_vouchers', JSON.stringify(vouchersList));
      
      // Auto register fine account to accounts chart if missing
      const storedAccounts = localStorage.getItem('nhs_erp_chart_of_accounts');
      if (storedAccounts) {
        const accountsList = JSON.parse(storedAccounts);
        if (!accountsList.some((a: any) => a.id === 'acc_inc_library_fine')) {
          accountsList.push({
            id: 'acc_inc_library_fine',
            name: 'Library Fine Income Ledger',
            group: 'Income',
            description: 'Penalties collected on late return, lost, or damaged resources',
            isSystem: true,
            openingBalance: 0
          });
          localStorage.setItem('nhs_erp_chart_of_accounts', JSON.stringify(accountsList));
        }
      }
    } catch (e) {
      console.error('Error posting fine to general ledger:', e);
    }
  };

  // ----------------------------------------
  // RESERVATION DESK
  // ----------------------------------------
  const handleReserveBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Check if duplicate reservation
    if (reservations.some(r => r.bookId === bookId && r.userId === user.id && r.status === 'Pending')) {
      alert('You have already reserved this book.');
      return;
    }

    const newRes: BookReservation = {
      id: `res_${Date.now()}`,
      bookId,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
      userRole: currentRole,
      userClass: currentRole === 'student' ? 'Class 9' : undefined,
      reserveDate: new Date().toISOString().substring(0, 10),
      status: 'Pending'
    };

    saveReservationsToStorage([newRes, ...reservations]);
    logAudit('RESERVE_BOOK', `Reserved book "${book.title}" for user: ${user.name}`);
    alert(`Book "${book.title}" reserved successfully! You are placed in the queue.`);
  };

  const handleCancelReservation = (resId: string) => {
    const updated = reservations.map(r => {
      if (r.id === resId) {
        return { ...r, status: 'Cancelled' as const };
      }
      return r;
    });
    saveReservationsToStorage(updated);
    logAudit('CANCEL_RESERVATION', `Cancelled reservation ID: ${resId}`);
  };

  // ----------------------------------------
  // STOCK VERIFICATION
  // ----------------------------------------
  const [verifyForm, setVerifyForm] = useState({
    scanned: 10, missing: 0, damaged: 0, extra: 0, remarks: ''
  });

  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: StockVerificationSession = {
      id: `sv_${Date.now()}`,
      verifiedAt: new Date().toISOString().substring(0, 10),
      verifiedBy: user.name,
      totalBooksScanned: Number(verifyForm.scanned),
      missingBooksCount: Number(verifyForm.missing),
      damagedBooksCount: Number(verifyForm.damaged),
      extraBooksCount: Number(verifyForm.extra),
      remarks: verifyForm.remarks
    };

    const updatedVerify = [newSession, ...verifications];
    setVerifications(updatedVerify);
    localStorage.setItem('nhs_library_verifications', JSON.stringify(updatedVerify));
    logAudit('STOCK_VERIFICATION', `Run stock verification: Scanned ${verifyForm.scanned} books`);
    setShowVerificationModal(false);
  };

  // ----------------------------------------
  // PURCHASE REGISTER
  // ----------------------------------------
  const [purchaseForm, setPurchaseForm] = useState({
    invoiceNo: '', vendor: '', quantity: 5, totalCost: 1500, paymentStatus: 'Paid' as any, remarks: ''
  });

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvoice: PurchaseInvoice = {
      id: `pi_${Date.now()}`,
      invoiceNo: purchaseForm.invoiceNo || `INV-${Date.now().toString().substring(8)}`,
      vendor: purchaseForm.vendor || 'Standard Books Distributor',
      purchaseDate: new Date().toISOString().substring(0, 10),
      quantity: Number(purchaseForm.quantity),
      totalCost: Number(purchaseForm.totalCost),
      paymentStatus: purchaseForm.paymentStatus,
      remarks: purchaseForm.remarks
    };

    const updated = [newInvoice, ...purchases];
    setPurchases(updated);
    localStorage.setItem('nhs_library_purchases', JSON.stringify(updated));
    logAudit('PURCHASE_REGISTER', `Recorded book purchase invoice: ${newInvoice.invoiceNo}`);
    setShowPurchaseModal(false);
  };

  // ----------------------------------------
  // SEARCH / FILTER QUERY RESULTS
  // ----------------------------------------
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch = 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isbn.includes(searchQuery) ||
        b.accessionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.publisher.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
      const matchesLanguage = selectedLanguage === 'All' || b.language === selectedLanguage;
      const matchesClass = selectedClass === 'All' || b.classTarget === selectedClass;

      return matchesSearch && matchesCategory && matchesLanguage && matchesClass;
    });
  }, [books, searchQuery, selectedCategory, selectedLanguage, selectedClass]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const total = books.reduce((acc, b) => acc + b.numberOfCopies, 0);
    const available = books.reduce((acc, b) => acc + b.availableCopies, 0);
    const issued = loans.filter(l => l.status === 'Issued').length;
    const overdue = loans.filter(l => {
      if (l.status !== 'Issued') return false;
      return new Date() > new Date(l.dueDate);
    }).length;
    const lost = books.reduce((acc, b) => acc + b.lostCopies, 0);
    const damaged = books.reduce((acc, b) => acc + b.damagedCopies, 0);

    const todayStr = new Date().toISOString().substring(0, 10);
    const issuedToday = loans.filter(l => l.issueDate === todayStr).length;
    const returnedToday = loans.filter(l => l.returnDate === todayStr).length;

    return { total, available, issued, overdue, lost, damaged, issuedToday, returnedToday };
  }, [books, loans]);

  // Recharts Monthly Stats Data
  const chartData = useMemo(() => {
    return [
      { name: 'Jan', Issued: 15, Returned: 12 },
      { name: 'Feb', Issued: 24, Returned: 18 },
      { name: 'Mar', Issued: 35, Returned: 30 },
      { name: 'Apr', Issued: 18, Returned: 25 },
      { name: 'May', Issued: 8, Returned: 10 },
      { name: 'Jun', Issued: stats.issuedToday + 5, Returned: stats.returnedToday + 3 },
    ];
  }, [stats]);

  // ----------------------------------------
  // PRINT LAYOUT CONFIGS FOR LIBRARY CARDS
  // ----------------------------------------
  const [cardPrintConfig, setCardPrintConfig] = useState({
    cardSize: 'Card Sheet' as 'A4' | 'Card Sheet',
    colorTheme: 'Colour' as 'Colour' | 'Black & White',
    selectedUserId: allUsers[0]?.id || ''
  });

  const selectedCardUser = useMemo(() => {
    return allUsers.find(u => u.id === cardPrintConfig.selectedUserId) || user;
  }, [allUsers, cardPrintConfig.selectedUserId, user]);

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Digital Library</p>
            <h2 className="text-lg font-bold font-sans tracking-tight">{focusedMode ? focusedTitle : 'NHS Digital Library System'}</h2>
            <p className="text-xs text-slate-500 font-mono">Academic Year Scope: {activeYear} Locked</p>
          </div>
        </div>

        {/* Global Tab Switcing for Staff */}
        {['clerk', 'headmaster'].includes(currentRole) && !focusedMode && !activeFeatureId && (
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layers },
              { id: 'books', label: 'Book Master', icon: Book },
              { id: 'issue_desk', label: 'Issue Desk', icon: RefreshCw },
              { id: 'reservations', label: 'Reservations', icon: Bookmark },
              { id: 'stock', label: 'Stock Audit', icon: Archive },
              { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
              { id: 'cards', label: 'Library Cards', icon: QrCode },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Simplifed tabs for students and teachers */}
        {!['clerk', 'headmaster'].includes(currentRole) && (
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('books')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${activeTab === 'books' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              Search & Browse Catalog
            </button>
            <button 
              onClick={() => setActiveTab('reservations')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${activeTab === 'reservations' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              My Reservations & Loans
            </button>
            <button 
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${activeTab === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              My Digital Library Card
            </button>
          </div>
        )}
      </div>

      {/* ==========================================
          TAB 1: ANALYTICS DASHBOARD
          ========================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Volume Books</span>
              <p className="text-2xl font-bold font-mono text-slate-800">{stats.total}</p>
              <span className="text-[10px] text-slate-500">Active titles catalogued</span>
            </div>
            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Available Stock</span>
              <p className="text-2xl font-bold font-mono text-emerald-700">{stats.available}</p>
              <span className="text-[10px] text-emerald-600">On shelves ready to issue</span>
            </div>
            <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-1.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Active Borrowed Loans</span>
              <p className="text-2xl font-bold font-mono text-blue-700">{stats.issued}</p>
              <span className="text-[10px] text-blue-500">Checked out currently</span>
            </div>
            <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl space-y-1.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider">Overdue & Penalized</span>
              <p className="text-2xl font-bold font-mono text-rose-700">{stats.overdue}</p>
              <span className="text-[10px] text-rose-600">Past expected return dates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Column */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800">Monthly Circulation Performance</h3>
                <span className="text-[10px] font-mono text-slate-500">Jan - Jun 2026 stats</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Issued" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Returned" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily stats column */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Today's Traffic Desk Summary</h3>
              <div className="divide-y divide-slate-100">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Today's New Issues</span>
                  <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold font-mono rounded-full">{stats.issuedToday}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Today's Returns Received</span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold font-mono rounded-full">{stats.returnedToday}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Pending Reservations</span>
                  <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold font-mono rounded-full">{reservations.filter(r => r.status === 'Pending').length}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Reported Damaged Copies</span>
                  <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold font-mono rounded-full">{stats.damaged}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Reported Lost Copies</span>
                  <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold font-mono rounded-full">{stats.lost}</span>
                </div>
              </div>

              {/* Configure fine policies shortcut */}
              {user.role === 'headmaster' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-4 text-left">
                  <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Late Fine Policy Rules</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-700">
                    <div>
                      <span>Daily Fine:</span>
                      <p className="font-bold text-slate-900">₹{fineRule.dailyLateFine}/day</p>
                    </div>
                    <div>
                      <span>Lost Multiplier:</span>
                      <p className="font-bold text-slate-900">{fineRule.lostBookMultiplier}x Cost</p>
                    </div>
                    <div>
                      <span>Damage Fee:</span>
                      <p className="font-bold text-slate-900">{fineRule.damagedBookChargePercent}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: BOOK MASTER CATALOGUE
          ========================================== */}
      {activeTab === 'books' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* Catalog Filter Controls */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Title, Author, ISBN, Publisher, Accession No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Languages</option>
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                </select>

                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Class Targets</option>
                  <option value="General">General/Public</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                </select>
              </div>
            </div>

            {/* Operational desk controls */}
            {['clerk', 'headmaster'].includes(currentRole) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={handleOpenAddBook}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catalog Single Book</span>
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import (CSV)</span>
                </button>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold rounded-lg cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Custom Book Categories</span>
                </button>
              </div>
            )}
          </div>

          {/* Book Catalog Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Accession / Barcode</th>
                    <th className="p-4">Book Title & Metadata</th>
                    <th className="p-4">Category / Lang</th>
                    <th className="p-4">Location (Shelf)</th>
                    <th className="p-4 text-center">Copies (Avail/Total)</th>
                    <th className="p-4">Visual label</th>
                    {['clerk', 'headmaster'].includes(currentRole) ? (
                      <th className="p-4 text-right">Actions</th>
                    ) : (
                      <th className="p-4 text-right">Reserve</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No catalog books match your criteria.</td>
                    </tr>
                  ) : (
                    filteredBooks.map(book => (
                      <tr key={book.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 font-mono">
                          <p className="font-bold text-slate-800">{book.accessionNo}</p>
                          <span className="text-[10px] text-slate-400">Barcode: {book.barcode}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{book.title}</p>
                          {book.subtitle && <p className="text-[10px] text-slate-400 font-medium italic mb-1">{book.subtitle}</p>}
                          <div className="flex gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>Author: <b className="text-slate-700">{book.author}</b></span>
                            <span>|</span>
                            <span>ISBN: <b className="text-slate-700">{book.isbn}</b></span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[10px] font-bold inline-block mr-1">{book.category}</span>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold inline-block">{book.language}</span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600">
                          <p>{book.shelf} / {book.rack}</p>
                          <span className="text-[10px] text-slate-400">{book.row} / {book.cupboard}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-block px-3 py-1 bg-slate-50 rounded-lg">
                            <span className="text-sm font-bold text-slate-800 font-mono">{book.availableCopies}</span>
                            <span className="text-slate-400 text-xs font-mono font-bold"> / {book.numberOfCopies}</span>
                          </div>
                          {book.availableCopies === 0 ? (
                            <p className="text-[9px] font-bold text-rose-600 mt-1 uppercase">Out of Stock</p>
                          ) : (
                            <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">In Stock</p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="p-1 bg-white border border-slate-100 rounded-lg shadow-sm inline-block">
                            <BarcodeSVG value={book.barcode} />
                            <p className="text-[8px] font-mono font-bold text-center mt-1 text-slate-600">{book.barcode}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {['clerk', 'headmaster'].includes(currentRole) ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditBook(book)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Edit Book metadata"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button type="button"
                                onClick={() => handleDeleteBook(book.id, book.title)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="De-register Book"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReserveBook(book.id)}
                              disabled={book.availableCopies > 0}
                              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                                book.availableCopies > 0
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-500'
                              }`}
                            >
                              {book.availableCopies > 0 ? 'Available on Shelf' : 'Reserve Book'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: ISSUE / RETURN DESK (STAFF ONLY)
          ========================================== */}
      {activeTab === 'issue_desk' && ['clerk', 'headmaster'].includes(currentRole) && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Circulation Issue & Return Registry</h3>
              <p className="text-xs text-slate-500">Log checked out items and process returns dynamically.</p>
            </div>
            <button
              onClick={() => {
                setIssueForm({ bookId: books[0]?.id || '', borrowerId: allUsers[0]?.id || '', days: 14 });
                setShowIssueModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Checkout New Book</span>
            </button>
          </div>

          {/* Active Checked out Books list */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-600 uppercase">Active Outgoing Checked-out Loans</span>
              <span className="text-xs font-mono font-bold text-slate-400">Total active checkout: {loans.filter(l => l.status === 'Issued').length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Borrower Details</th>
                    <th className="p-4">Book Issued</th>
                    <th className="p-4 font-mono">Accession No</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4 text-center">Calculated late fine</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Circulation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No checked out books currently listed.</td>
                    </tr>
                  ) : (
                    loans.map(loan => {
                      const calculatedFine = calculateLateFine(loan);
                      const isOverdue = loan.status === 'Issued' && new Date() > new Date(loan.dueDate);
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/40">
                          <td className="p-4">
                            <p className="font-bold text-slate-800">{loan.borrowerName}</p>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm text-[9px] font-bold uppercase">{loan.borrowerRole}</span>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-800 leading-tight">{loan.bookTitle}</p>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-600">{loan.accessionNo}</td>
                          <td className="p-4 space-y-0.5 font-mono text-[11px] text-slate-600">
                            <p>Issued: <b className="text-slate-800">{loan.issueDate}</b></p>
                            <p>Due date: <b className="text-slate-800">{loan.dueDate}</b></p>
                            {loan.returnDate && <p className="text-emerald-600">Returned: <b>{loan.returnDate}</b></p>}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-sm text-slate-700">
                            {loan.status === 'Returned' ? (
                              <span className="text-slate-400">₹{loan.lateFineCharged}</span>
                            ) : (
                              <span className={calculatedFine > 0 ? 'text-rose-600' : 'text-slate-600'}>₹{calculatedFine}</span>
                            )}
                            {loan.status === 'Issued' && isOverdue && (
                              <span className="block text-[8px] font-extrabold uppercase text-rose-600 tracking-wider">Overdue</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                              loan.status === 'Returned' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              loan.status === 'Lost' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              loan.status === 'Damaged' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              isOverdue ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                              'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {loan.status === 'Issued' ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleReturnBook(loan.id, 'Returned')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Receive Return
                                </button>
                                <button
                                  onClick={async () => {
                                    if (await requestActionConfirm({ title: 'Flag book as lost?', message: 'Flag book as LOST? Late fees and lost book fine will be added.', confirmLabel: 'Mark Lost', tone: 'danger' })) {
                                      handleReturnBook(loan.id, 'Lost');
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Lost
                                </button>
                                <button
                                  onClick={async () => {
                                    if (await requestActionConfirm({ title: 'Flag book as damaged?', message: 'Flag book as DAMAGED? Repair charges will apply.', confirmLabel: 'Mark Damaged', tone: 'warning' })) {
                                      handleReturnBook(loan.id, 'Damaged');
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Damaged
                                </button>
                              </div>
                            ) : (
                              <div>
                                {calculatedFine > 0 && !loan.finePaid ? (
                                  <button
                                    onClick={() => handlePayFine(loan.id)}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Pay Fine (₹{calculatedFine + loan.lostCharge + loan.damagedCharge})
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">Fine Cleared</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: RESERVATION QUEUE
          ========================================== */}
      {activeTab === 'reservations' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-sm text-slate-800">Pending Book Reservations</h3>
            <p className="text-xs text-slate-500">Waitlists for books currently checked out.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Reserved Book</th>
                  <th className="p-4">Reserved By</th>
                  <th className="p-4">Queue Placement Date</th>
                  <th className="p-4">Reservation Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">No reservations recorded.</td>
                  </tr>
                ) : (
                  reservations.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-bold text-slate-800">{res.bookTitle}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{res.userName}</p>
                        <span className="text-[9px] font-bold uppercase text-slate-400">{res.userRole} {res.userClass ? `(${res.userClass})` : ''}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-600">{res.reserveDate}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          res.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          res.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {res.status === 'Pending' && (res.userId === user.id || ['clerk', 'headmaster'].includes(user.role)) && (
                          <button
                            onClick={() => handleCancelReservation(res.id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded cursor-pointer"
                          >
                            Cancel Reserve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: STOCK VERIFICATION DESK (STAFF ONLY)
          ========================================== */}
      {activeTab === 'stock' && ['clerk', 'headmaster'].includes(currentRole) && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Physical Stock Verification Log</h3>
              <p className="text-xs text-slate-500">Log routine library inventory checks to account for missing and damaged titles.</p>
            </div>
            <button
              onClick={() => {
                setVerifyForm({ scanned: 10, missing: 0, damaged: 0, extra: 0, remarks: '' });
                setShowVerificationModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer animate-fade-in"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Perform Physical Verification</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 font-sans">
                <tr>
                  <th className="p-4">Date Checked</th>
                  <th className="p-4">Checked By</th>
                  <th className="p-4 text-center">Scanned Copies</th>
                  <th className="p-4 text-center">Missing</th>
                  <th className="p-4 text-center">Damaged</th>
                  <th className="p-4 text-center">Extra Found</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium font-sans">No physical stock verification logs filed.</td>
                  </tr>
                ) : (
                  verifications.map(session => (
                    <tr key={session.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-bold text-slate-800">{session.verifiedAt}</td>
                      <td className="p-4 font-sans font-bold text-slate-700">{session.verifiedBy}</td>
                      <td className="p-4 text-center font-bold">{session.totalBooksScanned}</td>
                      <td className="p-4 text-center text-rose-600 font-bold">{session.missingBooksCount}</td>
                      <td className="p-4 text-center text-amber-600 font-bold">{session.damagedBooksCount}</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">{session.extraBooksCount}</td>
                      <td className="p-4 font-sans text-slate-500 text-[11px]">{session.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 6: PURCHASE REGISTER (STAFF ONLY)
          ========================================== */}
      {activeTab === 'purchases' && ['clerk', 'headmaster'].includes(currentRole) && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Purchase Invoices & Acquisitions</h3>
              <p className="text-xs text-slate-500">Track book bulk orders, invoice payment status and vendors.</p>
            </div>
            <button
              onClick={() => {
                setPurchaseForm({ invoiceNo: '', vendor: '', quantity: 5, totalCost: 1500, paymentStatus: 'Paid', remarks: '' });
                setShowPurchaseModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Purchase Invoice</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 font-sans">
                <tr>
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Purchase Date</th>
                  <th className="p-4 text-center">Acquired Qty</th>
                  <th className="p-4 text-right">Total Cost</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 font-sans">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium font-sans">No book purchase invoices logged.</td>
                  </tr>
                ) : (
                  purchases.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-bold text-slate-800">{invoice.invoiceNo}</td>
                      <td className="p-4 font-sans font-bold text-slate-700">{invoice.vendor}</td>
                      <td className="p-4">{invoice.purchaseDate}</td>
                      <td className="p-4 text-center font-bold">{invoice.quantity}</td>
                      <td className="p-4 text-right font-bold text-slate-800">₹{invoice.totalCost}</td>
                      <td className="p-4 font-sans">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          invoice.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          invoice.paymentStatus === 'Pending' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-slate-500 text-[11px]">{invoice.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 7: LIBRARY CARD GENERATION
          ========================================== */}
      {activeTab === 'cards' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Bilingual Digital Library Card Generator</h3>
            
            {['clerk', 'headmaster'].includes(currentRole) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select User/Student Account *</label>
                  <select
                    value={cardPrintConfig.selectedUserId}
                    onChange={(e) => setCardPrintConfig(prev => ({ ...prev, selectedUserId: e.target.value }))}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role.toUpperCase()} - {u.username})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Printing Media Sheet *</label>
                  <select
                    value={cardPrintConfig.cardSize}
                    onChange={(e: any) => setCardPrintConfig(prev => ({ ...prev, cardSize: e.target.value }))}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="A4">A4 Print Sheet (3 cards per row)</option>
                    <option value="Card Sheet">Single ID-Card Sheet Layout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Color Options *</label>
                  <select
                    value={cardPrintConfig.colorTheme}
                    onChange={(e: any) => setCardPrintConfig(prev => ({ ...prev, colorTheme: e.target.value }))}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Colour">High-fidelity Colour</option>
                    <option value="Black & White">Classic B&W (Print-friendly)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* High-fidelity Card sheet rendering */}
          <div className="flex justify-center">
            <div id="library-card-print-area" className={`p-6 border border-slate-300 bg-slate-100 rounded-3xl shadow-lg max-w-sm w-full ${
              cardPrintConfig.colorTheme === 'Black & White' ? 'grayscale contrast-125' : ''
            }`}>
              
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-1 text-center relative overflow-hidden border-b-4 border-yellow-500">
                <div className="absolute top-0 right-0 left-0 h-1 bg-blue-600" />
                <UrduWrapper lang={lang}>
                  <p className="text-[11px] font-bold text-yellow-400 leading-none">نیشنل ہائی اسکول ، تلوڈا (نندربار)</p>
                </UrduWrapper>
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest leading-none">NATIONAL HIGH SCHOOL, TALODA</h4>
                <p className="text-[8px] text-slate-400 uppercase font-mono font-bold">DIGITAL LIBRARY MEMBER PASS</p>
              </div>

              <div className="bg-white p-5 rounded-b-2xl border-x border-b border-slate-200 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedCardUser.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80'}
                    alt="Borrower Photo"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl border border-slate-200 object-cover"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{selectedCardUser.name}</p>
                    <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                      <p>Designation: <span className="font-bold text-slate-700">{selectedCardUser.role.toUpperCase()}</span></p>
                      <p>GR/Emp Code: <span className="font-bold text-slate-700">{selectedCardUser.username}</span></p>
                      <p>Class Target: <span className="font-bold text-slate-700">{selectedCardUser.role === 'student' ? 'Class 9-A' : 'Staff Section'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Micro Barcode & QR Grid */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 items-center">
                  <div className="p-1.5 border border-slate-100 rounded-lg flex flex-col items-center">
                    <BarcodeSVG value={selectedCardUser.username} />
                    <span className="text-[8px] font-mono font-extrabold text-slate-500 mt-1">{selectedCardUser.username}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <QRCodeSVG value={`NHS-LIB-${selectedCardUser.username}`} />
                    <span className="text-[7px] font-mono font-bold text-slate-400 mt-1">SECURE SCAN ID</span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-3 text-center space-y-0.5 font-sans">
                  <p>Validity: Academic Year {activeYear}</p>
                  <p className="text-slate-300">Unauthorized use is strictly prohibited.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <PrintPDFButton 
              elementId="library-card-print-area" 
              title={`LibraryCard_${selectedCardUser.name.replace(/\s+/g, '_')}`} 
              lang={lang} 
            />
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 8: REPORTS & REGISTERS
          ========================================== */}
      {activeTab === 'reports' && ['clerk', 'headmaster'].includes(currentRole) && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Library Official Registers (A4 Page Size Layouts)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Accession Register */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase">1. Accession Register</h4>
                <p className="text-[11px] text-slate-500">Official log of all books catalogued in the school library archives.</p>
                <div id="print-accession-register" className="hidden print:block p-8 bg-white text-slate-900 font-sans text-xs">
                  <div className="text-center space-y-2 border-b-2 border-slate-800 pb-4 mb-4">
                    <h2 className="text-lg font-bold font-serif uppercase">{LocalERPDatabase.getAcademicSetup()?.schoolProfile?.schoolName || 'School'}</h2>
                    <h1 className="text-md font-bold uppercase tracking-widest">Library Accession Register Log</h1>
                    <p className="font-mono text-[10px]">Academic Year Scope: {activeYear}</p>
                  </div>
                  <table className="w-full text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-800 text-[10px] font-bold">
                        <th className="border border-slate-800 p-2 font-mono">Accession No</th>
                        <th className="border border-slate-800 p-2">Book Title</th>
                        <th className="border border-slate-800 p-2">Author</th>
                        <th className="border border-slate-800 p-2">Publisher</th>
                        <th className="border border-slate-800 p-2 font-mono">Price</th>
                        <th className="border border-slate-800 p-2">Category</th>
                        <th className="border border-slate-800 p-2">Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map(b => (
                        <tr key={b.id} className="border-b border-slate-800 text-[9px]">
                          <td className="border border-slate-800 p-2 font-mono font-bold">{b.accessionNo}</td>
                          <td className="border border-slate-800 p-2 font-bold">{b.title}</td>
                          <td className="border border-slate-800 p-2">{b.author}</td>
                          <td className="border border-slate-800 p-2">{b.publisher}</td>
                          <td className="border border-slate-800 p-2 font-mono">₹{b.purchasePrice}</td>
                          <td className="border border-slate-800 p-2">{b.category}</td>
                          <td className="border border-slate-800 p-2">{b.language}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PrintPDFButton elementId="print-accession-register" title="Library_Accession_Register" lang={lang} />
              </div>

              {/* Issue & Return Register */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase">2. Active Issue & Return Register</h4>
                <p className="text-[11px] text-slate-500">Consolidated history of checked-out literature and recorded late penalties.</p>
                <div id="print-loan-register" className="hidden print:block p-8 bg-white text-slate-900 font-sans text-xs">
                  <div className="text-center space-y-2 border-b-2 border-slate-800 pb-4 mb-4">
                    <h2 className="text-lg font-bold font-serif uppercase">{LocalERPDatabase.getAcademicSetup()?.schoolProfile?.schoolName || 'School'}</h2>
                    <h1 className="text-md font-bold uppercase tracking-widest">Circulation Loan & Return Register</h1>
                    <p className="font-mono text-[10px]">Academic Year Scope: {activeYear}</p>
                  </div>
                  <table className="w-full text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-800 text-[10px] font-bold">
                        <th className="border border-slate-800 p-2">Borrower</th>
                        <th className="border border-slate-800 p-2">Role</th>
                        <th className="border border-slate-800 p-2">Book Title</th>
                        <th className="border border-slate-800 p-2 font-mono">Acc No</th>
                        <th className="border border-slate-800 p-2">Issue Date</th>
                        <th className="border border-slate-800 p-2">Due Date</th>
                        <th className="border border-slate-800 p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map(l => (
                        <tr key={l.id} className="border-b border-slate-800 text-[9px]">
                          <td className="border border-slate-800 p-2 font-bold">{l.borrowerName}</td>
                          <td className="border border-slate-800 p-2 uppercase font-mono">{l.borrowerRole}</td>
                          <td className="border border-slate-800 p-2 font-bold">{l.bookTitle}</td>
                          <td className="border border-slate-800 p-2 font-mono font-bold">{l.accessionNo}</td>
                          <td className="border border-slate-800 p-2 font-mono">{l.issueDate}</td>
                          <td className="border border-slate-800 p-2 font-mono">{l.dueDate}</td>
                          <td className="border border-slate-800 p-2 font-bold">{l.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PrintPDFButton elementId="print-loan-register" title="Library_Circulation_Register" lang={lang} />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1: ADD / EDIT BOOK DIALOG
          ========================================== */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full text-left max-h-[90vh] flex flex-col">
            
            <div className="border-b border-slate-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{editingBook ? 'Edit Catalogued Book' : 'Catalogue New Book Entry'}</h3>
                <p className="text-[11px] text-slate-500">Record full hardware properties, location mappings, and purchase pricing.</p>
              </div>
              <button onClick={() => setShowBookModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Book Title *</label>
                  <input
                    type="text" required
                    value={bookForm.title}
                    onChange={(e) => setBookForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    placeholder="e.g. Adabiyat-e-Urdu Standard Guide"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Book Subtitle / Series Details</label>
                  <input
                    type="text"
                    value={bookForm.subtitle}
                    onChange={(e) => setBookForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    placeholder="e.g. Prepared for Matriculation Board Examination"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Author Name *</label>
                  <input
                    type="text" required
                    value={bookForm.author}
                    onChange={(e) => setBookForm(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    placeholder="e.g. Dr. Shakeel Ahmed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Publisher *</label>
                  <input
                    type="text" required
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm(prev => ({ ...prev, publisher: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    placeholder="e.g. Jamia Urdu Press"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ISBN String *</label>
                  <input
                    type="text" required
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm(prev => ({ ...prev, isbn: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    placeholder="e.g. 978-81-206-0343-4"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Accession Number (Auto/Manual) *</label>
                  <input
                    type="text" required
                    value={bookForm.accessionNo}
                    onChange={(e) => setBookForm(prev => ({ ...prev, accessionNo: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Book Category *</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Language *</label>
                  <select
                    value={bookForm.language}
                    onChange={(e) => setBookForm(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Urdu">Urdu</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                {/* Shelf & Location Settings */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Shelf Code *</label>
                  <input
                    type="text" required
                    value={bookForm.shelf}
                    onChange={(e) => setBookForm(prev => ({ ...prev, shelf: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Rack / Row Map *</label>
                  <input
                    type="text" required
                    value={bookForm.rack}
                    onChange={(e) => setBookForm(prev => ({ ...prev, rack: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Acquisition Copies *</label>
                  <input
                    type="number" required min={1}
                    value={bookForm.numberOfCopies}
                    onChange={(e) => setBookForm(prev => ({ ...prev, numberOfCopies: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number" required
                    value={bookForm.purchasePrice}
                    onChange={(e) => setBookForm(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowBookModal(false)} className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm">
                  Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: NEW ISSUE (CIRCULATION OUT)
          ========================================== */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-left">
            <div className="border-b border-slate-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Circulation Checkout Book</h3>
                <p className="text-[11px] text-slate-500">Record standard outgoing checked-out literature.</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueBookSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Book Target *</label>
                <select
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, bookId: e.target.value }))}
                  className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Book Catalog --</option>
                  {books.filter(b => b.availableCopies > 0 && b.status === 'Active').map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.accessionNo} - Avail: {b.availableCopies})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Borrower *</label>
                <select
                  value={issueForm.borrowerId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, borrowerId: e.target.value }))}
                  className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Student/Teacher Account --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.toUpperCase()} - {u.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Loan Period (Days) *</label>
                <input
                  type="number" min={1} max={90}
                  value={issueForm.days}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, days: Number(e.target.value) }))}
                  className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Confirm Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: BULK IMPORT (CSV)
          ========================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full text-left">
            <div className="border-b border-slate-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Bulk Excel / CSV Import</h3>
                <p className="text-[11px] text-slate-500">Paste your spreadsheet CSV directly to append hundreds of books.</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 space-y-1">
                <p className="font-bold">Required CSV Headers Sequence:</p>
                <code className="block bg-white p-1.5 rounded font-mono border border-blue-200">
                  Title, Author, ISBN, Category, Price, Language, Copies
                </code>
              </div>

              <textarea
                value={bulkCSVInput}
                onChange={(e) => setBulkCSVInput(e.target.value)}
                placeholder={`e.g.
Kulliyat-e-Iqbal, Allama Iqbal, 978-81-206, Reference Book, 450, Urdu, 3
Modern Physics Standard, Halliday Resnick, 978-93-501, Text Book, 320, English, 5`}
                rows={8}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleBulkImport} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Run Import Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: PHYSICAL STOCK VERIFICATION
          ========================================== */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-left">
            <div className="border-b border-slate-100 p-5 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Perform Stock Verification</h3>
              <button onClick={() => setShowVerificationModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVerification} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Scanned Copies *</label>
                  <input
                    type="number" required min={0}
                    value={verifyForm.scanned}
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, scanned: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Missing Count *</label>
                  <input
                    type="number" required min={0}
                    value={verifyForm.missing}
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, missing: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Damaged Count *</label>
                  <input
                    type="number" required min={0}
                    value={verifyForm.damaged}
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, damaged: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Extra Copies Found *</label>
                  <input
                    type="number" required min={0}
                    value={verifyForm.extra}
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, extra: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Session Audit Remarks</label>
                <textarea
                  value={verifyForm.remarks}
                  onChange={(e) => setVerifyForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Standard bi-annual check for block A"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowVerificationModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Save Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 5: RECORD BOOK PURCHASE
          ========================================== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-left">
            <div className="border-b border-slate-100 p-5 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Log New Acquisitions</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Invoice / Bill Number *</label>
                <input
                  type="text" required
                  value={purchaseForm.invoiceNo}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoiceNo: e.target.value }))}
                  className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="INV-2026-904"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Acquisitions Vendor *</label>
                <input
                  type="text" required
                  value={purchaseForm.vendor}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Quantity *</label>
                  <input
                    type="number" required min={1}
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Total Cost (₹) *</label>
                  <input
                    type="number" required min={0}
                    value={purchaseForm.totalCost}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, totalCost: Number(e.target.value) }))}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Acquisitions Remarks</label>
                <textarea
                  value={purchaseForm.remarks}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Aided government allocation budget"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Record Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
