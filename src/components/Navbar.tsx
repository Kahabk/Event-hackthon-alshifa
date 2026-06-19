import { useEffect, useState } from 'react';
import { ClipboardCheck, Gavel, LayoutDashboard, LogIn, Menu, ShieldCheck, X } from 'lucide-react';
import AppleStyleAvatar from './AppleStyleAvatar';

interface NavbarProps {
  onRegisterClick: () => void;
  onAdminClick: () => void;
  onJudgeClick: () => void;
  onVolunteerClick: () => void;
  onDashboardClick: () => void;
  onHomeClick: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isJudge: boolean;
  isVolunteer: boolean;
  userEmail?: string | null;
  userDisplayName?: string | null;
  userPhotoURL?: string | null;
  onAuthClick: () => void;
  onProfileClick: () => void;
}

export default function Navbar({ onRegisterClick, onAdminClick, onJudgeClick, onVolunteerClick, onDashboardClick, onHomeClick, isLoggedIn, isAdmin, isJudge, isVolunteer, userEmail, userDisplayName, userPhotoURL, onAuthClick, onProfileClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    window.localStorage.removeItem('shifa-sdg-theme');
  }, []);

  const profileName = isAdmin ? 'Admin' : isJudge ? 'Judge' : isVolunteer ? 'Volunteer' : (userDisplayName || userEmail?.split('@')[0] || 'Participant');
  const profileRole = isAdmin ? 'Event Manager' : isJudge ? 'Review Panel' : isVolunteer ? 'Attendance Desk' : 'Team Profile';
  const workspaceLabel = isAdmin ? 'Admin' : isJudge ? 'Judge' : isVolunteer ? 'Volunteer' : 'Team';
  const volunteerOnly = isVolunteer && !isAdmin && !isJudge;
  const workspaceIcon = isAdmin
    ? <ShieldCheck className="h-4 w-4" />
    : isJudge
      ? <Gavel className="h-4 w-4" />
      : isVolunteer
        ? <ClipboardCheck className="h-4 w-4" />
        : <LayoutDashboard className="h-4 w-4" />;
  const handleWorkspaceClick = () => {
    if (!isLoggedIn) {
      onAuthClick();
      return;
    }
    if (isAdmin) {
      onAdminClick();
      return;
    }
    if (isJudge) {
      onJudgeClick();
      return;
    }
    if (isVolunteer) {
      onVolunteerClick();
      return;
    }
    onDashboardClick();
  };

  const navItems = volunteerOnly
    ? [{ label: 'Volunteer', onClick: onVolunteerClick, icon: workspaceIcon, active: true }]
    : [
      {
        label: workspaceLabel,
        onClick: handleWorkspaceClick,
        icon: workspaceIcon,
      },
      { label: 'Domains', href: '#tracks' },
      { label: 'Stages', href: '#schedule' },
      { label: 'Prizes', href: '#prizes' },
      { label: 'Mentors', href: '#mentors' },
      { label: 'FAQ', href: '#faq' },
      ...(isAdmin ? [{ label: 'Control Room', onClick: onAdminClick }] : []),
      ...(isVolunteer || isAdmin ? [{ label: 'Volunteer', onClick: onVolunteerClick }] : []),
      ...(!isJudge && !isVolunteer ? [{ label: 'Register', onClick: onRegisterClick, active: true }] : []),
    ];

  return (
    <nav className="theme-header fixed left-0 top-0 z-40 w-full px-3 py-2.5 md:px-8 md:py-3">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHomeClick();
          }}
          className="theme-header-logo group cursor-pointer"
          aria-label="Shifa SDG home"
        >
          <span className="theme-brand-mark bg-[#B9FF66] text-[#191A23] font-mono font-black text-xl px-3.5 py-1.5 border-3 border-[#191A23] rounded-xl shadow-[3px_3px_0px_#191A23] group-hover:-translate-y-0.5 transition-all">
            SDG
          </span>
          <span className="hidden xl:inline font-sans font-black text-xl tracking-tight text-[#191A23] select-none">
            Shifa SDG
          </span>
        </a>

        <div className="hidden justify-center xl:flex">
          <div className="theme-nav-pill flex items-center gap-1 px-2 py-2">
            {navItems.map((item) => {
              const content = (
                <>
                  {'icon' in item && item.icon}
                  <span>{item.label}</span>
                </>
              );

              if ('href' in item) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`theme-header-link ${'active' in item && item.active ? 'theme-header-link-active' : ''}`}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`theme-header-link ${'active' in item && item.active ? 'theme-header-link-active' : ''}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden items-center justify-end gap-3 md:flex">
          <button
            type="button"
            onClick={isLoggedIn ? handleWorkspaceClick : onAuthClick}
            className="theme-compact-header-action xl:hidden"
          >
            {isLoggedIn ? workspaceIcon : <LogIn className="h-4 w-4" />}
            <span>{isLoggedIn ? workspaceLabel : 'Login'}</span>
          </button>
          {!isJudge && !isVolunteer && (
            <button
              type="button"
              onClick={onRegisterClick}
              className="theme-compact-header-action theme-compact-header-action-primary xl:hidden"
            >
              Register
            </button>
          )}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onProfileClick}
              className="theme-profile-capsule"
              title={userEmail || 'Profile'}
            >
              <AppleStyleAvatar size="sm" variant={isAdmin || isJudge || isVolunteer ? 'admin' : 'purple'} imageUrl={userPhotoURL} />
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-black leading-tight">{profileName}</span>
                <span className="block truncate text-[10px] font-bold leading-tight opacity-70">{profileRole}</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onAuthClick}
              className="theme-profile-capsule"
            >
              <AppleStyleAvatar size="sm" variant="purple" />
              <span className="text-sm font-black">Login</span>
            </button>
          )}

        </div>

        <div className="flex min-w-0 justify-end gap-2 md:hidden">
          <button
            type="button"
            onClick={isLoggedIn ? handleWorkspaceClick : onAuthClick}
            className="theme-mobile-top-action"
            title={isLoggedIn ? `${workspaceLabel} workspace` : 'Login'}
          >
            {isLoggedIn ? workspaceIcon : <LogIn className="h-4 w-4" />}
            <span>{isLoggedIn ? workspaceLabel : 'Login'}</span>
          </button>
          {!volunteerOnly && (
            <button
              id="nav-mobile-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="theme-settings-button"
              aria-label="Toggle Navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="theme-mobile-drawer soft-card-enter md:hidden absolute top-full left-0 w-full border-b-3 border-[#191A23] py-5 px-4 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => {
              if ('href' in item) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`theme-mobile-link ${'active' in item && item.active ? 'theme-mobile-link-active' : ''}`}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    item.onClick();
                  }}
                  className={`theme-mobile-link text-left ${'active' in item && item.active ? 'theme-mobile-link-active' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onProfileClick();
              }}
              className="theme-profile-capsule justify-start"
            >
              <AppleStyleAvatar size="sm" variant={isAdmin || isJudge || isVolunteer ? 'admin' : 'purple'} imageUrl={userPhotoURL} />
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-black leading-tight">{profileName}</span>
                <span className="block truncate text-[10px] font-bold leading-tight opacity-70">{profileRole}</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onAuthClick();
              }}
              className="theme-profile-capsule justify-start"
            >
              <AppleStyleAvatar size="sm" variant="purple" />
              <span className="text-sm font-black">Login</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
