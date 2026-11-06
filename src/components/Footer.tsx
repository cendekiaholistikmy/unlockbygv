import { ORG } from "@/config";
import { useData } from "@/lib/store";

export function Footer() {
  const { settings } = useData();
  return (
    <footer className="bg-[#05060A] text-[#C9CCD8]">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-8 pt-14 sm:px-6">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-md flex-col gap-4">
            <img src={`${import.meta.env.BASE_URL}brand/unlock-wordmark-reverse.png`} alt="UNLOCK" className="h-9 w-auto self-start" />
            <p className="text-[15px] leading-relaxed">
              UNLOCK is a {ORG.programme} programme under {ORG.association} ({ORG.short}). One expert conversation every weekend for
              Malaysian youth.
            </p>
            <p className="text-sm italic text-[#8A8FA0]">{ORG.motto}</p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div className="flex flex-col gap-2.5 text-[15px]">
              <div className="text-xs font-extrabold tracking-[0.16em] text-white">FOLLOW @GENGVOLUNTEERS</div>
              {ORG.socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener" className="hover:text-white">
                  {s.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 text-[15px]">
              <div className="text-xs font-extrabold tracking-[0.16em] text-white">UNLOCK</div>
              <a href="#/sessions" className="hover:text-white">All sessions</a>
              <a href="#/speak" className="hover:text-white">Share at UNLOCK</a>
              <a href={settings.telegramUrl} target="_blank" rel="noopener" className="hover:text-white">GV Familia on Telegram</a>
              <a href={`mailto:${settings.contactEmail}`} className="break-all hover:text-white">{settings.contactEmail}</a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[13px] text-[#8A8FA0]">
          <div>© {new Date().getFullYear()} {ORG.programme} · {ORG.short}</div>
          <div className="flex items-center gap-5">
            <span className="font-brush text-base text-flame-b">Gen-Z, Level Up!</span>
            <a href="#/admin" className="hover:text-white">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
