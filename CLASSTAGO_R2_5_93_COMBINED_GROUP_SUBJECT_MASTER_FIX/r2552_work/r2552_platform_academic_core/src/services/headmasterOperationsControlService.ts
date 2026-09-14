import { supabase } from '../lib/supabase';

async function secureFetch<T>(url:string,init:RequestInit={}):Promise<T>{
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
  const response=await fetch(url,{...init,headers:{...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers||{}),Authorization:`Bearer ${session.access_token}`}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload?.error||'Headmaster Operations service request failed.');
  return payload as T;
}
const json=(method:string,payload?:any):RequestInit=>({method,...(payload===undefined?{}:{body:JSON.stringify(payload)})});

export const loadLibrary=()=>secureFetch<any>('/api/headmaster/library-r33-31/snapshot');
export const createLibraryBook=(payload:any)=>secureFetch<any>('/api/headmaster/library-r33-31/books',json('POST',payload));
export const updateLibraryBook=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/library-r33-31/books/${encodeURIComponent(id)}`,json('PATCH',payload));
export const issueLibraryBook=(payload:any)=>secureFetch<any>('/api/headmaster/library-r33-31/loans',json('POST',payload));
export const closeLibraryLoan=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/library-r33-31/loans/${encodeURIComponent(id)}/close`,json('POST',payload));
export const createLibraryPurchase=(payload:any)=>secureFetch<any>('/api/headmaster/library-r33-31/purchases',json('POST',payload));
export const actLibraryPurchase=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/library-r33-31/purchases/${encodeURIComponent(id)}/action`,json('POST',payload));
export const createLibraryAudit=(payload:any)=>secureFetch<any>('/api/headmaster/library-r33-31/stock-audits',json('POST',payload));
export const finalizeLibraryAudit=(id:string)=>secureFetch<any>(`/api/headmaster/library-r33-31/stock-audits/${encodeURIComponent(id)}/finalize`,json('POST'));

export const loadInventory=()=>secureFetch<any>('/api/headmaster/inventory-r33-31/snapshot');
export const createInventoryAsset=(payload:any)=>secureFetch<any>('/api/headmaster/inventory-r33-31/assets',json('POST',payload));
export const updateInventoryAsset=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/inventory-r33-31/assets/${encodeURIComponent(id)}`,json('PATCH',payload));
export const createProcurement=(payload:any)=>secureFetch<any>('/api/headmaster/inventory-r33-31/procurements',json('POST',payload));
export const actProcurement=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/inventory-r33-31/procurements/${encodeURIComponent(id)}/action`,json('POST',payload));
export const createMaintenance=(payload:any)=>secureFetch<any>('/api/headmaster/inventory-r33-31/maintenance',json('POST',payload));
export const completeMaintenance=(id:string)=>secureFetch<any>(`/api/headmaster/inventory-r33-31/maintenance/${encodeURIComponent(id)}/complete`,json('POST'));
export const createInventoryAudit=(payload:any)=>secureFetch<any>('/api/headmaster/inventory-r33-31/stock-audits',json('POST',payload));
export const finalizeInventoryAudit=(id:string)=>secureFetch<any>(`/api/headmaster/inventory-r33-31/stock-audits/${encodeURIComponent(id)}/finalize`,json('POST'));
export const createWriteoff=(payload:any)=>secureFetch<any>('/api/headmaster/inventory-r33-31/writeoffs',json('POST',payload));
export const actWriteoff=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/inventory-r33-31/writeoffs/${encodeURIComponent(id)}/action`,json('POST',payload));

export const loadCampusSecurity=()=>secureFetch<any>('/api/headmaster/security-r33-31/snapshot');
export const createVisitor=(payload:any)=>secureFetch<any>('/api/headmaster/security-r33-31/visitors',json('POST',payload));
export const signOutVisitor=(id:string)=>secureFetch<any>(`/api/headmaster/security-r33-31/visitors/${encodeURIComponent(id)}/signout`,json('POST'));
export const createStudentGatePass=(payload:any)=>secureFetch<any>('/api/headmaster/security-r33-31/student-passes',json('POST',payload));
export const returnStudentGatePass=(id:string)=>secureFetch<any>(`/api/headmaster/security-r33-31/student-passes/${encodeURIComponent(id)}/return`,json('POST'));
export const createStaffGatePass=(payload:any)=>secureFetch<any>('/api/headmaster/security-r33-31/staff-passes',json('POST',payload));
export const returnStaffGatePass=(id:string)=>secureFetch<any>(`/api/headmaster/security-r33-31/staff-passes/${encodeURIComponent(id)}/return`,json('POST'));
export const createVehicleEntry=(payload:any)=>secureFetch<any>('/api/headmaster/security-r33-31/vehicles',json('POST',payload));
export const exitVehicle=(id:string)=>secureFetch<any>(`/api/headmaster/security-r33-31/vehicles/${encodeURIComponent(id)}/exit`,json('POST'));
export const resolveSecurityAlert=(id:string)=>secureFetch<any>(`/api/headmaster/security-r33-31/alerts/${encodeURIComponent(id)}/resolve`,json('POST'));

export const loadSystemControl=async()=>{
  const [staff,permissions,health,audit]=await Promise.all([
    secureFetch<any>('/api/admin/staff-accounts'),
    secureFetch<any>('/api/admin/role-permissions'),
    secureFetch<any>('/api/headmaster/health-check'),
    secureFetch<any>('/api/headmaster/audit-logs')
  ]);
  return {staff:staff.staff||[],permissions:permissions.permissions||[],health:health.checks||[],healthGeneratedAt:health.generatedAt||null,audit:audit.logs||[],retentionView:audit.retentionView||''};
};
export const saveRolePermissions=(permissions:any[])=>secureFetch<any>('/api/admin/role-permissions',json('PUT',{permissions}));
export const runDuplicateDiagnostics=()=>secureFetch<any>('/api/headmaster/duplicate-diagnostics');
export const generateSystemExport=()=>secureFetch<any>('/api/headmaster/system-export');
export const loadAuditLogs=()=>secureFetch<any>('/api/headmaster/audit-logs');
