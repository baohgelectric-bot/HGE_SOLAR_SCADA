import { vi } from './vi';
import { en } from './en';

export const locales = { vi, en };

export type Language = keyof typeof locales;
export type Dictionary = typeof vi;

export const defaultLanguage: Language = 'vi';
