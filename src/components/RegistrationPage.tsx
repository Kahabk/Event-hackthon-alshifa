import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Lock, Mail, MapPin, Phone, Send, User, Users } from 'lucide-react';
import { Registration, TeamMember } from '../types';
import FullScreenVideoLoader from './FullScreenVideoLoader';

interface RegistrationPageProps {
  user: FirebaseUser | null;
  onAuthClick: () => void;
  onBack: () => void;
  onRegisterSuccess: (registration: Registration) => Promise<void>;
}

type RegistrationErrors = Partial<Record<keyof Registration | 'submit' | `member-${number}-name` | `member-${number}-email`, string>>;

const initialMembers: TeamMember[] = [
  { name: '', email: '' },
  { name: '', email: '' },
  { name: '', email: '' },
  { name: '', email: '' },
];

const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function RegistrationPage({ user, onAuthClick, onBack, onRegisterSuccess }: RegistrationPageProps) {
  const [formData, setFormData] = useState<Registration>({
    teamName: '',
    leaderName: user?.displayName || '',
    leaderEmail: user?.email || '',
    phoneNumber: '',
    location: '',
    collegeName: '',
    fieldOfStudy: '',
    teamSize: 3,
    members: initialMembers,
    track: 'Not selected',
    experienceLevel: 'Current Stage of Idea',
    githubUrl: '',
    agreeToCodeOfConduct: false,
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      leaderName: prev.leaderName || user?.displayName || '',
      leaderEmail: user?.email || '',
    }));
    setErrors({});
  }, [user?.uid, user?.email, user?.displayName]);

  const visibleMembers = useMemo(() => formData.members.slice(0, Math.max(formData.teamSize - 1, 0)), [formData.members, formData.teamSize]);

  const validate = () => {
    const nextErrors: RegistrationErrors = {};

    if (!formData.teamName.trim()) nextErrors.teamName = 'Team name is required.';
    if (!formData.leaderName.trim()) nextErrors.leaderName = 'Leader name is required.';
    if (!formData.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone number is required.';
    if (!formData.location.trim()) nextErrors.location = 'District is required.';
    if (!formData.collegeName.trim()) nextErrors.collegeName = 'College name is required.';
    if (!formData.fieldOfStudy.trim()) nextErrors.fieldOfStudy = 'Department / course is required.';
    if (!formData.leaderEmail.trim()) {
      nextErrors.leaderEmail = 'Leader email is required.';
    } else if (!isEmail(formData.leaderEmail)) {
      nextErrors.leaderEmail = 'Enter a valid leader email.';
    }
    if (!formData.agreeToCodeOfConduct) nextErrors.agreeToCodeOfConduct = 'Please confirm the registration declaration.';

    visibleMembers.forEach((member, index) => {
      if (!member.name.trim()) {
        nextErrors[`member-${index}-name`] = `Member ${index + 2} name is required.`;
      }
      if (!member.email?.trim()) {
        nextErrors[`member-${index}-email`] = `Member ${index + 2} email is required.`;
      } else if (!isEmail(member.email)) {
        nextErrors[`member-${index}-email`] = `Member ${index + 2} email is not valid.`;
      }
    });

    const enteredEmails = [
      normalizeEmail(formData.leaderEmail),
      ...visibleMembers.map(member => normalizeEmail(member.email || '')),
    ].filter(Boolean);
    const duplicateEmail = enteredEmails.find((email, index) => enteredEmails.indexOf(email) !== index);
    if (duplicateEmail) {
      nextErrors.submit = `${duplicateEmail} is already entered in this team. Each person needs a unique email.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, memberIndex) => (
        memberIndex === index ? { ...member, [field]: value } : member
      )),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setErrors({ submit: 'Please login before registering your team.' });
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      await onRegisterSuccess({
        ...formData,
        teamName: formData.teamName.trim(),
        leaderName: formData.leaderName.trim(),
        leaderEmail: formData.leaderEmail.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        location: formData.location.trim(),
        collegeName: formData.collegeName.trim(),
        fieldOfStudy: formData.fieldOfStudy.trim(),
        members: visibleMembers.map(member => ({
          name: member.name.trim(),
          email: member.email?.trim() || '',
        })),
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Could not save registration.';
      const message = rawMessage.toLowerCase().includes('permission')
        ? 'Firebase rules are blocking registration. Publish the latest firestore.rules, including accountRegistrations, participantEmails, teamNames, and registrations.'
        : rawMessage;
      setErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] pt-28 pb-16 px-4 md:px-8">
      {submitting && <FullScreenVideoLoader label="Registering team" />}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-[#191A23] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to event
            </button>
            <div>
              <span className="inline-flex items-center gap-2 rounded-md border-2 border-[#191A23] bg-[#B9FF66] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_#191A23]">
                Team Registration
              </span>
              <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight text-[#191A23]">Register Your Team</h1>
            </div>
          </div>

          {!user && (
            <div className="max-w-md rounded-xl border-2 border-[#191A23] bg-white p-4 shadow-[4px_4px_0px_#191A23]">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5" />
                <div className="space-y-3">
                  <p className="text-sm font-bold leading-relaxed">Login first so your team registration can be saved and protected.</p>
                  <button type="button" onClick={onAuthClick} className="neo-btn px-4 py-2 text-xs uppercase cursor-pointer">Open Login</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <section className="rounded-2xl border-2 border-[#191A23] bg-white p-5 md:p-7 shadow-[5px_5px_0px_#191A23] space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Team Name" error={errors.teamName}>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(event) => setFormData(prev => ({ ...prev, teamName: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="Team name"
                  />
                </div>
              </Field>

              <Field label="Team Size">
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, teamSize: size }))}
                      className={`h-12 rounded-xl border-2 border-[#191A23] text-sm font-black transition-all ${
                        formData.teamSize === size ? 'bg-[#B9FF66] shadow-[2px_2px_0px_#191A23]' : 'bg-[#F3F3F3] hover:bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Team Leader Name" error={errors.leaderName}>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.leaderName}
                    onChange={(event) => setFormData(prev => ({ ...prev, leaderName: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="Leader name"
                  />
                </div>
              </Field>

              <Field label="Team Leader Email" error={errors.leaderEmail}>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="email"
                    value={formData.leaderEmail}
                    onChange={(event) => {
                      if (!user) setFormData(prev => ({ ...prev, leaderEmail: event.target.value }));
                    }}
                    readOnly={Boolean(user)}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66] read-only:cursor-not-allowed read-only:bg-[#E9EAEE] read-only:text-[#191A23]/70"
                    placeholder="leader@example.com"
                  />
                </div>
                {user && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#191A23]/55">
                    Uses your current login email. Logout and login with another email to register another team.
                  </p>
                )}
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="College Name" error={errors.collegeName}>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.collegeName}
                    onChange={(event) => setFormData(prev => ({ ...prev, collegeName: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="College or campus"
                  />
                </div>
              </Field>

              <Field label="Department / Course" error={errors.fieldOfStudy}>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.fieldOfStudy}
                    onChange={(event) => setFormData(prev => ({ ...prev, fieldOfStudy: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="Department or course"
                  />
                </div>
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Phone Number" error={errors.phoneNumber}>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(event) => setFormData(prev => ({ ...prev, phoneNumber: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="Phone number"
                  />
                </div>
              </Field>

              <Field label="District" error={errors.location}>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(event) => setFormData(prev => ({ ...prev, location: event.target.value }))}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    placeholder="District"
                  />
                </div>
              </Field>
            </div>

            {visibleMembers.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-black">Team Members</h2>
                <div className="grid gap-4">
                  {visibleMembers.map((member, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-4 rounded-xl border-2 border-[#191A23]/15 bg-[#F7F8FA] p-4">
                      <Field label={`Member ${index + 2} Name`} error={errors[`member-${index}-name`]}>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(event) => updateMember(index, 'name', event.target.value)}
                          className="w-full rounded-xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                          placeholder="Member name"
                        />
                      </Field>
                      <Field label={`Member ${index + 2} Email`} error={errors[`member-${index}-email`]}>
                        <input
                          type="email"
                          value={member.email || ''}
                          onChange={(event) => updateMember(index, 'email', event.target.value)}
                          className="w-full rounded-xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                          placeholder="member@example.com"
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border-2 border-[#191A23] bg-white p-5 md:p-7 shadow-[5px_5px_0px_#B9FF66] space-y-5 h-fit">
            <Field label="Current Stage of Idea">
              <div className="grid gap-2">
                {['Idea', 'Validated Idea', 'Prototype'].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                    className={`flex items-center justify-between rounded-xl border-2 border-[#191A23] p-3 text-left text-sm font-black ${
                      formData.experienceLevel === level ? 'bg-[#B9FF66]' : 'bg-[#F3F3F3] hover:bg-white'
                    }`}
                  >
                    {level}
                    {formData.experienceLevel === level && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-start gap-3 rounded-xl border-2 border-[#191A23]/15 bg-[#F7F8FA] p-4 text-xs font-bold leading-relaxed">
              <input
                type="checkbox"
                checked={formData.agreeToCodeOfConduct}
                onChange={(event) => setFormData(prev => ({ ...prev, agreeToCodeOfConduct: event.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#B9FF66]"
              />
              I confirm the team details are correct and understand that teams must submit a pitch deck covering problem statement, SDG alignment, solution, impact, feasibility, scalability, and sustainability.
            </label>
            {errors.agreeToCodeOfConduct && <p className="text-xs font-bold text-red-600">{errors.agreeToCodeOfConduct}</p>}
            {errors.submit && <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">{errors.submit}</p>}

            <button
              type="submit"
              disabled={submitting || !user}
              className="neo-btn flex w-full items-center justify-center gap-2 py-4 text-sm uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving Team...' : 'Register Now'} <Send className="w-4 h-4" />
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

function Field({ label, optional, error, children }: { label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-black">
        {label} {optional && <span className="font-semibold text-[#191A23]/50">(optional)</span>}
      </span>
      {children}
      {error && <span className="block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}
