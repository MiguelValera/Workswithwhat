// Operator details for the legal notice and privacy policy.
// Spain's LSSI (art. 10) requires name, tax ID (NIF), address and an email
// address for sites with an economic activity (ads, affiliate links…).
// Empty fields are simply not shown.
export const OPERATOR = {
  name: 'Miguel Valera Salmerón',
  taxId: '23827025Z',
  address: 'Carretera de Caravaca 11, bajo, 30440 Moratalla (Murcia), España',
  email: 'info@workswithwhat.com',
};

export const CONTACT_URL = 'https://github.com/MiguelValera/Workswithwhat/issues';
export const LEGAL_UPDATED = '2026-10-12';

// Languages built besides English (each under /<lang>/). A language goes on only once
// every published record has a translation in src/data/i18n/<lang>/; while it's off,
// none of its pages, links or hreflang alternates are built.
export const ENABLED_LANGS = ['es'] as const;
