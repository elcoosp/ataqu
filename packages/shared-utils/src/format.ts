export const formatDate = (date: Date|string, locale='en-US') => new Intl.DateTimeFormat(locale).format(typeof date==='string'?new Date(date):date);
export const formatCurrency = (amount: number, currency='USD', locale='en-US') => new Intl.NumberFormat(locale,{style:'currency',currency}).format(amount);
export const truncateText = (text: string, maxLength: number) => text.length > maxLength ? text.slice(0,maxLength)+'…' : text;
