export const CONTACT_NAME = 'Adrian Altner';
export const CONTACT_STREET = 'Rudolf-Leonhard-Str. 13';
export const CONTACT_CITY = '01097 Dresden';
export const CONTACT_PHONE = '+49 156 78530420';
export const CONTACT_EMAIL = 'achi@mailbox.org';

export const AUTHOR = { name: CONTACT_NAME, url: '/ueber-mich' };

export const SOCIAL_PROFILES: {
	platform: string;
	href: string;
	rel: string;
}[] = [
	{
		platform: 'Mastodon',
		href: 'https://indieweb.social/@altner',
		rel: 'me noopener noreferrer',
	},
	{
		platform: 'Instagram',
		href: 'https://www.instagram.com/adrian.altner/',
		rel: 'me noopener noreferrer',
	},
	{
		platform: 'GitHub',
		href: 'https://github.com/altner',
		rel: 'me noopener noreferrer',
	},
	{
		platform: 'SoundCloud',
		href: 'https://soundcloud.com/adrian-altner',
		rel: 'me noopener noreferrer',
	},
];

export const SITE = {
	title: 'Adrian Altner',
	description: 'Persönliches Journal mit Fotos, Notizen und Projekten.',
	tagline: 'Persönliches Journal',
};
