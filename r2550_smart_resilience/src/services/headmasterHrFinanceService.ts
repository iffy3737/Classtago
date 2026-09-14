import { supabase } from '../lib/supabase';

async function secureFetch<T>(url:string,init:RequestInit={}):Promise<T>{
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
  const response=await fetch(url,{...init,headers:{...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers||{}),Authorization:`Bearer ${session.access_token}`}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload?.error||'Headmaster HR/Finance service request failed.');
  return payload as T;
}

export const loadHeadmasterHrPayroll=()=>secureFetch<any>('/api/headmaster/hr-payroll-r33-30/snapshot');
export const createSalaryHead=(payload:any)=>secureFetch<any>('/api/headmaster/hr-payroll-r33-30/salary-heads',{method:'POST',body:JSON.stringify(payload)});
export const updateSalaryHead=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/hr-payroll-r33-30/salary-heads/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(payload)});
export const saveSalaryProfile=(teacherId:string,payload:any)=>secureFetch<any>(`/api/headmaster/hr-payroll-r33-30/profiles/${encodeURIComponent(teacherId)}`,{method:'PUT',body:JSON.stringify(payload)});
export const createPayrollRun=(payload:any)=>secureFetch<any>('/api/headmaster/hr-payroll-r33-30/runs',{method:'POST',body:JSON.stringify(payload)});
export const approvePayrollRun=(id:string)=>secureFetch<any>(`/api/headmaster/hr-payroll-r33-30/runs/${encodeURIComponent(id)}/approve`,{method:'POST'});
export const markPayrollPaid=(id:string)=>secureFetch<any>(`/api/headmaster/hr-payroll-r33-30/runs/${encodeURIComponent(id)}/paid`,{method:'POST'});
export const createHrRecord=(payload:any)=>secureFetch<any>('/api/headmaster/hr-payroll-r33-30/hr-records',{method:'POST',body:JSON.stringify(payload)});

export const loadHeadmasterFinance=()=>secureFetch<any>('/api/headmaster/finance-r33-30/snapshot');
export const createFinanceAccount=(payload:any)=>secureFetch<any>('/api/headmaster/finance-r33-30/accounts',{method:'POST',body:JSON.stringify(payload)});
export const createFinanceVoucher=(payload:any)=>secureFetch<any>('/api/headmaster/finance-r33-30/vouchers',{method:'POST',body:JSON.stringify(payload)});
export const actFinanceVoucher=(id:string,payload:any)=>secureFetch<any>(`/api/headmaster/finance-r33-30/vouchers/${encodeURIComponent(id)}/action`,{method:'POST',body:JSON.stringify(payload)});
export const syncFeeReceiptsToFinance=()=>secureFetch<any>('/api/headmaster/finance-r33-30/sync-fees',{method:'POST'});
export const closeFinancialYear=(id:string)=>secureFetch<any>(`/api/headmaster/finance-r33-30/financial-years/${encodeURIComponent(id)}/close`,{method:'POST'});
