"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export function LanguageSelector() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const handleLanguageChange = async (newLocale: string) => {
    // Set cookie for the new locale
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`; // 1 year
    // Refresh the page to apply the new locale
    router.refresh();
  };

  const getLanguageLabel = (lang: string) => {
    return lang === "en" ? t("common.english") : t("common.spanish");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={locale === "en" ? "bg-accent" : ""}
        >
          {t("common.english")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("es")}
          className={locale === "es" ? "bg-accent" : ""}
        >
          {t("common.spanish")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
