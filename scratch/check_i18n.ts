
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';

const enKeys = Object.keys(en);
const ruKeys = Object.keys(ru);

const missingInRu = enKeys.filter(k => !ruKeys.includes(k));
const missingInEn = ruKeys.filter(k => !enKeys.includes(k));

console.log('Missing in RU:', missingInRu);
console.log('Missing in EN:', missingInEn);
