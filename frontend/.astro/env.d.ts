declare module 'astro:env/client' {
	export const PUBLIC_GA_MEASUREMENT_ID: string | undefined;	
	export const PUBLIC_GTM_ID: string | undefined;	
	export const PUBLIC_GOOGLE_MAPS_API_KEY: string;	
	export const PUBLIC_CONSENT_ENABLED: boolean;	
	export const PUBLIC_PRIVACY_POLICY_URL: string;	
}declare module 'astro:env/server' {
	export const SITE_URL: string | undefined;	
	export const RESEND_API_KEY: string | undefined;	
	export const RESEND_FROM_EMAIL: string | undefined;	
	export const NEWSLETTER_API_KEY: string | undefined;	
	export const GOOGLE_SITE_VERIFICATION: string | undefined;	
	export const BING_SITE_VERIFICATION: string | undefined;	
}