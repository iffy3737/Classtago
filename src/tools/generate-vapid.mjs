import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
console.log('Classtago free Web Push VAPID keys (store as server environment variables; never commit the private key):');
console.log(`EDUNIXO_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`EDUNIXO_VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('EDUNIXO_VAPID_SUBJECT=mailto:admin@your-domain.example');
