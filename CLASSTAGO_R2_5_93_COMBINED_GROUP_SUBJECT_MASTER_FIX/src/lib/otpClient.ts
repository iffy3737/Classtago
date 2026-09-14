export type PublicOtpPurpose = 'institution_registration' | 'live_demo' | 'demo_setup';
export type OtpDeliveryChannel = 'sms' | 'whatsapp' | 'email';

export type OtpRequestResult = {
  success:boolean;
  challengeToken:string;
  expiresInSeconds:number;
  resendAfterSeconds:number;
  maskedMobile:string;
  maskedEmail?:string|null;
  deliveredVia:OtpDeliveryChannel[];
  deliveryLabel:string;
  deliveryAttempts?:Array<{channel:OtpDeliveryChannel;status:string}>;
};

async function postJson<T>(path: string, body: Record<string, any>): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `OTP request failed (${response.status}).`);
  return payload as T;
}

export async function requestPublicOtp(mobile: string, purpose: PublicOtpPurpose, sourcePage?: string, email?: string) {
  return postJson<OtpRequestResult>(
    '/api/public/otp/request', { mobile, purpose, email: email?.trim() || undefined, sourcePage: sourcePage || window.location.pathname }
  );
}

export async function verifyPublicOtp(challengeToken: string, otp: string) {
  return postJson<{success:boolean;challengeToken:string;purpose:string;maskedMobile:string}>(
    '/api/public/otp/verify', { challengeToken, otp }
  );
}

export async function requestSchoolOtp(schoolSlug: string, mobile: string, purpose: 'admission_verification', email?: string) {
  return postJson<OtpRequestResult>(
    `/api/public/schools/${encodeURIComponent(schoolSlug)}/otp/request`, { mobile, purpose, email: email?.trim() || undefined }
  );
}
