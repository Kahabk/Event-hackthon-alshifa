import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Lock, Mail, MapPin, Phone, Send, User, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { defaultFormSettings, formSettingsCollection, formSettingsDocId, normalizeFormSettings } from '../lib/formSettings';
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
  const [formSettings, setFormSettings] = useState(defaultFormSettings);
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
    let active = true;

    getDoc(doc(db, formSettingsCollection, formSettingsDocId))
      .then(snapshot => {
        if (!active || !snapshot.exists()) return;
        setFormSettings(normalizeFormSettings(snapshot.data()));
      })
      .catch(() => {
        if (active) setFormSettings(defaultFormSettings);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      leaderName: prev.leaderName || user?.displayName || '',
      leaderEmail: user?.email || '',
    }));
    setErrors({});
  }, [user?.uid, user?.email, user?.displayName]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      teamSize: formSettings.registration.teamSizes.includes(prev.teamSize) ? prev.teamSize : formSettings.registration.teamSizes[0] || 3,
      experienceLevel: formSettings.registration.ideaStages.includes(prev.experienceLevel) ? prev.experienceLevel : formSettings.registration.ideaStages[0] || 'Idea',
    }));
  }, [formSettings.registration.ideaStages, formSettings.registration.teamSizes]);

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
    <main className="min-h-screen bg-[#FFF8E8] pt-28 pb-16 px-4 md:px-8">
      {submitting && <FullScreenVideoLoader label="Registering team" />}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-[#191A23] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to event
            </button>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#B9EDC8] px-3 py-1.5 text-xs font-black uppercase ring-1 ring-[#191A23]/10">
                {formSettings.registration.eyebrow}
              </span>
              <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight text-[#191A23]">{formSettings.registration.title}</h1>
            </div>
          </div>

          {!user && (
            <div className="max-w-md rounded-[24px] bg-[#CDB0E7] p-4 shadow-[0_18px_45px_rgba(25,26,35,0.12)] ring-1 ring-[#191A23]/10">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-[#191A23] bg-[#fffdf8]">
                  <Lock className="w-5 h-5" />
                </span>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black leading-relaxed">Create or open your Shifa SDG account first.</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-[#191A23]/65">Your account protects the team record, QR banner, and pitch submission dashboard.</p>
                  </div>
                  <button type="button" onClick={onAuthClick} className="rounded-full border-2 border-[#191A23] bg-[#fffdf8] px-4 py-2 text-xs font-black shadow-[2px_2px_0px_#191A23] cursor-pointer">Open Account</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.75fr)]">
          <section className="space-y-6 rounded-[28px] bg-white/90 p-4 shadow-[0_24px_80px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 md:p-7">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Team Name" error={errors.teamName}>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(event) => setFormData(prev => ({ ...prev, teamName: event.target.value }))}
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
                    placeholder="Team name"
                  />
                </div>
              </Field>

              <Field label="Team Size">
                <div className="grid grid-cols-4 gap-2">
                  {formSettings.registration.teamSizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, teamSize: size }))}
                      className={`h-12 rounded-2xl text-sm font-black transition-all ring-1 ring-[#191A23]/10 ${
                        formData.teamSize === size ? 'bg-[#B9EDC8] shadow-[0_12px_24px_rgba(25,26,35,0.10)]' : 'bg-[#FFFDF8] hover:bg-white'
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7] read-only:cursor-not-allowed read-only:bg-[#F0ECE4] read-only:text-[#191A23]/70"
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
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
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
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
                    <div key={index} className="grid gap-4 rounded-2xl bg-[#FFF8E8] p-4 ring-1 ring-[#191A23]/10 md:grid-cols-2">
                      <Field label={`Member ${index + 2} Name`} error={errors[`member-${index}-name`]}>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(event) => updateMember(index, 'name', event.target.value)}
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
                          placeholder="Member name"
                        />
                      </Field>
                      <Field label={`Member ${index + 2} Email`} error={errors[`member-${index}-email`]}>
                        <input
                          type="email"
                          value={member.email || ''}
                          onChange={(event) => updateMember(index, 'email', event.target.value)}
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 focus:outline-none focus:ring-2 focus:ring-[#CDB0E7]"
                          placeholder="member@example.com"
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="h-fit space-y-5 rounded-[28px] bg-white/92 p-4 shadow-[0_24px_80px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 md:p-6">
            <Field label="Current Stage of Idea">
              <div className="grid gap-2">
                {formSettings.registration.ideaStages.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                    className={`flex items-center justify-between rounded-2xl p-3 text-left text-sm font-black ring-1 ring-[#191A23]/10 ${
                      formData.experienceLevel === level ? 'bg-[#B9EDC8]' : 'bg-[#FFFDF8] hover:bg-white'
                    }`}
                  >
                    {level}
                    {formData.experienceLevel === level && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-start gap-3 rounded-2xl bg-[#FFF8E8] p-4 text-xs font-bold leading-relaxed ring-1 ring-[#191A23]/10">
              <input
                type="checkbox"
                checked={formData.agreeToCodeOfConduct}
                onChange={(event) => setFormData(prev => ({ ...prev, agreeToCodeOfConduct: event.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#B9EDC8]"
              />
              {formSettings.registration.declaration}
            </label>
            {errors.agreeToCodeOfConduct && <p className="text-xs font-bold text-red-600">{errors.agreeToCodeOfConduct}</p>}
            {errors.submit && <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">{errors.submit}</p>}

            <button
              type="submit"
              disabled={submitting || !user}
              className="neo-btn flex w-full items-center justify-center gap-2 py-4 text-sm uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving Team...' : formSettings.registration.submitLabel} <Send className="w-4 h-4" />
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
