export default function Footer() {
  return (
    <footer className="w-full bg-paper border-t-[3px] border-ink py-8">
      <div className="w-full px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-headline-sm text-headline-sm uppercase text-ink">CENTINEL FIN AI</span>
          <span className="font-label-sm text-label-sm px-2 py-0.5 bg-muted border-[2px] border-ink uppercase text-ink">
            NON-CUSTODIAL SAFETY CORE
          </span>
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          © 2024 Centinel Financial Intelligence Technologies. Strict Neo-Brutalist Architecture.
        </div>
        <div className="flex items-center gap-6 font-label-sm text-label-sm uppercase">
          <a className="text-on-surface-variant hover:text-ink" href="#">Security Whitepaper</a>
          <a className="text-on-surface-variant hover:text-ink" href="#">Governance Policy</a>
          <a className="text-on-surface-variant hover:text-ink" href="#">Audit Logs</a>
        </div>
      </div>
    </footer>
  );
}
