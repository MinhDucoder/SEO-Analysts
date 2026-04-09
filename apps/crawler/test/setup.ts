import 'reflect-metadata';

// Allow self-signed / missing-CA certs in test environments
// (CI/dev machines may not have the full CA bundle)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
