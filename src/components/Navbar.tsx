import { useState } from 'react';
import { Menu, X, ArrowRight, LayoutDashboard, ShieldCheck, UserCircle } from 'lucide-react';

interface NavbarProps {
  onRegisterClick: () => void;
  onAdminClick: () => void;
  onJudgeClick: () => void;
  onDashboardClick: () => void;
  onHomeClick: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isJudge: boolean;
  userEmail?: string | null;
  onAuthClick: () => void;
  onProfileClick: () => void;
}

export default function Navbar({ onRegisterClick, onAdminClick, onJudgeClick, onDashboardClick, onHomeClick, isLoggedIn, isAdmin, isJudge, userEmail, onAuthClick, onProfileClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Domains', href: '#tracks' },
    { label: 'Stages', href: '#schedule' },
    { label: 'Prizes', href: '#prizes' },
    { label: 'Glimpses', href: '#product-videos' },
    { label: 'Mentors', href: '#mentors' },
    { label: 'FAQ', href: '#faq' },
  ];

  const allNavLinks = isJudge
    ? []
    : isAdmin
      ? [{ label: 'Admin', href: '/admin', admin: true }, ...navLinks]
      : navLinks;

  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-white border-b-3 border-[#191A23] py-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHomeClick();
          }}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="bg-[#B9FF66] text-[#191A23] font-mono font-black text-xl px-3.5 py-1.5 border-3 border-[#191A23] rounded-xl shadow-[3px_3px_0px_#191A23] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] group-hover:shadow-[4px_4px_0px_#191A23] transition-all">
            SDG
          </div>
          <span className="font-sans font-black text-2xl tracking-tight text-[#191A23] select-none">
            Shifa SDG
          </span>
        </a>

        {/* Desktop Links */}
        {allNavLinks.length > 0 && (
          <div className="hidden md:flex items-center gap-4 bg-white border-2 border-[#191A23] px-5 py-2.5 rounded-full shadow-[2.5px_2.5px_0px_#191A23]">
            {allNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => {
                  if ('admin' in link && link.admin) {
                    event.preventDefault();
                    onAdminClick();
                  }
                }}
                className="text-xs uppercase font-black text-[#191A23] hover:bg-[#B9FF66] px-2.5 py-1 rounded-lg border border-transparent hover:border-[#191A23] transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Desktop Action Button */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={isJudge ? onJudgeClick : onDashboardClick}
                className="neo-btn px-4 py-2.5 text-sm uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" /> {isJudge ? 'Judge Panel' : 'Dashboard'}
              </button>
              <button
                type="button"
                onClick={onProfileClick}
                className="neo-btn-white px-4 py-2.5 text-sm uppercase flex items-center gap-1.5 cursor-pointer max-w-[180px]"
                title={userEmail || 'Profile'}
              >
                {isAdmin || isJudge ? <ShieldCheck className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                <span className="truncate">{isAdmin ? 'Admin' : isJudge ? 'Judge' : 'Profile'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAuthClick}
              className="neo-btn-white px-4 py-2.5 text-sm uppercase flex items-center gap-1.5 cursor-pointer"
            >
              Login
            </button>
          )}
          {!isJudge && (
            <button
              id="nav-register-btn"
              type="button"
              onClick={onRegisterClick}
              className="neo-btn-white px-5 py-2.5 text-sm uppercase flex items-center gap-1.5 cursor-pointer"
            >
              Register Now <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          id="nav-mobile-toggle"
          type="button"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="md:hidden bg-white text-[#191A23] p-2 border-2 border-[#191A23] rounded-xl shadow-[2px_2px_0px_#191A23] active:translate-y-0.5 cursor-pointer transition-all"
          aria-label="Toggle Navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="md:hidden absolute top-full left-0 w-full bg-white border-b-3 border-[#191A23] py-6 px-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            {allNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => {
                  setMobileMenuOpen(false);
                  if ('admin' in link && link.admin) {
                    event.preventDefault();
                    onAdminClick();
                  } else if ('judge' in link && link.judge) {
                    event.preventDefault();
                    onJudgeClick();
                  }
                }}
                className="text-lg font-black text-[#191A23] hover:text-[#B9FF66] border-b border-[#191A23]/10 pb-2 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              isLoggedIn ? (isJudge ? onJudgeClick() : onDashboardClick()) : onAuthClick();
            }}
            className="neo-btn w-full py-3.5 text-center uppercase text-sm cursor-pointer"
          >
            {isLoggedIn ? (isJudge ? 'Judge Panel' : 'Team Dashboard') : 'Login'}
          </button>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onProfileClick();
              }}
              className="neo-btn-white w-full py-3.5 text-center uppercase text-sm cursor-pointer"
            >
              {isAdmin ? 'Admin Profile' : isJudge ? 'Judge Profile' : 'Profile Settings'}
            </button>
          )}
          {!isJudge && (
            <button
              id="nav-mobile-register-btn"
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onRegisterClick();
              }}
              className="neo-btn w-full py-3.5 text-center uppercase text-sm block cursor-pointer"
            >
              Register Now
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
