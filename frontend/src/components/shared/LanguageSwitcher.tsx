import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLang} className="text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
      <Globe className="w-5 h-5" />
      <span className="sr-only">Toggle Language</span>
      <span className="hidden md:inline font-bold text-sm ml-2">{i18n.language === 'en' ? 'عربي' : 'EN'}</span>
    </Button>
  );
}
