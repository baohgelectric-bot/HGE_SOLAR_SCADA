import { useLanguageStore } from '../store/useLanguageStore';
import { locales, Dictionary } from '../locales';

type PathsToStringProps<T> = T extends string ? [] : {
    [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>]
}[Extract<keyof T, string>];

type Join<T extends string[], D extends string> =
    T extends [] ? never :
    T extends [infer F] ? F :
    T extends [infer F, ...infer R] ?
    F extends string ?
    R extends string[] ?
    `${F}${D}${Join<R, D>}` : never : never : string;

export type TranslationKey = Join<PathsToStringProps<Dictionary>, '.'>;

export const useTranslation = () => {
    const language = useLanguageStore((state) => state.language);
    const dictionary = locales[language];

    const t = (key: TranslationKey): string => {
        const keys = key.split('.');
        let value: any = dictionary;

        for (const k of keys) {
            if (value === undefined) break;
            value = value[k as keyof typeof value];
        }

        return (value as string) || key;
    };

    return { t, language };
};
