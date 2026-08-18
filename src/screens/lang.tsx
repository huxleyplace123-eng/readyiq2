// src/screens/lang.tsx — Spanish as a first-class language: one context, one toggle. Components read `es` and choose copy.
import { createContext, useContext } from "react";

export type Lang = "en" | "es";
export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
export function useLang() { const { lang, setLang } = useContext(LangContext); return { lang, es: lang === "es", setLang }; }

export function LangToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLang();
  return <div className={`lang-toggle ${dark ? "dark" : ""}`} role="group" aria-label="Language">
    <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
    <button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
  </div>;
}
