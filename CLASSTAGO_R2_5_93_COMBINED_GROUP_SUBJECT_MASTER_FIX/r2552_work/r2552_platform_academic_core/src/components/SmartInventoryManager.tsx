import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Layers, MapPin, QrCode, Clipboard, ShieldAlert, 
  Settings, PenTool, Trash2, Edit, Plus, FileText, Search, 
  Printer, DollarSign, Calendar, Users, AlertTriangle, 
  CheckCircle, Hammer, RefreshCcw, Archive, ShoppingCart, 
  BarChart, ListFilter, Check, X, ArrowRightLeft, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { User, Language } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import PrintPDFButton from './PrintPDFButton';
import { requestActionConfirm } from '../lib/actionConfirm';

// ==========================================
// DOMAIN INTERFACES
// ==========================================
export interface Asset {
  id: string; // AST-YYYY-XXXX
  name: string;
  category: string;
  code: string;
  barcode: string;
  qrCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  quantity: number;
  unit: string; // Pcs, Sets, Boxes, Liters etc.
  purchaseDate: string;
  purchaseCost: number;
  supplierId: string;
  supplierName: string;
  warrantyStart: string;
  warrantyEnd: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Broken';
  status: 'In Store' | 'Issued' | 'Under Repair' | 'Written Off' | 'Auctioned';
  location: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedToRole?: string;
  remarks?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
}

export interface PurchaseOrder {
  id: string; // PO-XXXX
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  items: { name: string; category: string; qty: number; unitCost: number; total: number }[];
  totalAmount: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  deliveryStatus: 'Ordered' | 'Shipped' | 'Delivered' | 'Cancelled';
  invoiceNumber?: string;
  remarks?: string;
}

export interface AssetTransaction {
  id: string;
  assetId: string;
  assetName: string;
  type: 'Issue' | 'Return' | 'Transfer' | 'Damage' | 'Lost' | 'Adjustment';
  qty: number;
  date: string;
  originLocation: string;
  destLocation: string;
  actedById: string;
  actedByName: string;
  targetUserId?: string;
  targetUserName?: string;
  referenceNo?: string;
  remarks?: string;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetName: string;
  serviceDate: string;
  amcProvider?: string;
  problemDescription: string;
  repairDetails?: string;
  repairCost: number;
  nextServiceDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  vendorName: string;
  warrantyStatus: 'Covered' | 'Out of Warranty';
}

export interface DeadStockRecord {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  disposalType: 'Damaged' | 'Broken' | 'Obsolete' | 'Disposed' | 'Auctioned' | 'Write-Off';
  date: string;
  qty: number;
  recoveryValue: number; // Auction yield if any
  authorizedBy: string;
  remarks?: string;
}

export interface PhysicalAuditSession {
  id: string;
  auditDate: string;
  auditedBy: string;
  totalItemsScanned: number;
  matchedCount: number;
  mismatchCount: number;
  extraAssetsFound: number;
  missingAssetsCount: number;
  remarks: string;
}

// Default system values
const DEFAULT_CATEGORIES = [
  'Classroom Furniture', 'Office Furniture', 'Computers & Laptops', 
  'Printers & Scanners', 'Projectors & AV', 'CCTV & Security', 
  'Laboratory Equipment', 'Sports Materials', 'Library Furniture', 
  'Musical Instruments', 'Electrical Items & Fans', 'Science Lab Kit', 
  'Mathematics Lab Kit', 'Art & Craft Material', 'Examination Stationery', 
  'Cleaning Equipment'
];

const DEFAULT_LOCATIONS = [
  'Office', 'Headmaster Cabin', 'Staff Room', 'Library', 
  'Laboratory', 'Computer Lab', 'Science Lab', 'Classroom 1-12', 
  'Playground', 'Store Room'
];

// Barcode map and renderer
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

function BarcodeRenderer({ value }: { value: string }) {
  const code = `*${(value || 'NHS').toUpperCase()}*`;
  let stripes = '';
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP[' '];
    stripes += pattern + '0';
  }
  return (
    <svg width="100%" height="40" viewBox={`0 0 ${stripes.length} 40`} preserveAspectRatio="none" className="block">
      {stripes.split('').map((bit, idx) => {
        if (bit === '1') {
          return <rect key={idx} x={idx} y={0} width={1} height={30} fill="black" />;
        }
        return null;
      })}
    </svg>
  );
}

function QRCodeRenderer({ value }: { value: string }) {
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
// COMPONENT
// ==========================================
type InventoryWorkspaceTab = 'dashboard' | 'assets' | 'procurement' | 'transactions' | 'maintenance' | 'dead_stock' | 'audit' | 'reports';

const INVENTORY_FEATURE_TAB: Record<string, InventoryWorkspaceTab> = {
  'cl-inventory-dashboard': 'dashboard',
  'cl-inventory-asset-master': 'assets',
  'cl-inventory-procurement': 'procurement',
  'cl-inventory-stock-issues': 'transactions',
  'cl-inventory-repairs-amc': 'maintenance',
  'cl-inventory-dead-stock': 'dead_stock',
  'cl-inventory-stock-auditing': 'audit',
  'cl-inventory-register-reports': 'reports',
  'asset-inventory-overview': 'dashboard',
  'procurement-review': 'procurement',
  'asset-maintenance': 'maintenance',
  'stock-audit': 'audit',
  'writeoff-disposal-approval': 'dead_stock'
};

interface SmartInventoryManagerProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
  activeFeatureId?: string | null;
  focusedMode?: boolean;
  focusedTitle?: string;
}

export default function SmartInventoryManager({
  lang,
  user,
  onRefreshData,
  activeFeatureId = null,
  focusedMode = false,
  focusedTitle = 'Inventory & Assets'
}: SmartInventoryManagerProps) {
  const currentRole = user.role;

  // ----------------------------------------
  // CENTRAL LOCAL DATA STORAGE
  // ----------------------------------------
  const [activeTab, setActiveTab] = useState<InventoryWorkspaceTab>('dashboard');

  useEffect(() => {
    if (!activeFeatureId) return;
    const nextTab = INVENTORY_FEATURE_TAB[activeFeatureId];
    if (nextTab) setActiveTab(nextTab);
  }, [activeFeatureId]);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockRecord[]>([]);
  const [audits, setAudits] = useState<PhysicalAuditSession[]>([]);
  
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [customLocations, setCustomLocations] = useState<string[]>(DEFAULT_LOCATIONS);

  // Dynamic system entities for assignments
  const allUsers = useMemo(() => LocalERPDatabase.getUsers(), []);
  const allStaff = useMemo(() => allUsers.filter(u => u.role !== 'student'), [allUsers]);

  const activeYear = useMemo(() => {
    return LocalERPDatabase.getAcademicSetup().academicYears.find(y => y.isActive)?.year || '2026-27';
  }, []);

  // Modal forms states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showDeadModal, setShowDeadModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // ----------------------------------------
  // INITIALIZATION & HYDRATION
  // ----------------------------------------
  useEffect(() => {
    // 1. Assets Master
    const storedAssets = localStorage.getItem('nhs_inventory_assets');
    if (storedAssets) {
      setAssets(JSON.parse(storedAssets));
    }  else {
      setAssets([]);
    }

    // 2. Suppliers
    const storedSuppliers = localStorage.getItem('nhs_inventory_suppliers');
    if (storedSuppliers) {
      setSuppliers(JSON.parse(storedSuppliers));
    }  else {
      setSuppliers([]);
    }

    // 3. Purchase Orders
    const storedPOs = localStorage.getItem('nhs_inventory_pos');
    if (storedPOs) {
      setPurchaseOrders(JSON.parse(storedPOs));
    }  else {
      setPurchaseOrders([]);
    }

    // 4. Transactions
    const storedTxs = localStorage.getItem('nhs_inventory_transactions');
    if (storedTxs) {
      setTransactions(JSON.parse(storedTxs));
    }  else {
      setTransactions([]);
    }

    // 5. Maintenance
    const storedMaint = localStorage.getItem('nhs_inventory_maintenance');
    if (storedMaint) {
      setMaintenance(JSON.parse(storedMaint));
    }  else {
      setMaintenance([]);
    }

    // 6. Dead Stock
    const storedDead = localStorage.getItem('nhs_inventory_dead');
    if (storedDead) setDeadStock(JSON.parse(storedDead));

    // 7. Audits
    const storedAudits = localStorage.getItem('nhs_inventory_audits');
    if (storedAudits) setAudits(JSON.parse(storedAudits));
    
  }, []);

  // ----------------------------------------
  // STORAGE PROPAGATORS
  // ----------------------------------------
  const saveAssets = (list: Asset[]) => {
    setAssets(list);
    localStorage.setItem('nhs_inventory_assets', JSON.stringify(list));
  };

  const saveSuppliers = (list: Supplier[]) => {
    setSuppliers(list);
    localStorage.setItem('nhs_inventory_suppliers', JSON.stringify(list));
  };

  const savePOs = (list: PurchaseOrder[]) => {
    setPurchaseOrders(list);
    localStorage.setItem('nhs_inventory_pos', JSON.stringify(list));
  };

  const saveTransactions = (list: AssetTransaction[]) => {
    setTransactions(list);
    localStorage.setItem('nhs_inventory_transactions', JSON.stringify(list));
  };

  const saveMaintenance = (list: MaintenanceRecord[]) => {
    setMaintenance(list);
    localStorage.setItem('nhs_inventory_maintenance', JSON.stringify(list));
  };

  const saveDeadStock = (list: DeadStockRecord[]) => {
    setDeadStock(list);
    localStorage.setItem('nhs_inventory_dead', JSON.stringify(list));
  };

  const triggerAuditLog = (action: string, module: string, details: string) => {
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, action, module, details);
  };

  // ----------------------------------------
  // ASSET MASTER FORM LOGIC
  // ----------------------------------------
  const [assetForm, setAssetForm] = useState({
    name: '', category: 'Classroom Furniture', code: '', brand: '', model: '',
    serialNumber: '', quantity: 1, unit: 'Pcs', purchaseCost: 0, supplierId: '',
    warrantyYears: 1, condition: 'Excellent' as any, status: 'In Store' as any, location: 'Store Room',
    remarks: ''
  });

  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    const nextCodeNo = `AST-CODE-${String(assets.length + 1).padStart(4, '0')}`;
    setAssetForm({
      name: '', category: 'Classroom Furniture', code: nextCodeNo, brand: '', model: '',
      serialNumber: '', quantity: 1, unit: 'Pcs', purchaseCost: 0, supplierId: suppliers[0]?.id || '',
      warrantyYears: 1, condition: 'Excellent', status: 'In Store', location: 'Store Room',
      remarks: ''
    });
    setShowAssetModal(true);
  };

  const handleOpenEditAsset = (ast: Asset) => {
    setEditingAsset(ast);
    setAssetForm({
      name: ast.name, category: ast.category, code: ast.code, brand: ast.brand, model: ast.model,
      serialNumber: ast.serialNumber, quantity: ast.quantity, unit: ast.unit, purchaseCost: ast.purchaseCost,
      supplierId: ast.supplierId, warrantyYears: 1, condition: ast.condition, status: ast.status,
      location: ast.location, remarks: ast.remarks || ''
    });
    setShowAssetModal(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name.trim()) return;

    const supplierObj = suppliers.find(s => s.id === assetForm.supplierId) || suppliers[0] || { id: 'manual', name: 'Direct Purchase' };

    if (editingAsset) {
      const updated = assets.map(a => {
        if (a.id === editingAsset.id) {
          return {
            ...a,
            name: assetForm.name, category: assetForm.category, code: assetForm.code, brand: assetForm.brand,
            model: assetForm.model, serialNumber: assetForm.serialNumber, quantity: Number(assetForm.quantity),
            unit: assetForm.unit, purchaseCost: Number(assetForm.purchaseCost), supplierId: supplierObj.id,
            supplierName: supplierObj.name, condition: assetForm.condition, status: assetForm.status,
            location: assetForm.location, remarks: assetForm.remarks
          };
        }
        return a;
      });
      saveAssets(updated);
      triggerAuditLog('EDIT_ASSET', 'Asset Master', `Updated asset metadata: ${assetForm.name} (${editingAsset.id})`);
    } else {
      const autoId = `AST-${activeYear.replace(/[^A-Za-z0-9]/g, '')}-${String(assets.length + 1).padStart(4, '0')}`;
      const warrantyStart = new Date().toISOString().substring(0, 10);
      const warrantyEndObj = new Date();
      warrantyEndObj.setFullYear(warrantyEndObj.getFullYear() + Number(assetForm.warrantyYears));
      const warrantyEnd = warrantyEndObj.toISOString().substring(0, 10);

      const newAsset: Asset = {
        id: autoId, name: assetForm.name, category: assetForm.category, code: assetForm.code,
        barcode: autoId.replace(/[^A-Za-z0-9]/g, ''), qrCode: autoId, brand: assetForm.brand,
        model: assetForm.model, serialNumber: assetForm.serialNumber, quantity: Number(assetForm.quantity),
        unit: assetForm.unit, purchaseDate: new Date().toISOString().substring(0, 10),
        purchaseCost: Number(assetForm.purchaseCost), supplierId: supplierObj.id, supplierName: supplierObj.name,
        warrantyStart, warrantyEnd, condition: assetForm.condition, status: assetForm.status,
        location: assetForm.location, remarks: assetForm.remarks
      };
      
      saveAssets([...assets, newAsset]);
      triggerAuditLog('ADD_ASSET', 'Asset Master', `Cataloged new inventory item: ${newAsset.name}`);
    }
    setShowAssetModal(false);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (await requestActionConfirm({ title: 'Delete asset record?', message: `Are you absolutely sure you want to delete asset "${name}" from the physical registers?`, confirmLabel: 'Delete Asset', tone: 'danger' })) {
      const updated = assets.filter(a => a.id !== id);
      saveAssets(updated);
      triggerAuditLog('DELETE_ASSET', 'Asset Master', `Deleted asset record: ${name} (${id})`);
    }
  };

  // ----------------------------------------
  // PROCUREMENT & PO FORM LOGIC
  // ----------------------------------------
  const [poForm, setPoForm] = useState({
    supplierId: '', itemName: '', itemCategory: 'Classroom Furniture', qty: 1, unitCost: 100, remarks: ''
  });

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId || !poForm.itemName.trim()) return;

    const supplierObj = suppliers.find(s => s.id === poForm.supplierId);
    if (!supplierObj) return;

    const qty = Number(poForm.qty);
    const cost = Number(poForm.unitCost);
    const total = qty * cost;

    const autoPoNo = `PO-${activeYear}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      id: autoPoNo,
      poNumber: autoPoNo,
      supplierId: supplierObj.id,
      supplierName: supplierObj.name,
      orderDate: new Date().toISOString().substring(0, 10),
      items: [{ name: poForm.itemName, category: poForm.itemCategory, qty, unitCost: cost, total }],
      totalAmount: total,
      paymentStatus: 'Pending',
      deliveryStatus: 'Ordered',
      remarks: poForm.remarks
    };

    savePOs([newPO, ...purchaseOrders]);
    triggerAuditLog('CREATE_PO', 'Procurement', `Generated purchase order ${autoPoNo} for ${supplierObj.name}`);
    
    // INTEGRATION: Post Voucher as pending payment to General Accounting Ledger
    postInventoryPOMovementToAccounts(newPO);
    
    setShowPOModal(false);
  };

  const handleUpdatePODelivery = (poId: string, status: 'Shipped' | 'Delivered' | 'Cancelled') => {
    const matched = purchaseOrders.find(p => p.id === poId);
    if (!matched) return;

    const updated = purchaseOrders.map(p => {
      if (p.id === poId) {
        return { ...p, deliveryStatus: status };
      }
      return p;
    });
    savePOs(updated);
    triggerAuditLog('UPDATE_PO_DELIVERY', 'Procurement', `Updated PO ${poId} delivery status to ${status}`);

    // If delivered, automatically catalog items into Asset Master!
    if (status === 'Delivered') {
      const addedAssets: Asset[] = [];
      matched.items.forEach((item, index) => {
        const autoId = `AST-${activeYear.replace(/[^A-Za-z0-9]/g, '')}-${String(assets.length + addedAssets.length + 1).padStart(4, '0')}`;
        addedAssets.push({
          id: autoId, name: item.name, category: item.category, code: `AST-AUTO-${Date.now()}_${index}`,
          barcode: autoId.replace(/[^A-Za-z0-9]/g, ''), qrCode: autoId, brand: 'Procured', model: 'PO Ordered',
          serialNumber: `S/N-${Date.now().toString().substring(6)}-${index}`, quantity: item.qty, unit: 'Pcs',
          purchaseDate: new Date().toISOString().substring(0, 10), purchaseCost: item.unitCost,
          supplierId: matched.supplierId, supplierName: matched.supplierName,
          warrantyStart: new Date().toISOString().substring(0, 10),
          warrantyEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10),
          condition: 'Excellent', status: 'In Store', location: 'Store Room', remarks: `Auto-cataloged via Purchase Order ${matched.poNumber}`
        });
      });

      saveAssets([...assets, ...addedAssets]);
      triggerAuditLog('AUTO_CATALOG_PO', 'Asset Master', `Auto-cataloged ${addedAssets.length} asset items from PO ${matched.poNumber}`);
      alert(`PO Items processed! ${addedAssets.length} asset(s) automatically cataloged into Store Room successfully.`);
    }
  };

  const postInventoryPOMovementToAccounts = (po: PurchaseOrder) => {
    try {
      const storedVouchers = localStorage.getItem('nhs_erp_vouchers') || '[]';
      const vouchersList = JSON.parse(storedVouchers);

      // Create Payment / Expense debit voucher for the asset procurement
      const newVoucher = {
        id: `vou_inv_${Date.now()}`,
        voucherNo: `VOU-PAY-INV-${po.id}`,
        type: 'Payment',
        date: new Date().toISOString().substring(0, 10),
        financialYear: activeYear,
        debitAccountId: 'acc_exp_stationery', // fallback or general utility expense account
        creditAccountId: 'acc_cash',
        amount: po.totalAmount,
        narration: `Procurement Payment PO: ${po.poNumber} - Vendor: ${po.supplierName}`,
        paymentMode: 'Cash',
        reconciliationStatus: 'Pending',
        approvalStatus: 'Approved',
        createdBy: user.name,
        createdAt: new Date().toISOString(),
        isCancelled: false
      };

      vouchersList.unshift(newVoucher);
      localStorage.setItem('nhs_erp_vouchers', JSON.stringify(vouchersList));
    } catch (e) {
      console.error('Error posting procurement PO to general ledger:', e);
    }
  };

  // ----------------------------------------
  // ISSUE & RETURN LOGIC (ASSET TRANSACTION)
  // ----------------------------------------
  const [txForm, setTxForm] = useState({
    assetId: '', type: 'Issue' as 'Issue' | 'Return' | 'Transfer' | 'Damage' | 'Lost',
    qty: 1, destLocation: 'Office', targetUserId: '', remarks: ''
  });

  const handleProcessTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.assetId) return;

    const matchedAsset = assets.find(a => a.id === txForm.assetId);
    if (!matchedAsset) return;

    const transferQty = Number(txForm.qty);
    if (txForm.type === 'Issue' && matchedAsset.quantity < transferQty) {
      alert('Error: Insufficient stock in store to issue.');
      return;
    }

    const actedUser = allUsers.find(u => u.id === txForm.targetUserId) || { id: 'general', name: 'General/Lab Room', role: 'system' };

    // Update quantities or location in Asset record
    const updatedAssets = assets.map(a => {
      if (a.id === matchedAsset.id) {
        if (txForm.type === 'Issue') {
          return {
            ...a,
            quantity: Math.max(0, a.quantity - transferQty),
            status: 'Issued' as const,
            location: txForm.destLocation,
            assignedToId: actedUser.id,
            assignedToName: actedUser.name,
            assignedToRole: actedUser.role
          };
        } else if (txForm.type === 'Return') {
          return {
            ...a,
            quantity: a.quantity + transferQty,
            status: 'In Store' as const,
            location: 'Store Room',
            assignedToId: undefined,
            assignedToName: undefined,
            assignedToRole: undefined
          };
        } else if (txForm.type === 'Transfer') {
          return {
            ...a,
            location: txForm.destLocation
          };
        } else if (txForm.type === 'Damage') {
          return {
            ...a,
            condition: 'Damaged' as const,
            status: 'Under Repair' as const
          };
        } else if (txForm.type === 'Lost') {
          return {
            ...a,
            quantity: Math.max(0, a.quantity - transferQty),
            condition: 'Broken' as const,
            status: 'Written Off' as const
          };
        }
      }
      return a;
    });

    const newTx: AssetTransaction = {
      id: `tx_${Date.now()}`,
      assetId: matchedAsset.id,
      assetName: matchedAsset.name,
      type: txForm.type,
      qty: transferQty,
      date: new Date().toISOString().substring(0, 10),
      originLocation: matchedAsset.location,
      destLocation: txForm.destLocation,
      actedById: user.id,
      actedByName: user.name,
      targetUserId: actedUser.id,
      targetUserName: actedUser.name,
      remarks: txForm.remarks
    };

    saveAssets(updatedAssets);
    saveTransactions([newTx, ...transactions]);
    triggerAuditLog(`INVENTORY_${txForm.type.toUpperCase()}`, 'Asset Movement', `Processed asset ${txForm.type}: ${matchedAsset.name}`);
    setShowTxModal(false);

    // Dynamic warning alert on notices for Damaged or Lost assets
    if (txForm.type === 'Damage' || txForm.type === 'Lost') {
      const notice: any = {
        id: `inv_alert_${Date.now()}`,
        title: `Asset Alert: ${matchedAsset.name} Marked as ${txForm.type}`,
        titleUr: `اثاثہ الرٹ: ${matchedAsset.name}`,
        titleHi: `संपत्ति चेतावनी: ${matchedAsset.name}`,
        content: `Inventory Alert: ${matchedAsset.name} at location ${matchedAsset.location} was reported as ${txForm.type} by ${user.name}. Action required.`,
        date: new Date().toISOString().substring(0, 10),
        category: 'Urgent',
        targetRoles: ['headmaster', 'clerk'],
        publishedBy: 'Digital Inventory Desk'
      };
      LocalERPDatabase.saveNotice(notice, user);
    }
  };

  // ----------------------------------------
  // MAINTENANCE LOGIC
  // ----------------------------------------
  const [maintForm, setMaintForm] = useState({
    assetId: '', problemDescription: '', repairCost: 0, vendorName: '', amcProvider: ''
  });

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm.assetId || !maintForm.problemDescription.trim()) return;

    const matched = assets.find(a => a.id === maintForm.assetId);
    if (!matched) return;

    const newRec: MaintenanceRecord = {
      id: `maint_${Date.now()}`,
      assetId: matched.id,
      assetName: matched.name,
      serviceDate: new Date().toISOString().substring(0, 10),
      problemDescription: maintForm.problemDescription,
      repairCost: Number(maintForm.repairCost),
      status: 'Pending',
      vendorName: maintForm.vendorName || 'Generic Maintenance Vendor',
      warrantyStatus: new Date() < new Date(matched.warrantyEnd) ? 'Covered' : 'Out of Warranty',
      amcProvider: maintForm.amcProvider
    };

    // Mark asset status as under repair
    const updatedAssets = assets.map(a => {
      if (a.id === matched.id) {
        return { ...a, status: 'Under Repair' as const };
      }
      return a;
    });

    saveAssets(updatedAssets);
    saveMaintenance([newRec, ...maintenance]);
    triggerAuditLog('ASSET_REPAIR_LOG', 'Maintenance', `Reported asset repair request: ${matched.name}`);
    setShowMaintenanceModal(false);
  };

  const handleCompleteRepair = (id: string, cost: number) => {
    const record = maintenance.find(m => m.id === id);
    if (!record) return;

    const updatedMaint = maintenance.map(m => {
      if (m.id === id) {
        return { ...m, status: 'Completed' as const, repairCost: cost, nextServiceDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().substring(0, 10) };
      }
      return m;
    });

    // Reset asset status to Store or Active
    const updatedAssets = assets.map(a => {
      if (a.id === record.assetId) {
        return { ...a, status: 'In Store' as const, condition: 'Good' as const };
      }
      return a;
    });

    saveAssets(updatedAssets);
    saveMaintenance(updatedMaint);
    triggerAuditLog('ASSET_REPAIR_COMPLETE', 'Maintenance', `Completed repair on ${record.assetName}. Cost ₹${cost}`);
  };

  // ----------------------------------------
  // DEAD STOCK / WRITE OFF LOGIC
  // ----------------------------------------
  const [deadForm, setDeadForm] = useState({
    assetId: '', disposalType: 'Damaged' as any, qty: 1, recoveryValue: 0, remarks: ''
  });

  const handleAddDeadStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadForm.assetId) return;

    const matched = assets.find(a => a.id === deadForm.assetId);
    if (!matched) return;

    const dQty = Number(deadForm.qty);
    const newDead: DeadStockRecord = {
      id: `dead_${Date.now()}`,
      assetId: matched.id,
      assetName: matched.name,
      category: matched.category,
      disposalType: deadForm.disposalType,
      date: new Date().toISOString().substring(0, 10),
      qty: dQty,
      recoveryValue: Number(deadForm.recoveryValue),
      authorizedBy: user.name,
      remarks: deadForm.remarks
    };

    // Remove or decrement from active asset list
    const updatedAssets = assets.map(a => {
      if (a.id === matched.id) {
        const remainingQty = Math.max(0, a.quantity - dQty);
        return {
          ...a,
          quantity: remainingQty,
          status: remainingQty === 0 ? 'Written Off' as const : a.status,
          condition: 'Broken' as const
        };
      }
      return a;
    });

    saveAssets(updatedAssets);
    saveDeadStock([newDead, ...deadStock]);
    triggerAuditLog('INVENTORY_DEADSTOCK', 'Dead Stock', `Marked ${dQty} unit(s) of ${matched.name} as Dead Stock / Write-Off.`);
    setShowDeadModal(false);

    // INTEGRATION: If recovery value > 0, post as dynamic credit receipt to General Accounting Ledger
    if (newDead.recoveryValue > 0) {
      postDeadStockRecoveryReceipt(newDead);
    }
  };

  const postDeadStockRecoveryReceipt = (ds: DeadStockRecord) => {
    try {
      const storedVouchers = localStorage.getItem('nhs_erp_vouchers') || '[]';
      const vouchersList = JSON.parse(storedVouchers);

      const newVoucher = {
        id: `vou_rec_inv_${Date.now()}`,
        voucherNo: `VOU-REC-DS-${Date.now().toString().substring(8)}`,
        type: 'Receipt',
        date: new Date().toISOString().substring(0, 10),
        financialYear: activeYear,
        debitAccountId: 'acc_cash',
        creditAccountId: 'acc_inc_donations', // catalog as alumni/donation or miscellaneous salvage income
        amount: ds.recoveryValue,
        narration: `Dead Stock Salvage Auction/Write-Off Recovery: ${ds.assetName} (${ds.disposalType})`,
        paymentMode: 'Cash',
        reconciliationStatus: 'Pending',
        approvalStatus: 'Approved',
        createdBy: user.name,
        createdAt: new Date().toISOString(),
        isCancelled: false
      };

      vouchersList.unshift(newVoucher);
      localStorage.setItem('nhs_erp_vouchers', JSON.stringify(vouchersList));
    } catch (e) {
      console.error('Error posting salvage receipt to general ledger:', e);
    }
  };

  // ----------------------------------------
  // STOCK AUDIT VERIFICATION
  // ----------------------------------------
  const [auditForm, setAuditForm] = useState({
    scanned: 15, matched: 15, mismatch: 0, missing: 0, extra: 0, remarks: ''
  });

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAudit: PhysicalAuditSession = {
      id: `audit_${Date.now()}`,
      auditDate: new Date().toISOString().substring(0, 10),
      auditedBy: user.name,
      totalItemsScanned: Number(auditForm.scanned),
      matchedCount: Number(auditForm.matched),
      mismatchCount: Number(auditForm.mismatch),
      extraAssetsFound: Number(auditForm.extra),
      missingAssetsCount: Number(auditForm.missing),
      remarks: auditForm.remarks
    };

    const updated = [newAudit, ...audits];
    setAudits(updated);
    localStorage.setItem('nhs_inventory_audits', JSON.stringify(updated));
    triggerAuditLog('PHYSICAL_AUDIT_VERIFY', 'Inventory Audit', `Conducted stock physical verification scan`);
    setShowAuditModal(false);
  };

  // ----------------------------------------
  // SEARCH & FILTERED RESULTS
  // ----------------------------------------
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = 
        a?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assignedToName && a.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = filterCategory === 'All' || a.category === filterCategory;
      const matchesLoc = filterLocation === 'All' || a.location === filterLocation;
      const matchesStat = filterStatus === 'All' || a.status === filterStatus;

      return matchesSearch && matchesCat && matchesLoc && matchesStat;
    });
  }, [assets, searchQuery, filterCategory, filterLocation, filterStatus]);

  // Dashboard Stats calculations
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const totalQty = assets.reduce((acc, a) => acc + a.quantity, 0);
    const totalValue = assets.reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0);
    const underRepair = assets.filter(a => a.status === 'Under Repair').length;
    const writtenOff = deadStock.reduce((acc, d) => acc + d.qty, 0);
    const lowStock = assets.filter(a => a.quantity <= 2).length;

    // Check warranties expiring in next 30 days
    const today = new Date();
    const warrantyExpiring = assets.filter(a => {
      const exp = new Date(a.warrantyEnd);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    return { totalAssets, totalQty, totalValue, underRepair, writtenOff, lowStock, warrantyExpiring };
  }, [assets, deadStock]);

  // Monthly stats chart data
  const chartData = useMemo(() => {
    return [
      { name: 'Classroom', Value: assets.filter(a => a.category.includes('Classroom')).reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0) },
      { name: 'Computers', Value: assets.filter(a => a.category.includes('Computer')).reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0) },
      { name: 'Lab Equip', Value: assets.filter(a => a.category.includes('Lab')).reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0) },
      { name: 'Office', Value: assets.filter(a => a.category.includes('Office')).reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0) },
      { name: 'AV Goods', Value: assets.filter(a => a.category.includes('AV')).reduce((acc, a) => acc + (a.purchaseCost * a.quantity), 0) },
    ];
  }, [assets]);

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight">{focusedMode ? focusedTitle : 'NHS Inventory & Asset Management'}</h2>
            <p className="text-xs text-slate-500 font-mono">Academic Session Cycle: {activeYear}</p>
          </div>
        </div>

        {/* Global tab switches for Staff */}
        {['clerk', 'headmaster'].includes(currentRole) && !focusedMode && !activeFeatureId && (
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layers },
              { id: 'assets', label: 'Asset Master', icon: Package },
              { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
              { id: 'transactions', label: 'Stock Issues', icon: ArrowRightLeft },
              { id: 'maintenance', label: 'Repairs & AMC', icon: Hammer },
              { id: 'dead_stock', label: 'Dead Stock', icon: Archive },
              { id: 'audit', label: 'Stock Auditing', icon: ShieldCheck },
              { id: 'reports', label: 'Register Reports', icon: FileText }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
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

        {/* Simplified screen for Teachers */}
        {currentRole === 'teacher' && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${activeTab === 'assets' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
            >
              Browse School Inventory
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
            >
              My Issued Assets & Transfers
            </button>
          </div>
        )}
      </div>

      {/* ==========================================
          TAB 1: ANALYTICS DASHBOARD
          ========================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Registered Assets</span>
              <p className="text-2xl font-bold font-mono text-slate-800">{stats.totalAssets}</p>
              <span className="text-[10px] text-slate-500">Volume: {stats.totalQty} total units</span>
            </div>
            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Total Stock Valuation</span>
              <p className="text-2xl font-bold font-mono text-emerald-700">₹{stats.totalValue.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600">Invested physical assets</span>
            </div>
            <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Active Service AMC</span>
              <p className="text-2xl font-bold font-mono text-blue-700">{stats.underRepair}</p>
              <span className="text-[10px] text-blue-500">Assets under active repair</span>
            </div>
            <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Expired / Dead Stock</span>
              <p className="text-2xl font-bold font-mono text-rose-700">{stats.writtenOff}</p>
              <span className="text-[10px] text-rose-600">Total units written-off</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Category Valuation Chart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Asset Category Valuation Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Value" name="Total Asset Value (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Status Auditing Shortcuts */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-left">
              <h3 className="font-bold text-sm text-slate-800">Urgent Store Notifications</h3>
              <div className="divide-y divide-slate-100">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Low Stock Warnings (≤ 2 units)</span>
                  <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold font-mono rounded-full">{stats.lowStock}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Warranties Expiring in 30 Days</span>
                  <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold font-mono rounded-full">{stats.warrantyExpiring}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Recent Physical Audits Logged</span>
                  <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold font-mono rounded-full">{audits.length}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Purchase Orders (Pending Delivery)</span>
                  <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold font-mono rounded-full">
                    {purchaseOrders.filter(p => p.deliveryStatus !== 'Delivered').length}
                  </span>
                </div>
              </div>

              {/* Configure categories settings */}
              {user.role === 'headmaster' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-4">
                  <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Master Custom Settings</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newCat = prompt('Enter name of new Custom Asset Category:');
                        if (newCat && !customCategories.includes(newCat)) {
                          setCustomCategories([...customCategories, newCat]);
                        }
                      }}
                      className="flex-1 py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      + Category
                    </button>
                    <button 
                      onClick={() => {
                        const newLoc = prompt('Enter name of new School Asset Location:');
                        if (newLoc && !customLocations.includes(newLoc)) {
                          setCustomLocations([...customLocations, newLoc]);
                        }
                      }}
                      className="flex-1 py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      + Location
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: ASSET MASTER CATALOGUE
          ========================================== */}
      {activeTab === 'assets' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* Filters & Actions bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Asset Name, Brand, Serial Number, Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Categories</option>
                  {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Locations</option>
                  {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Store">In Store</option>
                  <option value="Issued">Issued</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Written Off">Written Off</option>
                </select>
              </div>

              {['clerk', 'headmaster'].includes(currentRole) && (
                <button
                  onClick={handleOpenAddAsset}
                  className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Asset</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid Layout of Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map(ast => (
              <div key={ast.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                        {ast.category}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{ast.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {ast.id} | Code: {ast.code}</p>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded-full border ${
                      ast.status === 'In Store' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                      ast.status === 'Issued' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                      ast.status === 'Under Repair' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                      'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>
                      {ast.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-b border-slate-100 py-3 text-xs font-medium text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Brand / Model</span>
                      <span className="text-slate-800 font-bold">{ast.brand} {ast.model}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Location / Assigned</span>
                      <span className="text-indigo-600 font-bold">{ast.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Quantity Stock</span>
                      <span className="text-slate-800 font-bold font-mono">{ast.quantity} {ast.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Purchase Value</span>
                      <span className="text-slate-800 font-bold font-mono">₹{(ast.purchaseCost * ast.quantity).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* QR & Barcode Displays */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <div className="w-2/3 pr-2">
                      <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Asset Barcode</p>
                      <BarcodeRenderer value={ast.barcode} />
                      <span className="text-[8px] font-mono text-slate-500 block text-center mt-1">{ast.barcode}</span>
                    </div>
                    <div className="w-1/3 flex flex-col items-center border-l border-slate-200 pl-2">
                      <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Asset QR</p>
                      <QRCodeRenderer value={ast.qrCode} />
                    </div>
                  </div>
                </div>

                {/* Footer Controls for Staff */}
                {['clerk', 'headmaster'].includes(currentRole) && (
                  <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">Supplier: {ast.supplierName}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditAsset(ast)}
                        className="p-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                        title="Edit Asset"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => handleDeleteAsset(ast.id, ast.name)}
                        className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: PROCUREMENT & PURCHASE ORDERS
          ========================================== */}
      {activeTab === 'procurement' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Purchase Order Generator */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <span>Create Purchase Order</span>
              </h3>

              <form onSubmit={handleCreatePO} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Select Registered Supplier</label>
                  <select
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.contactPerson})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Item Title / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Beakers Set"
                    value={poForm.itemName}
                    onChange={(e) => setPoForm({ ...poForm, itemName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Category</label>
                    <select
                      value={poForm.itemCategory}
                      onChange={(e) => setPoForm({ ...poForm, itemCategory: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Quantity</label>
                    <input
                      type="number"
                      value={poForm.qty}
                      onChange={(e) => setPoForm({ ...poForm, qty: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={poForm.unitCost}
                    onChange={(e) => setPoForm({ ...poForm, unitCost: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Procurement Remarks</label>
                  <textarea
                    placeholder="Enter details, requirements..."
                    value={poForm.remarks}
                    onChange={(e) => setPoForm({ ...poForm, remarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer text-center"
                >
                  Generate Purchase Voucher PO
                </button>
              </form>
            </div>

            {/* Procurement Ledger */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Procurement Ledger Records</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Vendor Supplier</th>
                      <th className="p-3">Items Ordered</th>
                      <th className="p-3">Total Cost</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold font-mono text-indigo-600">{po.poNumber}</td>
                        <td className="p-3 font-semibold">{po.supplierName}</td>
                        <td className="p-3">
                          {po.items.map((it, idx) => (
                            <div key={idx} className="font-mono">
                              {it.name} (x{it.qty} {it.qty > 1 ? 'pcs' : 'pc'})
                            </div>
                          ))}
                        </td>
                        <td className="p-3 font-bold font-mono">₹{po.totalAmount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                            po.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {po.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          {po.deliveryStatus !== 'Delivered' ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleUpdatePODelivery(po.id, 'Delivered')}
                                className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-md hover:bg-emerald-700 cursor-pointer"
                              >
                                Delivered
                              </button>
                              <button
                                onClick={() => handleUpdatePODelivery(po.id, 'Cancelled')}
                                className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Delivered</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: STOCK TRANSACTION LOGS (ISSUE/RETURN)
          ========================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Desk issue tool */}
            {['clerk', 'headmaster'].includes(currentRole) && (
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Asset Issue Desk</h3>
                
                <form onSubmit={handleProcessTransaction} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Select Physical Asset</label>
                    <select
                      value={txForm.assetId}
                      onChange={(e) => setTxForm({ ...txForm, assetId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      required
                    >
                      <option value="">-- Select Asset --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} (In Store: {a.quantity} {a.unit})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Action Type</label>
                      <select
                        value={txForm.type}
                        onChange={(e) => setTxForm({ ...txForm, type: e.target.value as any })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      >
                        <option value="Issue">Issue Asset</option>
                        <option value="Return">Receive Return</option>
                        <option value="Transfer">Inter-room Transfer</option>
                        <option value="Damage">Record Damaged</option>
                        <option value="Lost">Record Lost</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Quantity</label>
                      <input
                        type="number"
                        value={txForm.qty}
                        onChange={(e) => setTxForm({ ...txForm, qty: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Issue to (Staff Member)</label>
                    <select
                      value={txForm.targetUserId}
                      onChange={(e) => setTxForm({ ...txForm, targetUserId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="">-- Choose Assigned Staff --</option>
                      {allStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Destination Location</label>
                    <select
                      value={txForm.destLocation}
                      onChange={(e) => setTxForm({ ...txForm, destLocation: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Narration / Remarks</label>
                    <textarea
                      placeholder="Challan numbers, special authorization codes etc."
                      value={txForm.remarks}
                      onChange={(e) => setTxForm({ ...txForm, remarks: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-16"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer text-center animate-pulse"
                  >
                    Post Movement Voucher
                  </button>
                </form>
              </div>
            )}

            {/* Transaction audit registers */}
            <div className={`bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 ${['clerk', 'headmaster'].includes(currentRole) ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Voucher Movement History</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">Date</th>
                      <th className="p-3">Asset Title</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Transfer Route</th>
                      <th className="p-3">Responsible User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold font-mono text-slate-500">{tx.date}</td>
                        <td className="p-3 font-bold text-slate-800">{tx.assetName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                            tx.type === 'Issue' ? 'bg-blue-50 text-blue-700' :
                            tx.type === 'Return' ? 'bg-emerald-50 text-emerald-700' :
                            tx.type === 'Transfer' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono">{tx.qty}</td>
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span>{tx.originLocation}</span>
                            <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                            <span className="text-indigo-600">{tx.destLocation}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{tx.targetUserName || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400">Acted By: {tx.actedByName}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: MAINTENANCE & AMC RECORDS
          ========================================== */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Log service request */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Log Repair or AMC Check</h3>
              
              <form onSubmit={handleAddMaintenance} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Select Asset to Service</label>
                  <select
                    value={maintForm.assetId}
                    onChange={(e) => setMaintForm({ ...maintForm, assetId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} (Loc: {a.location})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Issue / Problem Description</label>
                  <textarea
                    placeholder="Provide details about the malfunction..."
                    value={maintForm.problemDescription}
                    onChange={(e) => setMaintForm({ ...maintForm, problemDescription: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Estimated Repair Cost (₹)</label>
                  <input
                    type="number"
                    value={maintForm.repairCost}
                    onChange={(e) => setMaintForm({ ...maintForm, repairCost: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Service Vendor Name</label>
                  <input
                    type="text"
                    placeholder="Name of AMC company or localized workshop"
                    value={maintForm.vendorName}
                    onChange={(e) => setMaintForm({ ...maintForm, vendorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer text-center"
                >
                  Post Repair Voucher
                </button>
              </form>
            </div>

            {/* Repair history ledger */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">School Service AMC Registers</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">Log Date</th>
                      <th className="p-3">Asset Description</th>
                      <th className="p-3">Defect Logged</th>
                      <th className="p-3">Vendor / Service Provider</th>
                      <th className="p-3">Warranty status</th>
                      <th className="p-3">Action Desk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold font-mono text-slate-500">{m.serviceDate}</td>
                        <td className="p-3 font-bold text-slate-800">{m.assetName}</td>
                        <td className="p-3 text-slate-600">{m.problemDescription}</td>
                        <td className="p-3 font-semibold">{m.vendorName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                            m.warrantyStatus === 'Covered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {m.warrantyStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          {m.status === 'Pending' || m.status === 'In Progress' ? (
                            <button
                              onClick={() => {
                                const cost = Number(prompt('Enter finalized service charge amount (₹):', m.repairCost));
                                handleCompleteRepair(m.id, cost);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Closed VOU</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 6: DEAD STOCK & DISPOSAL
          ========================================== */}
      {activeTab === 'dead_stock' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Add write off */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Record Salvage or Disposal</h3>
              
              <form onSubmit={handleAddDeadStock} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Select Asset to Write-Off</label>
                  <select
                    value={deadForm.assetId}
                    onChange={(e) => setDeadForm({ ...deadForm, assetId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} (Total Qty: {a.quantity})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Disposal Type</label>
                    <select
                      value={deadForm.disposalType}
                      onChange={(e) => setDeadForm({ ...deadForm, disposalType: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="Damaged">Damaged beyond repair</option>
                      <option value="Broken">Broken</option>
                      <option value="Obsolete">Obsolete Technology</option>
                      <option value="Disposed">Disposed / Scrapped</option>
                      <option value="Auctioned">Auctioned Salvage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Disposal Qty</label>
                    <input
                      type="number"
                      value={deadForm.qty}
                      onChange={(e) => setDeadForm({ ...deadForm, qty: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Salvage Auction Yield Value (₹)</label>
                  <input
                    type="number"
                    value={deadForm.recoveryValue}
                    onChange={(e) => setDeadForm({ ...deadForm, recoveryValue: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">If auctioned, recovery cash will post as general accounting ledger receipt.</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Disposal Details / Remarks</label>
                  <textarea
                    placeholder="Enter write-off board resolution date or disposal certificate details..."
                    value={deadForm.remarks}
                    onChange={(e) => setDeadForm({ ...deadForm, remarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 cursor-pointer text-center"
                >
                  Confirm Dead Stock Write-Off
                </button>
              </form>
            </div>

            {/* Dead stock ledger */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">School Dead Stock Ledger Register</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">Disposal Date</th>
                      <th className="p-3">Asset Description</th>
                      <th className="p-3">Disposal Reason</th>
                      <th className="p-3">Qty Disposed</th>
                      <th className="p-3">Salvage Recovery Receipt</th>
                      <th className="p-3">Authorized Signatory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deadStock.map(ds => (
                      <tr key={ds.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold font-mono text-slate-500">{ds.date}</td>
                        <td className="p-3 font-bold text-slate-800">{ds.assetName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                            {ds.disposalType}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono">{ds.qty}</td>
                        <td className="p-3 font-bold font-mono text-emerald-600">₹{ds.recoveryValue.toLocaleString()}</td>
                        <td className="p-3 font-semibold">{ds.authorizedBy}</td>
                      </tr>
                    ))}
                    {deadStock.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">No dead stock entries or scrapped assets logged in register.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 7: PHYSICAL VERIFICATION (AUDITING)
          ========================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Save audit scan */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Run Physical Stock Verification</h3>
              
              <form onSubmit={handleSaveAudit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Total Assets Scanned</label>
                  <input
                    type="number"
                    value={auditForm.scanned}
                    onChange={(e) => setAuditForm({ ...auditForm, scanned: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Matched Count</label>
                    <input
                      type="number"
                      value={auditForm.matched}
                      onChange={(e) => setAuditForm({ ...auditForm, matched: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Mismatch Count</label>
                    <input
                      type="number"
                      value={auditForm.mismatch}
                      onChange={(e) => setAuditForm({ ...auditForm, mismatch: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Missing Assets</label>
                    <input
                      type="number"
                      value={auditForm.missing}
                      onChange={(e) => setAuditForm({ ...auditForm, missing: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Extra Assets Found</label>
                    <input
                      type="number"
                      value={auditForm.extra}
                      onChange={(e) => setAuditForm({ ...auditForm, extra: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Verification Remarks / Audit Notes</label>
                  <textarea
                    placeholder="Provide details about missing assets, barcode tag damages, physical discrepancies..."
                    value={auditForm.remarks}
                    onChange={(e) => setAuditForm({ ...auditForm, remarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-24"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer text-center"
                >
                  Post Audited Verification Ledger
                </button>
              </form>
            </div>

            {/* Audit log list */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Physical Stock Verification Audit Sessions</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">Audit Date</th>
                      <th className="p-3">Auditor</th>
                      <th className="p-3">Scanned Items</th>
                      <th className="p-3">Matched</th>
                      <th className="p-3">Mismatched</th>
                      <th className="p-3 font-bold text-rose-600">Missing</th>
                      <th className="p-3">Remarks / Verification notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {audits.map(aud => (
                      <tr key={aud.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold font-mono text-slate-500">{aud.auditDate}</td>
                        <td className="p-3 font-bold text-slate-800">{aud.auditedBy}</td>
                        <td className="p-3 font-mono font-bold">{aud.totalItemsScanned}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-600">{aud.matchedCount}</td>
                        <td className="p-3 font-mono text-amber-600">{aud.mismatchCount}</td>
                        <td className="p-3 font-mono font-extrabold text-rose-600">{aud.missingAssetsCount}</td>
                        <td className="p-3 text-slate-500">{aud.remarks}</td>
                      </tr>
                    ))}
                    {audits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic font-medium">No audit physical verification sessions recorded this academic term.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 8: REPORTS & PRINTING CENTRE
          ========================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* printable asset master register */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Asset Register (A4 Landscape Printout)</span>
                </h3>
              </div>

              {/* print target area */}
              <div id="print-asset-register-area" className="p-6 bg-white border border-slate-100 rounded-xl max-h-72 overflow-y-auto space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-serif font-extrabold text-base text-slate-900 uppercase">National High School, Taloda</h4>
                  <p className="text-[10px] font-mono text-indigo-600 font-semibold uppercase">Primary & Senior Secondary Academic Asset General Register</p>
                  <p className="text-[9px] text-slate-400">Printed Date: {new Date().toISOString().substring(0, 10)} | Academic Term: {activeYear}</p>
                </div>

                <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">Asset ID</th>
                      <th className="p-2 border-r border-slate-300">Asset Title</th>
                      <th className="p-2 border-r border-slate-300">Category</th>
                      <th className="p-2 border-r border-slate-300">Location</th>
                      <th className="p-2 border-r border-slate-300">Brand/Model</th>
                      <th className="p-2 border-r border-slate-300">Qty</th>
                      <th className="p-2">Purchase Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-300 font-mono font-bold text-indigo-600">{a.id}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{a.name}</td>
                        <td className="p-2 border-r border-slate-300">{a.category}</td>
                        <td className="p-2 border-r border-slate-300 text-indigo-600 font-bold">{a.location}</td>
                        <td className="p-2 border-r border-slate-300">{a.brand} {a.model}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{a.quantity}</td>
                        <td className="p-2 font-mono font-bold">₹{a.purchaseCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <PrintPDFButton elementId="print-asset-register-area" title="National_High_School_Asset_Register" lang={lang} />
              </div>
            </div>

            {/* printable dead stock register */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-rose-600" />
                  <span>Dead Stock Ledger Register (Official A4 Layout)</span>
                </h3>
              </div>

              {/* print target area */}
              <div id="print-dead-stock-register-area" className="p-6 bg-white border border-slate-100 rounded-xl max-h-72 overflow-y-auto space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-serif font-extrabold text-base text-slate-900 uppercase">National High School, Taloda</h4>
                  <p className="text-[10px] font-mono text-rose-600 font-semibold uppercase">Official Dead Stock & Disposed Asset Salvage Register</p>
                  <p className="text-[9px] text-slate-400">Printed Date: {new Date().toISOString().substring(0, 10)} | Academic Term: {activeYear}</p>
                </div>

                <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">Disposal Date</th>
                      <th className="p-2 border-r border-slate-300">Asset Title</th>
                      <th className="p-2 border-r border-slate-300">Category</th>
                      <th className="p-2 border-r border-slate-300">Type</th>
                      <th className="p-2 border-r border-slate-300">Qty Disposed</th>
                      <th className="p-2">Auction Salvage Rec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStock.map(ds => (
                      <tr key={ds.id} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-300 font-mono text-slate-500">{ds.date}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{ds.assetName}</td>
                        <td className="p-2 border-r border-slate-300">{ds.category}</td>
                        <td className="p-2 border-r border-slate-300 font-bold text-rose-600">{ds.disposalType}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{ds.qty}</td>
                        <td className="p-2 font-mono font-bold text-emerald-600">₹{ds.recoveryValue.toLocaleString()}</td>
                      </tr>
                    ))}
                    {deadStock.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center italic text-slate-400">No write-offs or discarded assets currently logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <PrintPDFButton elementId="print-dead-stock-register-area" title="National_High_School_Dead_Stock_Register" lang={lang} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD/EDIT ASSET FORM
          ========================================== */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 text-left space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                {editingAsset ? `Edit Asset: ${editingAsset.name}` : 'Catalog New School Asset'}
              </h3>
              <button onClick={() => setShowAssetModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Science Laboratory Physics Kit"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Asset Category</label>
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Asset Code (Chamber No)</label>
                <input
                  type="text"
                  value={assetForm.code}
                  onChange={(e) => setAssetForm({ ...assetForm, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Brand Name / Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Epson"
                  value={assetForm.brand}
                  onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Model / Reference Number</label>
                <input
                  type="text"
                  placeholder="e.g. EB-X06"
                  value={assetForm.model}
                  onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Manufacturer Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. S/N 4423-8821"
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Quantity</label>
                  <input
                    type="number"
                    value={assetForm.quantity}
                    onChange={(e) => setAssetForm({ ...assetForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    value={assetForm.unit}
                    onChange={(e) => setAssetForm({ ...assetForm, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Purchase Unit Cost (₹)</label>
                <input
                  type="number"
                  value={assetForm.purchaseCost}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Supplier Vendor</label>
                <select
                  value={assetForm.supplierId}
                  onChange={(e) => setAssetForm({ ...assetForm, supplierId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Initial Location</label>
                <select
                  value={assetForm.location}
                  onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Asset Warranty Years</label>
                <input
                  type="number"
                  value={assetForm.warrantyYears}
                  onChange={(e) => setAssetForm({ ...assetForm, warrantyYears: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 font-bold mb-1">Additional Remarks / Condition details</label>
                <textarea
                  placeholder="Enter specific notes about setup, calibration or maintenance alerts..."
                  value={assetForm.remarks}
                  onChange={(e) => setAssetForm({ ...assetForm, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none h-20"
                />
              </div>

              <button
                type="submit"
                className="col-span-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer text-center text-xs uppercase tracking-wider"
              >
                Confirm Asset Master Record
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
