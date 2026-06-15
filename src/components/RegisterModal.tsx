import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowRight, Sparkles, User, Mail, Users, BookOpen, Lock } from 'lucide-react';
import { Registration } from '../types';
import { TRACKS } from '../data';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onAuthClick: () => void;
  onRegisterSuccess: (reg: Registration) => Promise<void> | void;
}

export default function RegisterModal({ isOpen, onClose, userEmail, onAuthClick, onRegisterSuccess }: RegisterModalProps) {
  const [formData, setFormData] = useState<Registration>({
    teamName: '',
    leaderName: '',
    leaderEmail: '',
    phoneNumber: '',
    location: '',
    collegeName: '',
    fieldOfStudy: '',
    teamSize: 3,
    members: [
      { name: '', email: '' },
      { name: '', email: '' },
      { name: '', email: '' },
      { name: '', email: '' },
    ],
    track: 'Healthcare Innovation',
    experienceLevel: 'Idea',
    githubUrl: '',
    agreeToCodeOfConduct: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Registration, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (userEmail && !formData.leaderEmail) {
      setFormData(prev => ({ ...prev, leaderEmail: userEmail }));
    }
  }, [formData.leaderEmail, userEmail]);

  const validateStep = (currentStep: number) => {
    const newErrors: Partial<Record<keyof Registration, string>> = {};
    
    if (currentStep === 1) {
      if (!formData.teamName.trim()) newErrors.teamName = 'Team name is required';
      if (!formData.leaderName.trim()) newErrors.leaderName = 'Leader name is required';
      if (!formData.leaderEmail.trim()) {
        newErrors.leaderEmail = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.leaderEmail)) {
        newErrors.leaderEmail = 'Please provide a valid email';
      }
    } else if (currentStep === 2) {
      if (!formData.track) newErrors.track = 'Please select a domain';
    } else if (currentStep === 3) {
      if (!formData.agreeToCodeOfConduct) {
        newErrors.agreeToCodeOfConduct = 'Please confirm the registration declaration';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (!userEmail) {
      setSubmitError('Please create an account or login before registering.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await onRegisterSuccess({ ...formData, leaderEmail: formData.leaderEmail || userEmail });
      setSubmitting(false);
      setFormData({
        teamName: '',
        leaderName: '',
        leaderEmail: userEmail || '',
        phoneNumber: '',
        location: '',
        collegeName: '',
        fieldOfStudy: '',
        teamSize: 3,
        members: [
          { name: '', email: '' },
          { name: '', email: '' },
          { name: '', email: '' },
          { name: '', email: '' },
        ],
        track: 'Healthcare Innovation',
        experienceLevel: 'Idea',
        githubUrl: '',
        agreeToCodeOfConduct: false,
      });
      setStep(1);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Could not save registration. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'teamSize') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof Registration]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="register-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          id="register-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#191A23]/90 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          id="register-card"
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white text-[#191A23] border-4 border-[#191A23] rounded-[32px] shadow-[8px_8px_0px_#B9FF66] p-6 md:p-8 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b-2 border-[#191A23]/10 pb-4">
            <div>
              <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-2.5 py-1 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] tracking-wide inline-block mb-1.5 uppercase">
                Step {step} of 3
              </span>
              <h2 className="text-2xl font-black tracking-tight font-sans">
                {step === 1 && 'Team Details'}
                {step === 2 && 'Idea Alignment'}
                {step === 3 && 'Final Verification'}
              </h2>
            </div>
            <button
              id="close-modal-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-[#F3F3F3] border-2 border-[#191A23] rounded-lg shadow-[2px_2px_0px_#191A23] transition-all"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!userEmail && (
            <div className="mb-5 bg-[#F3F3F3] border-2 border-[#191A23] rounded-2xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 flex-none mt-0.5" />
              <div className="space-y-3">
                <p className="text-sm font-bold leading-relaxed">
                  Create an account or login first. Your registration will then be saved to Firebase.
                </p>
                <button
                  type="button"
                  onClick={onAuthClick}
                  className="neo-btn px-4 py-2 text-xs uppercase cursor-pointer"
                >
                  Open Login
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="registration-form" onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                {/* Team Name */}
                <div className="space-y-1">
                  <label htmlFor="teamName" className="font-bold text-sm tracking-wide block">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                    <input
                      id="teamName"
                      type="text"
                      name="teamName"
                      value={formData.teamName}
                      onChange={handleChange}
                      placeholder="Team name"
                      className="w-full text-sm font-medium border-2 border-[#191A23] bg-[#F3F3F3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B9FF66]/50 transition-all font-mono"
                    />
                  </div>
                  {errors.teamName && (
                    <span className="text-xs text-red-600 font-bold block">{errors.teamName}</span>
                  )}
                </div>

                {/* Team Leader Name */}
                <div className="space-y-1">
                  <label htmlFor="leaderName" className="font-bold text-sm tracking-wide block">
                    Team Leader Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                    <input
                      id="leaderName"
                      type="text"
                      name="leaderName"
                      value={formData.leaderName}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Nair"
                      className="w-full text-sm font-medium border-2 border-[#191A23] bg-[#F3F3F3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B9FF66]/50 transition-all"
                    />
                  </div>
                  {errors.leaderName && (
                    <span className="text-xs text-red-600 font-bold block">{errors.leaderName}</span>
                  )}
                </div>

                {/* Team Leader Email */}
                <div className="space-y-1">
                  <label htmlFor="leaderEmail" className="font-bold text-sm tracking-wide block">
                    Team Leader Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                    <input
                      id="leaderEmail"
                      type="email"
                      name="leaderEmail"
                      value={formData.leaderEmail}
                      onChange={handleChange}
                      placeholder="e.g. rahul@example.com"
                      className="w-full text-sm font-medium border-2 border-[#191A23] bg-[#F3F3F3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B9FF66]/50 transition-all font-mono"
                    />
                  </div>
                  {errors.leaderEmail && (
                    <span className="text-xs text-red-600 font-bold block">{errors.leaderEmail}</span>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* Choose Domain */}
                <div className="space-y-1">
                  <label htmlFor="track" className="font-bold text-sm tracking-wide block">
                    Domain <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="track"
                    name="track"
                    value={formData.track}
                    onChange={handleChange}
                    className="w-full text-sm font-bold border-2 border-[#191A23] bg-[#F3F3F3] p-3 rounded-xl focus:outline-none focus:bg-white transition-all cursor-pointer"
                  >
                    {TRACKS.map(t => (
                      <option key={t.id} value={t.title}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team Size */}
                <div className="space-y-1">
                  <label className="font-bold text-sm tracking-wide block">
                    Team Size (Including yourself)
                  </label>
                  <div className="flex gap-2">
                    {[3, 4, 5].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, teamSize: size }))}
                        className={`flex-1 py-3 font-mono font-black text-center border-2 border-[#191A23] rounded-xl transition-all cursor-pointer ${
                          formData.teamSize === size
                            ? 'bg-[#B9FF66] shadow-[2px_2px_0px_#191A23] scale-[1.02]'
                            : 'bg-[#F3F3F3] hover:bg-[#e4e4e4]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Idea Stage */}
                <div className="space-y-1">
                  <label className="font-bold text-sm tracking-wide block">
                    Current Stage of Idea
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {['Idea', 'Validated Idea', 'Prototype'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                        className={`text-left text-xs font-semibold p-2.5 border-2 border-[#191A23] rounded-xl w-full transition-all flex items-center justify-between cursor-pointer ${
                          formData.experienceLevel === level
                            ? 'bg-[#B9FF66] font-extrabold border-[#191A23] shadow-[2px_2px_0px_#191A23]'
                            : 'bg-white hover:bg-[#F3F3F3]'
                        }`}
                      >
                        <span>{level}</span>
                        {formData.experienceLevel === level && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {/* Pitch deck link */}
                <div className="space-y-1">
                  <label htmlFor="githubUrl" className="font-bold text-sm tracking-wide block">
                    Pitch Deck Link <span className="text-[#191A23]/50 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                    <input
                      id="githubUrl"
                      type="text"
                      name="githubUrl"
                      value={formData.githubUrl}
                      onChange={handleChange}
                      placeholder="Drive, PDF, or pitch deck link"
                      className="w-full text-sm font-medium border-2 border-[#191A23] bg-[#F3F3F3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B9FF66]/50 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Agreement Panel */}
                <div className="bg-[#F3F3F3] border-2 border-[#191A23]/20 p-3.5 rounded-2xl text-[11px] leading-relaxed text-[#191A23]/80 space-y-2">
                  <p className="font-bold text-[#191A23]">Registration Declaration:</p>
                  <p>
                    I confirm the team details are correct and understand that teams must submit a pitch deck covering problem statement, SDG alignment, proposed solution, impact potential, feasibility, scalability, and sustainability.
                  </p>
                </div>

                {/* Checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    id="agreeToCodeOfConduct"
                    type="checkbox"
                    name="agreeToCodeOfConduct"
                    checked={formData.agreeToCodeOfConduct}
                    onChange={handleChange}
                    className="mt-1 cursor-pointer w-4 h-4 accent-[#B9FF66] border-2 border-[#191A23] rounded "
                  />
                  <label htmlFor="agreeToCodeOfConduct" className="text-xs font-bold leading-tight cursor-pointer">
                    I accept the above declaration and register.
                  </label>
                </div>
                {errors.agreeToCodeOfConduct && (
                  <span className="text-xs text-red-600 font-bold block">{errors.agreeToCodeOfConduct}</span>
                )}
                {submitError && (
                  <span className="text-xs text-red-600 font-bold block bg-red-50 border-2 border-red-200 rounded-xl p-3">{submitError}</span>
                )}
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex gap-3 pt-6 border-t-2 border-[#191A23]/10 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3 text-sm font-bold border-2 border-[#191A23] rounded-xl hover:bg-[#F3F3F3] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 text-sm font-black bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] rounded-xl shadow-[4px_4px_0px_#191A23] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#191A23] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Continue <ArrowRight className="w-4 h-4 animate-pulse" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 text-sm font-black bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] rounded-xl shadow-[4px_4px_0px_#191A23] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#191A23] active:translate-x-0 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:bg-opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center gap-1.5 font-mono">
                      FORGING TICKET...
                    </span>
                  ) : (
                    <>
                      Complete Booking <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
