import { createHash, createHmac, randomUUID } from 'crypto';

export const R2_STORAGE_PREFIX = 'r2:';
export const R2_PART_SIZE = 16 * 1024 * 1024;
export const R2_MAX_TEXTBOOK_BYTES = 2 * 1024 * 1024 * 1024;

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };
const env = (name: string) => String(process.env[name] || '').trim();

export function getR2Config(): R2Config | null {
  const accountId = env('CLOUDFLARE_R2_ACCOUNT_ID');
  const accessKeyId = env('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = env('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const bucket = env('CLOUDFLARE_R2_BUCKET') || 'edunixo-study-materials';
  return accountId && accessKeyId && secretAccessKey && bucket ? { accountId, accessKeyId, secretAccessKey, bucket } : null;
}

export const isR2StoragePath = (value: unknown) => String(value || '').startsWith(R2_STORAGE_PREFIX);
export function r2KeyFromStoragePath(value: unknown) {
  const raw = String(value || '');
  if (!raw.startsWith(R2_STORAGE_PREFIX)) throw new Error('Invalid R2 storage reference.');
  const key = raw.slice(R2_STORAGE_PREFIX.length);
  if (!key || key.includes('..') || key.startsWith('/')) throw new Error('Invalid R2 object key.');
  return key;
}
export const r2StoragePath = (key: string) => `${R2_STORAGE_PREFIX}${key}`;
export function r2ObjectKey(schoolId: string, userId: string, fileName: string) {
  const safeName = String(fileName || 'textbook.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120) || 'textbook.pdf';
  return `${schoolId}/${userId}/textbooks/${randomUUID()}-${safeName}`;
}
export function assertOwnedR2Key(key: string, schoolId: string, userId: string) {
  if (!key.startsWith(`${schoolId}/${userId}/`) || key.includes('..')) throw new Error('This storage object does not belong to the current Teacher account.');
}

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const hmac = (key: string | Buffer, value: string) => createHmac('sha256', key).update(value).digest();
const awsEncode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const canonicalUri = (bucket: string, key: string) => `/${awsEncode(bucket)}/${key.split('/').map(awsEncode).join('/')}`;
function amzDate(date = new Date()) { const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); return { full: iso, short: iso.slice(0, 8) }; }
function signingKey(secret: string, shortDate: string) { const d = hmac(`AWS4${secret}`, shortDate); const r = hmac(d, 'auto'); const s = hmac(r, 's3'); return hmac(s, 'aws4_request'); }
function canonicalQuery(params: Record<string, string>) { return Object.entries(params).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${awsEncode(k)}=${awsEncode(v)}`).join('&'); }
const endpoint = (config: R2Config) => `${config.accountId}.r2.cloudflarestorage.com`;

export function presignR2Url(method: string, key: string, query: Record<string,string> = {}, expiresSeconds = 900) {
  const config = getR2Config(); if (!config) throw new Error('School large-file storage is not configured.');
  const host = endpoint(config); const { full, short } = amzDate(); const scope = `${short}/auto/s3/aws4_request`; const signedHeaders = 'host';
  const params = { ...query, 'X-Amz-Algorithm':'AWS4-HMAC-SHA256', 'X-Amz-Credential':`${config.accessKeyId}/${scope}`, 'X-Amz-Date':full, 'X-Amz-Expires':String(Math.max(1,Math.min(604800,expiresSeconds))), 'X-Amz-SignedHeaders':signedHeaders };
  const qs = canonicalQuery(params); const canonical = [method.toUpperCase(),canonicalUri(config.bucket,key),qs,`host:${host}\n`,signedHeaders,'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256',full,scope,sha256(canonical)].join('\n'); const sig = createHmac('sha256', signingKey(config.secretAccessKey,short)).update(toSign).digest('hex');
  return `https://${host}${canonicalUri(config.bucket,key)}?${qs}&X-Amz-Signature=${sig}`;
}

export async function signedR2Request(method: string, key: string, options?: { query?: Record<string,string>; body?: string|Buffer; headers?: Record<string,string>; signal?: AbortSignal }) {
  const config = getR2Config(); if (!config) throw new Error('School large-file storage is not configured.');
  const host = endpoint(config); const { full, short } = amzDate(); const body = options?.body ?? ''; const payloadHash = sha256(body);
  const supplied = Object.fromEntries(Object.entries(options?.headers || {}).map(([k,v])=>[k.toLowerCase(),String(v).trim()]));
  const headers: Record<string,string> = { host, ...supplied, 'x-amz-content-sha256':payloadHash, 'x-amz-date':full };
  const names = Object.keys(headers).sort(); const canonicalHeaders = names.map(n=>`${n}:${headers[n]}\n`).join(''); const signedHeaders = names.join(';'); const scope = `${short}/auto/s3/aws4_request`;
  const canonical = [method.toUpperCase(),canonicalUri(config.bucket,key),canonicalQuery(options?.query||{}),canonicalHeaders,signedHeaders,payloadHash].join('\n');
  const toSign = ['AWS4-HMAC-SHA256',full,scope,sha256(canonical)].join('\n'); const sig = createHmac('sha256', signingKey(config.secretAccessKey,short)).update(toSign).digest('hex');
  const auth = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
  const qs = canonicalQuery(options?.query||{}); const url = `https://${host}${canonicalUri(config.bucket,key)}${qs?`?${qs}`:''}`;
  const requestHeaders = { ...headers, Authorization:auth }; delete (requestHeaders as any).host;
  return fetch(url,{method,headers:requestHeaders,body:['GET','HEAD'].includes(method.toUpperCase())?undefined:body,signal:options?.signal});
}
function xmlValue(xml:string,tag:string){const m=xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?m[1].trim():'';}
const xmlEscape=(v:string)=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
async function r2Error(response:Response,fallback:string){const text=await response.text().catch(()=> '');return new Error(xmlValue(text,'Message')||xmlValue(text,'Code')||`${fallback} (${response.status}).`);}
export async function createR2MultipartUpload(key:string,contentType='application/pdf',fileName='textbook.pdf'){const safeName=String(fileName||'textbook.pdf').replace(/[^\x20-\x7E]+/g,'_').replace(/[\"\\]/g,'_').slice(-120)||'textbook.pdf';const r=await signedR2Request('POST',key,{query:{uploads:''},headers:{'content-type':contentType,'content-disposition':`inline; filename=\"${safeName}\"`}});if(!r.ok)throw await r2Error(r,'Large-file upload could not start');const id=xmlValue(await r.text(),'UploadId');if(!id)throw new Error('Large-file upload session did not return an upload ID.');return id;}
export async function completeR2MultipartUpload(key:string,uploadId:string,parts:Array<{partNumber:number;etag:string}>){const body=`<CompleteMultipartUpload>${parts.slice().sort((a,b)=>a.partNumber-b.partNumber).map(p=>`<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${xmlEscape(p.etag)}</ETag></Part>`).join('')}</CompleteMultipartUpload>`;const r=await signedR2Request('POST',key,{query:{uploadId},body,headers:{'content-type':'application/xml'}});if(!r.ok)throw await r2Error(r,'Large-file upload could not be completed');}
export async function abortR2MultipartUpload(key:string,uploadId:string){const r=await signedR2Request('DELETE',key,{query:{uploadId}});if(!r.ok&&r.status!==404)throw await r2Error(r,'Large-file upload could not be cancelled');}
export async function deleteR2Object(key:string){const r=await signedR2Request('DELETE',key);if(!r.ok&&r.status!==404)throw await r2Error(r,'Stored file cleanup failed');}
export async function headR2Object(key:string){const r=await signedR2Request('HEAD',key);if(!r.ok)throw await r2Error(r,'Stored textbook could not be verified');return{size:Number(r.headers.get('content-length')||0),contentType:r.headers.get('content-type')||'application/octet-stream'};}
