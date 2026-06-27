import React, { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bot,
  BrainCircuit,
  Calendar,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  GraduationCap,
  GripVertical,
  HandHeart,
  HeartPulse,
  Image as ImageIcon,
  Laptop,
  Layers,
  Leaf,
  Lightbulb,
  Medal,
  Monitor,
  PlusCircle,
  Presentation,
  Palette,
  Redo2,
  Rocket,
  Save,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Trash2,
  Trophy,
  Undo2,
  UploadCloud,
  Users,
  Video,
  Wheat,
  Wifi,
  Battery,
  X,
} from 'lucide-react';
import DynamicLandingSections from '../DynamicLandingSections';
import Navbar from '../Navbar';
import Hero from '../Hero';
import Footer from '../Footer';
import DynamicFormModal from '../DynamicFormModal';
import { db, storage } from '../../lib/firebase';
import { landingAssetsCollection, LandingAsset, staticLandingAssets } from '../../lib/landingAssets';
import {
  createLandingButtonConfig,
  createLandingItem,
  createLandingSection,
  defaultGlobalTheme,
  LandingAlignment,
  LandingButtonConfig,
  LandingBorderRadius,
  LandingEditorContent,
  LandingFontFamily,
  LandingFooterConfig,
  LandingGlobalTheme,
  LandingGradientAngle,
  LandingHeaderConfig,
  LandingHeroConfig,
  LandingItem,
  LandingLink,
  LandingMedia,
  LandingSectionConfig,
  LandingSectionType,
} from '../../lib/landingContent';
import { formsCollection, normalizeRegistrationForm, RegistrationForm } from '../../lib/forms';

let uploadedLandingAssetsCache: LandingAsset[] | null = null;
let uploadedLandingAssetsRequest: Promise<LandingAsset[]> | null = null;

const loadUploadedLandingAssets = () => {
  if (uploadedLandingAssetsCache) return Promise.resolve(uploadedLandingAssetsCache);
  if (!uploadedLandingAssetsRequest) {
    uploadedLandingAssetsRequest = getDocs(collection(db, landingAssetsCollection)).then(snapshot => {
      uploadedLandingAssetsCache = snapshot.docs.map(assetDoc => ({
        id: assetDoc.id,
        source: 'uploaded' as const,
        ...(assetDoc.data() as Omit<LandingAsset, 'id' | 'source'>),
      }));
      return uploadedLandingAssetsCache;
    }).finally(() => { uploadedLandingAssetsRequest = null; });
  }
  return uploadedLandingAssetsRequest;
};

const FONT_OPTIONS: Array<{ value: LandingFontFamily; label: string; preview: string }> = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', preview: 'font-sans' },
  { value: 'Manrope', label: 'Manrope', preview: 'font-display' },
  { value: 'Inter', label: 'Inter', preview: 'font-sans' },
  { value: 'Poppins', label: 'Poppins', preview: 'font-sans' },
  { value: 'DM Sans', label: 'DM Sans', preview: 'font-sans' },
  { value: 'Outfit', label: 'Outfit', preview: 'font-sans' },
  { value: 'Nunito', label: 'Nunito', preview: 'font-sans' },
  { value: 'Roboto', label: 'Roboto', preview: 'font-sans' },
  { value: 'Space Grotesk', label: 'Space Grotesk', preview: 'font-sans' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', preview: 'font-mono' },
];

const COLOR_PRESETS = [
  '#050816','#1e293b','#334155','#64748b','#94a3b8','#ffffff','#f8f9fa','#f1f5f9',
  '#B9FF66','#CDB0E7','#FFA66C','#FFDA8A','#a7f3d0','#bae6fd','#fca5a5','#fbcfe8',
  '#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b','#ec4899','#06b6d4','#84cc16',
];

const GRADIENT_ANGLES: Array<{ value: LandingGradientAngle; label: string }> = [
  { value: '135deg', label: '↗ Diagonal' },
  { value: '180deg', label: '↓ Vertical' },
  { value: '90deg', label: '→ Horizontal' },
  { value: '45deg', label: '↘ Reverse' },
  { value: '0deg', label: '← Reverse H' },
];

const BORDER_RADIUS_OPTIONS: Array<{ value: LandingBorderRadius; label: string; preview: string }> = [
  { value: 'sharp', label: 'Sharp', preview: '0px' },
  { value: 'soft', label: 'Soft', preview: '12px' },
  { value: 'round', label: 'Round', preview: '28px' },
];

const MAX_WIDTH_OPTIONS = [
  { value: 'sm', label: 'Small (640px)' },
  { value: 'md', label: 'Medium (768px)' },
  { value: 'lg', label: 'Large (1024px)' },
  { value: 'xl', label: 'XL (1280px)' },
  { value: 'full', label: 'Full width' },
];

type SelectedLandingBlock = 'theme' | 'header' | 'hero' | 'footer' | string;
type SaveState = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error';
type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type MobileEditorTab = 'sections' | 'preview' | 'settings';

interface LandingEditorPageProps {
  content: LandingEditorContent;
  selectedBlockId: SelectedLandingBlock;
  onSelectBlock: (id: SelectedLandingBlock) => void;
  onChange: (content: LandingEditorContent) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saveState: SaveState;
  error?: string;
  updatedLabel?: string;
}

const sectionOptions: Array<{ type: LandingSectionType; label: string }> = [
  { type: 'about', label: 'About' },
  { type: 'domains', label: 'Domains' },
  { type: 'stages', label: 'Programme Stages' },
  { type: 'prizes', label: 'Prizes' },
  { type: 'mentors', label: 'Mentors' },
  { type: 'faq', label: 'FAQ' },
  { type: 'glimpses', label: 'Event Glimpses' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'highlights', label: 'Why Join (Highlights)' },
  { type: 'testimonials', label: 'What It Creates (Testimonials)' },
  { type: 'sponsors', label: 'Partners / Sponsors' },
  { type: 'cta', label: 'Call To Action' },
  { type: 'form-cta', label: 'Form CTA Section' },
  { type: 'custom', label: 'Custom' },
];

const iconPresets = [
  { name: 'Lightbulb', label: 'Idea', Icon: Lightbulb },
  { name: 'BrainCircuit', label: 'AI', Icon: BrainCircuit },
  { name: 'HeartPulse', label: 'Health', Icon: HeartPulse },
  { name: 'GraduationCap', label: 'Education', Icon: GraduationCap },
  { name: 'Wheat', label: 'Agriculture', Icon: Wheat },
  { name: 'Leaf', label: 'Climate', Icon: Leaf },
  { name: 'Bot', label: 'Digital', Icon: Bot },
  { name: 'HandHeart', label: 'Social', Icon: HandHeart },
  { name: 'Rocket', label: 'Startup', Icon: Rocket },
  { name: 'Users', label: 'Community', Icon: Users },
  { name: 'Globe2', label: 'Global', Icon: Globe2 },
  { name: 'ShieldCheck', label: 'Admin', Icon: ShieldCheck },
  { name: 'Calendar', label: 'Date', Icon: Calendar },
  { name: 'Presentation', label: 'Pitch', Icon: Presentation },
  { name: 'Award', label: 'Award', Icon: Award },
  { name: 'Medal', label: 'Medal', Icon: Medal },
  { name: 'Trophy', label: 'Trophy', Icon: Trophy },
  { name: 'Sparkles', label: 'Magic', Icon: Sparkles },
  { name: 'Terminal', label: 'Tech', Icon: Terminal },
  { name: 'Video', label: 'Video', Icon: Video },
];

export default function LandingEditorPage({
  content,
  selectedBlockId,
  onSelectBlock,
  onChange,
  onSaveDraft,
  onPublish,
  saveState,
  error,
  updatedLabel,
}: LandingEditorPageProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [mobileTab, setMobileTab] = useState<MobileEditorTab>('preview');
  const [leftWidth, setLeftWidth] = useState(250);
  const [undoStack, setUndoStack] = useState<LandingEditorContent[]>([]);
  const [redoStack, setRedoStack] = useState<LandingEditorContent[]>([]);
  const [availableForms, setAvailableForms] = useState<RegistrationForm[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getDocs(collection(db, formsCollection)).then(snapshot => {
      if (!cancelled) setAvailableForms(snapshot.docs.map(item => normalizeRegistrationForm(item.id, item.data())).filter(form => form.status === 'active'));
    });
    return () => { cancelled = true; };
  }, []);
  const sections = useMemo(() => [...content.sections].sort((a, b) => a.order - b.order), [content.sections]);
  const selectedSection = sections.find(section => section.id === selectedBlockId);
  const selectedLabel = selectedBlockId === 'theme'
    ? 'Global Theme'
    : selectedBlockId === 'header'
      ? 'Header / Navbar'
      : selectedBlockId === 'hero'
        ? 'Hero Section'
        : selectedBlockId === 'footer'
          ? 'Footer Section'
          : selectedSection?.title || 'Landing section';

  const commitContent = (nextContent: LandingEditorContent) => {
    setUndoStack(prev => [...prev.slice(-39), content]);
    setRedoStack([]);
    onChange(nextContent);
  };
  const updateContent = (patch: Partial<LandingEditorContent>) => commitContent({ ...content, ...patch });
  const undo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [content, ...prev.slice(0, 39)]);
    onChange(previous);
  };
  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setUndoStack(prev => [...prev.slice(-39), content]);
    onChange(next);
  };
  const updateHeader = (patch: Partial<LandingHeaderConfig>) => updateContent({ header: { ...content.header, ...patch } });
  const updateHero = (patch: Partial<LandingHeroConfig>) => updateContent({ hero: { ...content.hero, ...patch } });
  const updateFooter = (patch: Partial<LandingFooterConfig>) => updateContent({ footer: { ...content.footer, ...patch } });
  const updateGlobalTheme = (patch: Partial<LandingGlobalTheme>) => updateContent({ globalTheme: { ...(content.globalTheme || defaultGlobalTheme), ...patch } });
  const updateSection = (sectionId: string, patch: Partial<LandingSectionConfig>) => {
    updateContent({
      sections: content.sections.map(section => section.id === sectionId ? { ...section, ...patch } : section),
    });
  };
  const addSection = (type: LandingSectionType) => {
    const nextOrder = Math.max(0, ...content.sections.map(section => section.order || 0)) + 1;
    const section = createLandingSection(type, nextOrder);
    updateContent({ sections: [...content.sections, section] });
    onSelectBlock(section.id);
  };
  const duplicateSection = (sectionId: string) => {
    const source = sections.find(s => s.id === sectionId);
    if (!source) return;
    const nextOrder = Math.max(0, ...content.sections.map(s => s.order || 0)) + 1;
    const uid = `${source.type}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: LandingSectionConfig = { ...JSON.parse(JSON.stringify(source)), id: uid, order: nextOrder, title: `${source.title} (copy)` };
    updateContent({ sections: [...content.sections, copy] });
    onSelectBlock(copy.id);
  };
  const removeSection = (sectionId: string) => {
    const nextSections = sections.filter(section => section.id !== sectionId).map((section, index) => ({ ...section, order: index + 1 }));
    updateContent({ sections: nextSections });
    onSelectBlock(nextSections[0]?.id || 'hero');
  };
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(section => section.id === sectionId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const next = [...sections];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    updateContent({ sections: next.map((section, index) => ({ ...section, order: index + 1 })) });
  };
  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = leftWidth;
    const handleMove = (moveEvent: PointerEvent) => {
      setLeftWidth(Math.min(420, Math.max(76, startWidth + moveEvent.clientX - startX)));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, content]);

  return (
    <div className="landing-editor-root" style={{ '--editor-left-width': `${leftWidth}px` } as CSSProperties}>
      <PreviewToolbar
        selectedLabel={selectedLabel}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        saveState={saveState}
        error={error}
        updatedLabel={updatedLabel}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="landing-editor-mobile-tabs" role="tablist" aria-label="Landing editor panels">
        {[
          ['sections', 'Sections', <Layers className="h-4 w-4" />],
          ['preview', 'Preview', <Monitor className="h-4 w-4" />],
          ['settings', 'Settings', <FileText className="h-4 w-4" />],
        ].map(([id, label, icon]) => (
          <button
            key={String(id)}
            type="button"
            onClick={() => setMobileTab(id as MobileEditorTab)}
            className={`landing-editor-mobile-tab ${mobileTab === id ? 'landing-editor-mobile-tab-active' : ''}`}
          >
            {icon as ReactNode}{label}
          </button>
        ))}
      </div>

      <div className="landing-editor-shell">
        <div className={`landing-editor-panel-wrap landing-editor-panel-left ${mobileTab === 'sections' ? 'landing-editor-mobile-active' : ''}`}>
          <SectionSidebar
            content={content}
            sections={sections}
            selectedBlockId={selectedBlockId}
            onSelectBlock={(id) => {
              onSelectBlock(id);
              setMobileTab('settings');
            }}
            onAddSection={addSection}
            onDuplicateSection={duplicateSection}
            onToggleSection={(section) => updateSection(section.id, { visible: !section.visible })}
            onMoveSection={moveSection}
          />
          <div className="landing-editor-sidebar-resizer" onPointerDown={startSidebarResize} role="separator" aria-label="Resize sections panel" />
        </div>

        <div className={`landing-editor-panel-wrap landing-editor-panel-preview ${mobileTab === 'preview' ? 'landing-editor-mobile-active' : ''}`}>
          <LandingPreview
            content={content}
            selectedBlockId={selectedBlockId}
            previewMode={previewMode}
            availableForms={availableForms}
            onSelectBlock={(id) => {
              onSelectBlock(id);
              setMobileTab('settings');
            }}
          />
        </div>

        <div className={`landing-editor-panel-wrap landing-editor-panel-right ${mobileTab === 'settings' ? 'landing-editor-mobile-active' : ''}`}>
          <SectionSettingsPanel
            content={content}
            selectedBlockId={selectedBlockId}
            selectedSection={selectedSection}
            selectedLabel={selectedLabel}
            onUpdateHeader={updateHeader}
            onUpdateHero={updateHero}
            onUpdateFooter={updateFooter}
            onUpdateSection={updateSection}
            onRemoveSection={removeSection}
            onUpdateGlobalTheme={updateGlobalTheme}
            availableForms={availableForms}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewToolbar({
  selectedLabel,
  previewMode,
  setPreviewMode,
  saveState,
  error,
  updatedLabel,
  onSaveDraft,
  onPublish,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  selectedLabel: string;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  saveState: SaveState;
  error?: string;
  updatedLabel?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const statusLabel = saveState === 'saving'
    ? 'Saving draft'
    : saveState === 'saved'
      ? 'Draft saved'
      : saveState === 'publishing'
        ? 'Publishing'
        : saveState === 'published'
          ? 'Published'
          : saveState === 'error'
            ? 'Needs attention'
            : 'Draft';

  return (
    <div className="landing-editor-toolbar">
      <div className="landing-editor-toolbar-title">
        <span className="landing-editor-toolbar-icon"><Monitor className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="landing-editor-title-row">
            <h2>Landing Editor</h2>
            <span className={`landing-editor-status landing-editor-status-${saveState}`}>{statusLabel}</span>
          </div>
          <p>{selectedLabel}{updatedLabel ? ` - ${updatedLabel}` : ''}</p>
          {error && <p className="landing-editor-toolbar-error">{error}</p>}
        </div>
      </div>

      <div className="landing-editor-toolbar-actions">
        <div className="landing-editor-history-actions">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <div className="landing-editor-device-toggle">
          <button type="button" onClick={() => setPreviewMode('desktop')} className={previewMode === 'desktop' ? 'active' : ''}>
            <Laptop className="h-4 w-4" /> Desktop
          </button>
          <button type="button" onClick={() => setPreviewMode('tablet')} className={previewMode === 'tablet' ? 'active' : ''}>
            <Tablet className="h-4 w-4" /> Tablet
          </button>
          <button type="button" onClick={() => setPreviewMode('mobile')} className={previewMode === 'mobile' ? 'active' : ''}>
            <Smartphone className="h-4 w-4" /> Mobile
          </button>
        </div>
        <button type="button" onClick={onSaveDraft} disabled={saveState === 'saving' || saveState === 'publishing'} className="admin-secondary-btn landing-editor-action-btn disabled:opacity-60">
          <Save className="h-4 w-4" /> Save Draft
        </button>
        <button type="button" onClick={onPublish} disabled={saveState === 'saving' || saveState === 'publishing'} className="admin-primary-btn landing-editor-action-btn disabled:opacity-60">
          <Send className="h-4 w-4" /> Publish
        </button>
      </div>
    </div>
  );
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  about: '#B9FF66', domains: '#CDB0E7', stages: '#FFA66C', prizes: '#FFDA8A',
  mentors: '#bae6fd', faq: '#a7f3d0', glimpses: '#fca5a5', gallery: '#fbcfe8',
  highlights: '#d9f99d', testimonials: '#ddd6fe', sponsors: '#fed7aa', cta: '#fde68a',
  custom: '#e2e8f0',
};

function SectionSidebar({
  content, sections, selectedBlockId, onSelectBlock, onAddSection, onDuplicateSection, onToggleSection, onMoveSection,
}: {
  content: LandingEditorContent;
  sections: LandingSectionConfig[];
  selectedBlockId: SelectedLandingBlock;
  onSelectBlock: (id: SelectedLandingBlock) => void;
  onAddSection: (type: LandingSectionType) => void;
  onDuplicateSection: (id: string) => void;
  onToggleSection: (section: LandingSectionConfig) => void;
  onMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
}) {
  const [addType, setAddType] = useState<LandingSectionType>('custom');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = sections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="landing-editor-sidebar">
      <div className="landing-editor-panel-heading">
        <p>Home page</p>
        <h3>Sections</h3>
      </div>
      <button type="button" onClick={() => onSelectBlock('theme')} className={`landing-editor-theme-btn ${selectedBlockId === 'theme' ? 'selected' : ''}`}>
        <span className="landing-editor-theme-icon">
          <Palette className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="landing-editor-layer-title">Global Theme</span>
          <span className="landing-editor-layer-subtitle">Fonts · Colors · Style</span>
        </span>
        <Sparkles className="h-3.5 w-3.5 opacity-40" />
      </button>
      <div className="landing-editor-search">
        <Search className="h-4 w-4 flex-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Find section..."
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 ml-1.5 flex-none">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="landing-editor-layer-group">
        <SidebarButton id="header" title="Header / Navbar" detail={`${content.header.navLinks.length} links`} selected={selectedBlockId === 'header'} visible onSelect={onSelectBlock} />
        <SidebarButton id="hero" title="Hero Section" detail={content.hero.badge || 'Hero banner'} selected={selectedBlockId === 'hero'} visible={content.hero.visible} onSelect={onSelectBlock} />
      </div>
      <div className="landing-editor-divider" />
      <div className="landing-editor-layer-group">
        {filteredSections.map((section, index) => (
          <div key={section.id} className={`landing-editor-layer-card ${selectedBlockId === section.id ? 'selected' : ''} ${section.visible ? '' : 'muted'}`}>
            <button type="button" onClick={() => onSelectBlock(section.id)} className="landing-editor-layer-main">
              <GripVertical className="h-4 w-4 flex-none text-slate-300" />
              <span className="min-w-0 flex-1">
                <span className="landing-editor-layer-title">{section.title}</span>
                <span className="landing-editor-layer-subtitle">
                  <span className="landing-editor-type-badge" style={{ background: SECTION_TYPE_COLORS[section.type] || '#e2e8f0' }}>{section.type}</span>
                  {' '}{section.items.length} items
                </span>
              </span>
              {section.visible ? <Eye className="h-4 w-4 text-slate-500" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
            </button>
            <div className="landing-editor-layer-tools">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onToggleSection(section)} className="landing-editor-icon-btn" title={section.visible ? 'Hide' : 'Show'}>{section.visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                <button type="button" onClick={() => onDuplicateSection(section.id)} className="landing-editor-icon-btn" title="Duplicate"><Layers className="h-3 w-3" /></button>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onMoveSection(section.id, 'up')} disabled={!!searchQuery || index === 0} className="landing-editor-icon-btn disabled:opacity-40"><ArrowUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => onMoveSection(section.id, 'down')} disabled={!!searchQuery || index === sections.length - 1} className="landing-editor-icon-btn disabled:opacity-40"><ArrowDown className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="landing-editor-add-section">
        <p className="landing-editor-add-label">Add section</p>
        <div className="landing-editor-add-row">
          <select className="admin-input" value={addType} onChange={e => setAddType(e.target.value as LandingSectionType)}>
            {sectionOptions.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
          </select>
          <button type="button" onClick={() => onAddSection(addType)} className="admin-primary-btn landing-editor-add-btn" title="Add section">
            <PlusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="landing-editor-footer-layer">
        <SidebarButton id="footer" title="Footer Section" detail={`${content.footer.links.length} links`} selected={selectedBlockId === 'footer'} visible onSelect={onSelectBlock} />
      </div>
    </aside>
  );
}

function SidebarButton({ id, title, detail, selected, visible, onSelect }: { id: SelectedLandingBlock; title: string; detail: string; selected: boolean; visible: boolean; onSelect: (id: SelectedLandingBlock) => void }) {
  return (
    <button type="button" onClick={() => onSelect(id)} className={`landing-editor-static-layer ${selected ? 'selected' : ''} ${visible ? '' : 'muted'}`}>
      <span className="min-w-0">
        <span className="landing-editor-layer-title">{title}</span>
        <span className="landing-editor-layer-subtitle">{detail}</span>
      </span>
      {visible ? <Eye className="h-4 w-4 flex-none" /> : <EyeOff className="h-4 w-4 flex-none opacity-50" />}
    </button>
  );
}

function IframePreview({ children, className }: { children: ReactNode; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const copyStyles = () => {
      doc.head.innerHTML = '';

      const styles = document.querySelectorAll('link[rel="stylesheet"], style');
      styles.forEach((style) => {
        doc.head.appendChild(style.cloneNode(true));
      });

      const baseStyle = doc.createElement('style');
      baseStyle.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: white;
          overflow-x: hidden;
          font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
        }
        /* Custom scrollbar for iframe body to match the mockup style */
        body::-webkit-scrollbar {
          width: 4px;
        }
        body::-webkit-scrollbar-track {
          background: transparent;
        }
        body::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 99px;
        }
      `;
      doc.head.appendChild(baseStyle);
    };

    copyStyles();

    const syncTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      doc.documentElement.setAttribute('data-theme', currentTheme);
      doc.documentElement.className = document.documentElement.className;
    };
    syncTheme();

    const observer = new MutationObserver(() => {
      copyStyles();
      syncTheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    observer.observe(document.head, { childList: true, subtree: true });

    setMountNode(doc.body);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
      title="Preview Frame"
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}

function LandingPreview({ content, selectedBlockId, previewMode, onSelectBlock, availableForms }: { content: LandingEditorContent; selectedBlockId: SelectedLandingBlock; previewMode: PreviewMode; onSelectBlock: (id: SelectedLandingBlock) => void; availableForms: RegistrationForm[] }) {
  const [previewForm, setPreviewForm] = useState<RegistrationForm | null>(null);
  const [previewSource, setPreviewSource] = useState({ section: '', button: '' });
  const [previewWarning, setPreviewWarning] = useState('');
  const handleButtonAction = (config: LandingButtonConfig, sourceSection: string) => {
    if (!config.visible || config.actionType === 'none') return;
    if (config.actionType === 'form') {
      const form = availableForms.find(item => item.id === config.formId);
      if (form) {
        setPreviewSource({ section: sourceSection, button: config.text });
        setPreviewForm(form);
      } else {
        setPreviewWarning(config.formId ? 'The assigned form is inactive or missing.' : 'No form is assigned to this button.');
        window.setTimeout(() => setPreviewWarning(''), 3000);
      }
      return;
    }
    if (config.actionType === 'section') {
      document.getElementById(config.sectionId.replace(/^#/, ''))?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const makeClickWrapper = (id: string, children: ReactNode, extra?: string) => (
    <div
      onClick={(e) => { e.stopPropagation(); onSelectBlock(id); }}
      className={`cursor-pointer transition ${selectedBlockId === id ? 'landing-preview-selected' : ''} ${extra || ''}`}
    >
      {children}
    </div>
  );

  const previewSections = (
    <>
        {makeClickWrapper('header',
          <Navbar
            content={content.header}
            isLoggedIn={false}
            isAdmin={false}
            isJudge={false}
            isVolunteer={false}
            onRegisterClick={() => {}}
            onAdminClick={() => {}}
            onJudgeClick={() => {}}
            onVolunteerClick={() => {}}
            onDashboardClick={() => {}}
            onHomeClick={() => {}}
            onAuthClick={() => {}}
            onProfileClick={() => {}}
            onButtonAction={handleButtonAction}
          />
        )}

        {makeClickWrapper('hero', <Hero content={content.hero} onRegisterClick={() => {}} onButtonAction={handleButtonAction} />)}

        <DynamicLandingSections content={content} selectedSectionId={selectedBlockId} onSelectSection={onSelectBlock} onButtonAction={handleButtonAction} preview />

        {makeClickWrapper('footer',
          <Footer content={content.footer} />
        )}
    </>
  );

  return (
    <main className="landing-editor-canvas">
      {previewWarning && <div className="fixed left-1/2 top-20 z-[90] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 shadow-lg">{previewWarning}</div>}
      <DynamicFormModal form={previewForm} sourceSection={previewSource.section} sourceButton={previewSource.button} preview onClose={() => setPreviewForm(null)} />
      {previewMode === 'mobile' ? (
        <div className="landing-phone-mockup-wrapper">
          <div className="landing-phone-chassis">
            <div className="landing-phone-btn landing-phone-mute" />
            <div className="landing-phone-btn landing-phone-vol-up" />
            <div className="landing-phone-btn landing-phone-vol-down" />
            <div className="landing-phone-btn landing-phone-power" />
            <div className="landing-phone-screen">
              <div className="landing-phone-statusbar">
                <span className="landing-phone-time">9:41</span>
                <div className="landing-phone-dynamic-island">
                  <div className="landing-phone-camera" />
                  <div className="landing-phone-sensor" />
                </div>
                <div className="landing-phone-icons">
                  <span className="landing-phone-signal" />
                  <Wifi className="h-3.5 w-3.5 text-white" />
                  <Battery className="h-4 w-4 text-white fill-white" />
                </div>
              </div>
              <div className="landing-phone-viewport">
                <IframePreview>
                  {previewSections}
                </IframePreview>
              </div>
              <div className="landing-phone-home-indicator" />
            </div>
          </div>
        </div>
      ) : previewMode === 'tablet' ? (
        <div className="landing-tablet-mockup-wrapper">
          <div className="landing-tablet-chassis">
            <div className="landing-tablet-camera" />
            <div className="landing-tablet-screen">
              <div className="landing-tablet-viewport">
                <IframePreview>
                  {previewSections}
                </IframePreview>
              </div>
              <div className="landing-tablet-home-indicator" />
            </div>
          </div>
        </div>
      ) : (
        <div className="landing-editor-preview-frame landing-editor-preview-desktop">
          {previewSections}
        </div>
      )}
    </main>
  );
}


function SectionSettingsPanel({
  content, selectedBlockId, selectedSection, selectedLabel,
  onUpdateHeader, onUpdateHero, onUpdateFooter, onUpdateSection, onRemoveSection, onUpdateGlobalTheme, availableForms,
}: {
  content: LandingEditorContent;
  selectedBlockId: SelectedLandingBlock;
  selectedSection?: LandingSectionConfig;
  selectedLabel: string;
  onUpdateHeader: (patch: Partial<LandingHeaderConfig>) => void;
  onUpdateHero: (patch: Partial<LandingHeroConfig>) => void;
  onUpdateFooter: (patch: Partial<LandingFooterConfig>) => void;
  onUpdateSection: (sectionId: string, patch: Partial<LandingSectionConfig>) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateGlobalTheme: (patch: Partial<LandingGlobalTheme>) => void;
  availableForms: RegistrationForm[];
}) {
  return (
    <aside className="landing-editor-inspector">
      <div className="landing-editor-inspector-heading">
        <span>{selectedBlockId === 'theme' ? <Sparkles className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
        <div><h3>Settings</h3><p>{selectedLabel}</p></div>
      </div>
      {selectedBlockId === 'theme' && <GlobalThemeSettings theme={content.globalTheme || defaultGlobalTheme} onUpdate={onUpdateGlobalTheme} />}
      {selectedBlockId === 'header' && <HeaderSettings header={content.header} onUpdate={onUpdateHeader} availableForms={availableForms} />}
      {selectedBlockId === 'hero' && <HeroSettings hero={content.hero} onUpdate={onUpdateHero} availableForms={availableForms} />}
      {selectedBlockId === 'footer' && <FooterSettings footer={content.footer} onUpdate={onUpdateFooter} />}
      {selectedSection && (
        <GenericSectionSettings
          section={selectedSection}
          onUpdate={(patch) => onUpdateSection(selectedSection.id, patch)}
          onRemove={() => onRemoveSection(selectedSection.id)}
          availableForms={availableForms}
        />
      )}
    </aside>
  );
}

function GlobalThemeSettings({ theme, onUpdate }: { theme: LandingGlobalTheme; onUpdate: (patch: Partial<LandingGlobalTheme>) => void }) {
  return (
    <div className="landing-editor-inspector-stack">
      <InspectorGroup title="Typography" defaultOpen>
        <FontFamilyField label="Body font" value={theme.primaryFont} onChange={v => onUpdate({ primaryFont: v as LandingFontFamily })} />
        <FontFamilyField label="Heading font" value={theme.headingFont} onChange={v => onUpdate({ headingFont: v as LandingFontFamily })} />
      </InspectorGroup>
      <InspectorGroup title="Brand Colors" defaultOpen>
        <ColorField label="Primary color" value={theme.primaryColor} onChange={v => onUpdate({ primaryColor: v })} />
        <ColorField label="Accent color" value={theme.accentColor} onChange={v => onUpdate({ accentColor: v })} />
      </InspectorGroup>
      <InspectorGroup title="Site Colors" defaultOpen>
        <ColorField label="Site background" value={theme.siteBackground} onChange={v => onUpdate({ siteBackground: v })} />
        <ColorField label="Site text" value={theme.siteTextColor} onChange={v => onUpdate({ siteTextColor: v })} />
        <ColorField label="Card background" value={theme.cardBackground} onChange={v => onUpdate({ cardBackground: v })} />
        <ColorField label="Nav background" value={theme.navBackground} onChange={v => onUpdate({ navBackground: v })} />
      </InspectorGroup>
      <InspectorGroup title="Style Presets">
        <div className="landing-editor-field">
          <span>Border radius</span>
          <div className="landing-editor-preset-row">
            {BORDER_RADIUS_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => onUpdate({ borderRadius: opt.value })}
                className={`landing-editor-preset-btn ${theme.borderRadius === opt.value ? 'active' : ''}`}
                style={{ borderRadius: opt.preview }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </InspectorGroup>
    </div>
  );
}

function HeaderSettings({ header, onUpdate, availableForms }: { header: LandingHeaderConfig; onUpdate: (patch: Partial<LandingHeaderConfig>) => void; availableForms: RegistrationForm[] }) {
  return (
    <div className="landing-editor-inspector-stack">
      <InspectorGroup title="Content" defaultOpen>
        <EditableField label="Logo text" value={header.logoText} onChange={value => onUpdate({ logoText: value })} />
        <RepeatableLinkEditor title="Navigation links" links={header.navLinks} onChange={links => onUpdate({ navLinks: links })} />
      </InspectorGroup>
      <InspectorGroup title="Buttons" defaultOpen>
        <ButtonConfigEditor config={header.buttonConfig || createLandingButtonConfig(header.buttonText, header.buttonUrl)} forms={availableForms} onChange={buttonConfig => onUpdate({ buttonConfig, buttonText: buttonConfig.text, buttonUrl: buttonConfig.externalUrl || (buttonConfig.sectionId ? `#${buttonConfig.sectionId}` : '') })} />
        <ToggleField label="Show admin button" checked={header.showAdminButton} onChange={value => onUpdate({ showAdminButton: value })} />
        <ToggleField label="Show register button" checked={header.showRegisterButton} onChange={value => onUpdate({ showRegisterButton: value })} />
      </InspectorGroup>
    </div>
  );
}

function HeroSettings({ hero, onUpdate, availableForms }: { hero: LandingHeroConfig; onUpdate: (patch: Partial<LandingHeroConfig>) => void; availableForms: RegistrationForm[] }) {
  return (
    <div className="landing-editor-inspector-stack">
      <InspectorGroup title="Content" defaultOpen>
        <ToggleField label="Visible" checked={hero.visible} onChange={value => onUpdate({ visible: value })} />
        <EditableField label="Badge text" value={hero.badge} onChange={value => onUpdate({ badge: value })} />
        <EditableField label="Main heading" value={hero.heading} onChange={value => onUpdate({ heading: value })} />
        <EditableField label="Subheading" value={hero.subheading} onChange={value => onUpdate({ subheading: value })} />
        <EditableField label="Description" value={hero.description} onChange={value => onUpdate({ description: value })} textarea />
      </InspectorGroup>
      <InspectorGroup title="Buttons" defaultOpen>
        <p className="text-xs font-bold text-slate-500">Primary button</p>
        <ButtonConfigEditor config={hero.primaryButtonConfig || createLandingButtonConfig(hero.primaryButtonText, hero.primaryButtonUrl)} forms={availableForms} onChange={primaryButtonConfig => onUpdate({ primaryButtonConfig, primaryButtonText: primaryButtonConfig.text, primaryButtonUrl: primaryButtonConfig.externalUrl || (primaryButtonConfig.sectionId ? `#${primaryButtonConfig.sectionId}` : '') })} />
        <p className="mt-3 text-xs font-bold text-slate-500">Secondary button</p>
        <ButtonConfigEditor config={hero.secondaryButtonConfig || createLandingButtonConfig(hero.secondaryButtonText, hero.secondaryButtonUrl)} forms={availableForms} onChange={secondaryButtonConfig => onUpdate({ secondaryButtonConfig, secondaryButtonText: secondaryButtonConfig.text, secondaryButtonUrl: secondaryButtonConfig.externalUrl || (secondaryButtonConfig.sectionId ? `#${secondaryButtonConfig.sectionId}` : '') })} />
      </InspectorGroup>
      <InspectorGroup title="Media" defaultOpen>
        <MediaUploadField
          label="Hero media"
          value={hero.media?.url || hero.imageUrl}
          media={hero.media}
          pathPrefix="hero"
          onChange={(value, media) => onUpdate({ imageUrl: value, media })}
        />
      </InspectorGroup>
      <InspectorGroup title="Layout">
        <label className="landing-editor-field">
          <span>Alignment</span>
          <select className="admin-input" value={hero.alignment} onChange={event => onUpdate({ alignment: event.target.value as LandingAlignment })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </label>
      </InspectorGroup>
      <InspectorGroup title="Appearance">
        <div className="landing-editor-two-col">
          <ColorField label="Background" value={hero.backgroundColor} onChange={value => onUpdate({ backgroundColor: value })} />
          <ColorField label="Text" value={hero.textColor} onChange={value => onUpdate({ textColor: value })} />
        </div>
      </InspectorGroup>
    </div>
  );
}

function FooterSettings({ footer, onUpdate }: { footer: LandingFooterConfig; onUpdate: (patch: Partial<LandingFooterConfig>) => void }) {
  return (
    <div className="landing-editor-inspector-stack">
      <InspectorGroup title="Content" defaultOpen>
        <EditableField label="Footer logo text" value={footer.logoText} onChange={value => onUpdate({ logoText: value })} />
        <EditableField label="Description" value={footer.description} onChange={value => onUpdate({ description: value })} textarea />
        <EditableField label="Copyright text" value={footer.copyrightText} onChange={value => onUpdate({ copyrightText: value })} />
      </InspectorGroup>
      <InspectorGroup title="Links" defaultOpen>
        <RepeatableLinkEditor title="Footer links" links={footer.links} onChange={links => onUpdate({ links })} />
        <RepeatableLinkEditor title="Social links" links={footer.socialLinks} onChange={socialLinks => onUpdate({ socialLinks })} />
      </InspectorGroup>
    </div>
  );
}

function GenericSectionSettings({ section, onUpdate, onRemove, availableForms }: { section: LandingSectionConfig; onUpdate: (patch: Partial<LandingSectionConfig>) => void; onRemove: () => void; availableForms: RegistrationForm[] }) {
  return (
    <div className="landing-editor-inspector-stack">
      <InspectorGroup title="Content" defaultOpen>
        <ToggleField label="Visible" checked={section.visible} onChange={value => onUpdate({ visible: value })} />
        <EditableField label="Section title" value={section.title} onChange={value => onUpdate({ title: value })} />
        {section.type !== 'cta' && section.type !== 'form-cta' && (
          <EditableField label="Description" value={section.description || ''} onChange={value => onUpdate({ description: value })} textarea />
        )}
        {(section.type === 'highlights' || section.type === 'testimonials' || section.type === 'sponsors' || section.type === 'cta') && (
          <EditableField label="Eyebrow / label" value={section.eyebrow || ''} onChange={value => onUpdate({ eyebrow: value })} />
        )}
        {(section.type === 'cta' || section.type === 'form-cta') && (
          <>
            <EditableField label="Heading" value={section.title} onChange={value => onUpdate({ title: value })} />
            <EditableField label="Description" value={section.description || ''} onChange={value => onUpdate({ description: value })} textarea />
          </>
        )}
      </InspectorGroup>
      <InspectorGroup title="Button" defaultOpen>
        <ButtonConfigEditor config={section.buttonConfig || createLandingButtonConfig(section.primaryButtonText || 'Learn more', section.primaryButtonUrl || '')} forms={availableForms} onChange={buttonConfig => onUpdate({ buttonConfig, primaryButtonText: buttonConfig.text, primaryButtonUrl: buttonConfig.externalUrl || (buttonConfig.sectionId ? `#${buttonConfig.sectionId}` : '') })} />
        {section.type === 'form-cta' && <label className="landing-editor-field"><span>Layout style</span><select className="admin-input landing-editor-control" value={section.layoutStyle || 'centered'} onChange={event => onUpdate({ layoutStyle: event.target.value as LandingSectionConfig['layoutStyle'] })}><option value="centered">Centered</option><option value="split">Split</option><option value="card">Card</option></select></label>}
      </InspectorGroup>
      {(section.type === 'about' || section.type === 'custom' || section.type === 'form-cta') && (
        <InspectorGroup title="Media" defaultOpen>
          <MediaUploadField
            label="Section media"
            value={section.media?.url || section.imageUrl || ''}
            media={section.media}
            pathPrefix={section.type}
            onChange={(value, media) => onUpdate({ imageUrl: value, media })}
          />
        </InspectorGroup>
      )}
      <InspectorGroup title={itemTitle(section.type)} defaultOpen>
        <RepeatableItemEditor
          sectionType={section.type}
          items={section.items}
          onChange={items => onUpdate({ items })}
        />
      </InspectorGroup>
      <InspectorGroup title="Appearance">
        <div className="landing-editor-two-col">
          <ColorField label="Background" value={section.backgroundColor || ''} onChange={value => onUpdate({ backgroundColor: value })} />
          <ColorField label="Text Color" value={section.textColor || ''} onChange={value => onUpdate({ textColor: value })} />
        </div>
        <ToggleField label="Use Gradient Background" checked={Boolean(section.gradient)} onChange={value => onUpdate({ gradient: value })} />
        {section.gradient && (
          <>
            <div className="landing-editor-two-col mt-2">
              <ColorField label="Gradient From" value={section.gradientFrom || '#ffffff'} onChange={value => onUpdate({ gradientFrom: value })} />
              <ColorField label="Gradient To" value={section.gradientTo || '#f1f5f9'} onChange={value => onUpdate({ gradientTo: value })} />
            </div>
            <label className="landing-editor-field mt-2">
              <span>Gradient Angle</span>
              <select className="admin-input landing-editor-control" value={section.gradientAngle || '180deg'} onChange={event => onUpdate({ gradientAngle: event.target.value as LandingGradientAngle })}>
                {GRADIENT_ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
              </select>
            </label>
          </>
        )}
      </InspectorGroup>
      <InspectorGroup title="Typography">
        <FontFamilyField label="Section Font" value={section.fontFamily || 'Plus Jakarta Sans'} onChange={value => onUpdate({ fontFamily: value as LandingFontFamily })} />
      </InspectorGroup>
      <InspectorGroup title="Spacing">
        <div className="landing-editor-slider-grid">
          <RangeField
            label="Padding Top"
            value={section.paddingTop ?? 56}
            min={0}
            max={160}
            step={8}
            suffix="px"
            onChange={v => onUpdate({ paddingTop: v })}
          />
          <RangeField
            label="Padding Bottom"
            value={section.paddingBottom ?? 56}
            min={0}
            max={160}
            step={8}
            suffix="px"
            onChange={v => onUpdate({ paddingBottom: v })}
          />
        </div>
      </InspectorGroup>
      <InspectorGroup title="Layout">
        <label className="landing-editor-field">
          <span>Alignment</span>
          <select className="admin-input landing-editor-control" value={section.sectionAlignment || 'left'} onChange={event => onUpdate({ sectionAlignment: event.target.value as LandingAlignment })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </label>
        <label className="landing-editor-field mt-2">
          <span>Max Width</span>
          <select className="admin-input landing-editor-control" value={section.maxWidth || 'lg'} onChange={event => onUpdate({ maxWidth: event.target.value as any })}>
            {MAX_WIDTH_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
      </InspectorGroup>
      <InspectorGroup title="Advanced">
        <button type="button" onClick={onRemove} className="landing-editor-danger-btn">
          <Trash2 className="h-4 w-4" /> Remove section
        </button>
      </InspectorGroup>
    </div>
  );
}

function InspectorGroup({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`landing-editor-inspector-group ${open ? 'open' : ''}`}>
      <button type="button" onClick={() => setOpen(prev => !prev)} className="landing-editor-inspector-group-trigger">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      <div className="landing-editor-inspector-group-body">
        {children}
      </div>
    </section>
  );
}

const assetToMedia = (asset: LandingAsset): LandingMedia => ({
  type: asset.type,
  assetId: asset.id,
  url: asset.url,
  thumbnailUrl: asset.thumbnailUrl,
  alt: asset.alt || asset.title,
  title: asset.title,
  fit: 'cover',
  position: '50% 50%',
  focalX: 50,
  focalY: 50,
  zoom: 1,
});

function MediaUploadField({
  label,
  value,
  media,
  pathPrefix,
  previewShape = 'wide',
  onChange,
}: {
  label: string;
  value: string;
  media?: LandingMedia;
  pathPrefix: string;
  previewShape?: 'wide' | 'passport';
  onChange: (value: string, media?: LandingMedia) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<LandingAsset[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadUploadedLandingAssets().then(assets => { if (!cancelled) setUploadedAssets(assets); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load assets.'); });
    return () => { cancelled = true; };
  }, []);

  const allAssets = useMemo(() => {
    const seen = new Set<string>();
    return [...staticLandingAssets, ...uploadedAssets].filter(asset => {
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });
  }, [uploadedAssets]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
    if (!isImage && !isVideo) {
      setError('Unsupported file type. Use PNG, JPG, WEBP, SVG, MP4, WEBM, or MOV.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('File is too large. Maximum size is 30MB.');
      return;
    }

    setError('');
    setProgress(1);
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
    const fileRef = ref(storage, `landing-assets/${pathPrefix}/${Date.now()}-${safeName}`);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on(
      'state_changed',
      snapshot => setProgress(Math.max(1, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))),
      uploadError => {
        setProgress(null);
        setError(uploadError.message || 'Upload failed.');
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const assetId = `${pathPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nextAsset: LandingAsset = {
          id: assetId,
          type: isVideo ? 'video' : 'image',
          title: file.name,
          url,
          thumbnailUrl: isImage ? url : undefined,
          alt: file.name.replace(/\.[^.]+$/, ''),
          size: file.size,
          mimeType: file.type,
          createdAt: new Date().toISOString(),
          source: 'uploaded',
        };
        await setDoc(doc(db, landingAssetsCollection, assetId), {
          ...nextAsset,
          source: 'uploaded',
          createdAt: serverTimestamp(),
        });
        uploadedLandingAssetsCache = [...(uploadedLandingAssetsCache || uploadedAssets), nextAsset];
        setUploadedAssets(uploadedLandingAssetsCache);
        onChange(url, assetToMedia(nextAsset));
        setProgress(null);
      },
    );
  };

  const handleDeleteAsset = async (asset: LandingAsset) => {
    if (asset.source !== 'uploaded') return;
    if (!window.confirm(`Are you sure you want to delete "${asset.title}"?`)) return;
    try {
      setError('');
      await deleteDoc(doc(db, landingAssetsCollection, asset.id));
      uploadedLandingAssetsCache = (uploadedLandingAssetsCache || uploadedAssets).filter(item => item.id !== asset.id);
      setUploadedAssets(uploadedLandingAssetsCache);
      try {
        const storageRef = ref(storage, asset.url);
        await deleteObject(storageRef);
      } catch (storageErr) {
        console.warn('Storage deletion failed (might be expected):', storageErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete asset.');
    }
  };

  const selectedIsVideo = media?.type === 'video' || /\.(mp4|webm|mov)(\?|#|$)/i.test(value);
  const updateMedia = (patch: Partial<LandingMedia>) => {
    if (!value) return;
    const nextFocalX = patch.focalX ?? media?.focalX ?? 50;
    const nextFocalY = patch.focalY ?? media?.focalY ?? 50;
    onChange(value, {
      type: selectedIsVideo ? 'video' : 'image',
      url: value,
      fit: 'cover',
      focalX: 50,
      focalY: 50,
      zoom: 1,
      ...(media || {}),
      ...patch,
      position: `${nextFocalX}% ${nextFocalY}%`,
    });
  };
  const focalX = media?.focalX ?? 50;
  const focalY = media?.focalY ?? 50;
  const zoom = media?.zoom ?? 1;
  const mediaStyle = {
    objectFit: media?.fit || 'cover',
    objectPosition: `${focalX}% ${focalY}%`,
    transform: `scale(${zoom}) rotate(${media?.rotate || 0}deg)`,
    transformOrigin: `${focalX}% ${focalY}%`,
  };

  return (
    <div className="landing-editor-media-field">
      <div className={`landing-editor-media-preview landing-editor-media-preview-${previewShape} ${value ? 'has-media' : 'empty'}`}>
        {value ? (
          selectedIsVideo ? (
            <video
              src={value}
              poster={media?.posterUrl || media?.thumbnailUrl}
              style={mediaStyle}
              muted
              autoPlay
              loop
              playsInline
            />
          ) : (
            <img
              src={value}
              alt={media?.alt || ''}
              style={mediaStyle}
            />
          )
        ) : (
          <div>
            <ImageIcon className="mx-auto h-7 w-7" />
            <p>No media selected</p>
          </div>
        )}
      </div>
      <div className="landing-editor-media-actions">
        <button type="button" onClick={() => setPickerOpen(true)} className="landing-editor-upload-button">
          <ImageIcon className="h-4 w-4" /> Choose from assets
        </button>
        <label className="landing-editor-upload-button">
          <UploadCloud className="h-4 w-4" />
          <span>{progress === null ? `Upload ${label}` : `Uploading ${progress}%`}</span>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime" onChange={handleFile} />
        </label>
      </div>
      {progress !== null && <div className="landing-editor-upload-progress"><span style={{ width: `${progress}%` }} /></div>}
      {value && (
        <button type="button" onClick={() => onChange('', undefined)} className="landing-editor-clear-media">
          Remove media
        </button>
      )}
      {media?.type !== 'video' && (
        <EditableField label="Alt text" value={media?.alt || ''} onChange={alt => onChange(value, value ? { ...(media || { type: 'image', url: value }), alt } : undefined)} />
      )}
      {media?.type === 'video' && (
        <EditableField label="Poster / thumbnail URL" value={media.posterUrl || media.thumbnailUrl || ''} onChange={posterUrl => onChange(value, value ? { ...media, posterUrl, thumbnailUrl: posterUrl } : undefined)} />
      )}
      <EditableField
        label="URL fallback"
        value={value}
        onChange={nextUrl => onChange(nextUrl, nextUrl ? { ...(media || { type: /\.(mp4|webm|mov)(\?|#|$)/i.test(nextUrl) ? 'video' : 'image', url: nextUrl }), url: nextUrl } : undefined)}
      />
      {value && (
        <div className="landing-editor-crop-panel">
          <div className="landing-editor-crop-head">
            <p>Crop & Position</p>
            <button type="button" onClick={() => updateMedia({ fit: 'cover', focalX: 50, focalY: 50, zoom: 1, rotate: 0 })}>
              Reset
            </button>
          </div>
          <label className="landing-editor-field">
            <span>Object fit</span>
            <select className="admin-input landing-editor-control" value={media?.fit || 'cover'} onChange={event => updateMedia({ fit: event.target.value as LandingMedia['fit'] })}>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
              <option value="none">None</option>
              <option value="scale-down">Scale down</option>
            </select>
          </label>
          <div className="landing-editor-position-presets">
            <span>Position</span>
            <div>
              <button type="button" onClick={() => updateMedia({ focalX: 50, focalY: 0 })}>Top</button>
              <button type="button" onClick={() => updateMedia({ focalX: 50, focalY: 50 })}>Center</button>
              <button type="button" onClick={() => updateMedia({ focalX: 50, focalY: 100 })}>Bottom</button>
              <button type="button" onClick={() => updateMedia({ focalX: 0, focalY: 50 })}>Left</button>
              <button type="button" onClick={() => updateMedia({ focalX: 100, focalY: 50 })}>Right</button>
            </div>
          </div>
          <div
            className={`landing-editor-focal-picker landing-editor-focal-picker-${previewShape}`}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
              updateMedia({ focalX: Math.min(Math.max(x, 0), 100), focalY: Math.min(Math.max(y, 0), 100) });
            }}
          >
            {selectedIsVideo ? (
              <video src={value} poster={media?.posterUrl || media?.thumbnailUrl} style={mediaStyle} muted autoPlay loop playsInline />
            ) : (
              <img src={value} alt="" style={mediaStyle} />
            )}
            <span style={{ left: `${focalX}%`, top: `${focalY}%` }} />
          </div>
          <div className="landing-editor-slider-grid">
            <RangeField
              label="X"
              value={focalX}
              min={0}
              max={100}
              suffix="%"
              onChange={v => updateMedia({ focalX: v })}
            />
            <RangeField
              label="Y"
              value={focalY}
              min={0}
              max={100}
              suffix="%"
              onChange={v => updateMedia({ focalY: v })}
            />
            <RangeField
              label="Zoom"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              suffix="x"
              onChange={v => updateMedia({ zoom: v })}
            />
          </div>
        </div>
      )}
      {error && <p className="landing-editor-field-error">{error}</p>}
      {pickerOpen && (
        <AssetPickerModal
          assets={allAssets}
          onClose={() => setPickerOpen(false)}
          onSelect={(asset) => {
            onChange(asset.url, assetToMedia(asset));
            setPickerOpen(false);
          }}
          onUpload={handleFile}
          onDelete={handleDeleteAsset}
          progress={progress}
        />
      )}
    </div>
  );
}

function AssetPickerModal({
  assets, onClose, onSelect, onUpload, onDelete, progress,
}: {
  assets: LandingAsset[];
  onClose: () => void;
  onSelect: (asset: LandingAsset) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete?: (asset: LandingAsset) => void;
  progress: number | null;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const filteredAssets = assets.filter(asset => {
    const matchesType = filter === 'all' || asset.type === filter;
    const matchesQuery = !query.trim() || `${asset.title} ${asset.alt || ''} ${asset.url}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div className="landing-asset-modal-backdrop" role="dialog" aria-modal="true">
      <div className="landing-asset-modal">
        <div className="landing-asset-modal-head">
          <div>
            <h3>Media Library</h3>
            <p>{assets.length} assets available</p>
          </div>
          <button type="button" onClick={onClose} className="landing-editor-icon-btn" aria-label="Close asset picker">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="landing-asset-modal-tools">
          <label className="landing-asset-search">
            <Search className="h-4 w-4" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assets" />
          </label>
          <div className="landing-asset-filters">
            {(['all', 'image', 'video'] as const).map(item => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>
                {item === 'all' ? 'All' : item === 'image' ? 'Images' : 'Videos'}
              </button>
            ))}
          </div>
          <label className="landing-editor-upload-button">
            <UploadCloud className="h-4 w-4" />
            <span>{progress === null ? 'Upload asset' : `Uploading ${progress}%`}</span>
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime" onChange={onUpload} />
          </label>
        </div>

        <div className="landing-asset-grid">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="relative group">
              <button type="button" onClick={() => onSelect(asset)} className="landing-asset-card w-full text-left">
                <div className="landing-asset-thumb">
                  {asset.type === 'video' ? (
                    asset.thumbnailUrl ? <img src={asset.thumbnailUrl} alt="" /> : <Video className="h-8 w-8" />
                  ) : (
                    <img src={asset.thumbnailUrl || asset.url} alt={asset.alt || asset.title} />
                  )}
                  <span>{asset.type}</span>
                </div>
                <span className="landing-asset-title">{asset.title}</span>
                <span className="landing-asset-source">{asset.source || 'uploaded'}</span>
              </button>
              {asset.source === 'uploaded' && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(asset);
                  }}
                  className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition"
                  title="Delete asset"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {filteredAssets.length === 0 && <p className="landing-editor-empty">No assets found.</p>}
        </div>
      </div>
    </div>
  );
}

function IconPresetField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="landing-editor-field">
      <span>Icon</span>
      <div className="landing-editor-icon-presets">
        {iconPresets.map(({ name, label, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={value === name ? 'selected' : ''}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => {
      onChangeRef.current(localValue);
    }, 280);
    return () => clearTimeout(timer);
  }, [localValue, value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChangeRef.current(localValue);
    }
  };

  return (
    <label className="landing-editor-field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="admin-input landing-editor-control landing-editor-textarea"
          value={localValue || ''}
          onChange={event => setLocalValue(event.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <input
          className="admin-input landing-editor-control"
          value={localValue || ''}
          onChange={event => setLocalValue(event.target.value)}
          onBlur={handleBlur}
        />
      )}
    </label>
  );
}

function ButtonConfigEditor({ config, forms, onChange }: { config: LandingButtonConfig; forms: RegistrationForm[]; onChange: (config: LandingButtonConfig) => void }) {
  const update = (patch: Partial<LandingButtonConfig>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <ToggleField label="Show button" checked={config.visible} onChange={visible => update({ visible })} />
      <EditableField label="Button text" value={config.text} onChange={text => update({ text })} />
      <div className="landing-editor-two-col">
        <label className="landing-editor-field"><span>Style</span><select className="admin-input landing-editor-control" value={config.style} onChange={event => update({ style: event.target.value as LandingButtonConfig['style'] })}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="dark">Dark</option><option value="outline">Outline</option></select></label>
        <label className="landing-editor-field"><span>Action</span><select className="admin-input landing-editor-control" value={config.actionType} onChange={event => update({ actionType: event.target.value as LandingButtonConfig['actionType'] })}><option value="form">Open assigned form</option><option value="external">Go to external link</option><option value="section">Scroll to section</option><option value="none">No action</option></select></label>
      </div>
      {config.actionType === 'form' && <label className="landing-editor-field"><span>Assigned active form</span><select className="admin-input landing-editor-control" value={config.formId} onChange={event => update({ formId: event.target.value })}><option value="">Select a form…</option>{forms.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}</select>{!config.formId && <small className="font-semibold text-amber-600">No form assigned</small>}{config.formId && !forms.some(form => form.id === config.formId) && <small className="font-semibold text-red-600">Assigned form is inactive or missing</small>}</label>}
      {config.actionType === 'external' && <EditableField label="External URL" value={config.externalUrl} onChange={externalUrl => update({ externalUrl })} />}
      {config.actionType === 'section' && <EditableField label="Target section ID" value={config.sectionId} onChange={sectionId => update({ sectionId: sectionId.replace(/^#/, '') })} />}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => {
      onChangeRef.current(localValue);
    }, 280);
    return () => clearTimeout(timer);
  }, [localValue, value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChangeRef.current(localValue);
    }
  };

  return (
    <label className="landing-editor-field">
      <span>{label}</span>
      <span className="landing-editor-color-row">
        <input
          type="color"
          value={localValue || '#ffffff'}
          onChange={event => setLocalValue(event.target.value)}
        />
        <input
          className="admin-input landing-editor-control"
          value={localValue || ''}
          onChange={event => setLocalValue(event.target.value)}
          onBlur={handleBlur}
        />
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => {
      onChangeRef.current(localValue);
    }, 40);
    return () => clearTimeout(timer);
  }, [localValue, value]);

  return (
    <label>
      <span>{label} ({localValue}{suffix})</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={event => setLocalValue(Number(event.target.value))}
      />
    </label>
  );
}

function FontFamilyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="landing-editor-field">
      <span>{label}</span>
      <select className="admin-input landing-editor-control" value={value} onChange={event => onChange(event.target.value)}>
        {FONT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="landing-editor-toggle">
      <span>{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={checked ? 'active' : ''}>
        <span />
      </button>
    </label>
  );
}

function RepeatableLinkEditor({ title, links, onChange }: { title: string; links: LandingLink[]; onChange: (links: LandingLink[]) => void }) {
  const updateLink = (id: string, patch: Partial<LandingLink>) => onChange(links.map(link => link.id === id ? { ...link, ...patch } : link));
  const removeLink = (id: string) => onChange(links.filter(link => link.id !== id));
  return (
    <div className="landing-editor-repeatable">
      <div className="landing-editor-repeatable-head">
        <p>{title}</p>
        <button type="button" onClick={() => onChange([...links, { id: `link-${Date.now()}`, label: 'New link', url: '#' }])} className="landing-editor-secondary-small">
          <PlusCircle className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="landing-editor-repeatable-list">
        {links.map(link => (
          <div key={link.id} className="landing-editor-repeatable-card">
            <EditableField label="Label" value={link.label} onChange={value => updateLink(link.id, { label: value })} />
            <div className="mt-2">
              <EditableField label="URL" value={link.url} onChange={value => updateLink(link.id, { url: value })} />
            </div>
            <button type="button" onClick={() => removeLink(link.id)} className="landing-editor-remove-small"><Trash2 className="h-3 w-3" /> Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepeatableItemEditor({ sectionType, items, onChange }: { sectionType: LandingSectionType; items: LandingItem[]; onChange: (items: LandingItem[]) => void }) {
  const updateItem = (id: string, patch: Partial<LandingItem>) => onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id: string) => onChange(items.filter(item => item.id !== id));
  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="landing-editor-repeatable">
      <div className="landing-editor-repeatable-head">
        <p>{itemTitle(sectionType)}</p>
        <button type="button" onClick={() => onChange([...items, createLandingItem(sectionType)])} className="landing-editor-secondary-small">
          <PlusCircle className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="landing-editor-repeatable-list">
        {items.map((item, index) => (
          <div key={item.id} className="landing-editor-repeatable-card">
            <div className="landing-editor-repeatable-card-head">
              <p>Item {index + 1}</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveItem(item.id, 'up')} className="landing-editor-icon-btn"><ArrowUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => moveItem(item.id, 'down')} className="landing-editor-icon-btn"><ArrowDown className="h-3 w-3" /></button>
              </div>
            </div>
            {sectionType === 'faq' ? (
              <>
                <EditableField label="Question" value={item.question || ''} onChange={value => updateItem(item.id, { question: value })} />
                <div className="mt-2"><EditableField label="Answer" value={item.answer || ''} onChange={value => updateItem(item.id, { answer: value })} textarea /></div>
              </>
            ) : (
              <>
                <EditableField label={sectionType === 'mentors' ? 'Name' : 'Title'} value={item.title || ''} onChange={value => updateItem(item.id, { title: value })} />
                {sectionType === 'prizes' && <div className="mt-2"><EditableField label="Prize amount" value={item.amount || ''} onChange={value => updateItem(item.id, { amount: value })} /></div>}
                {sectionType === 'mentors' && <div className="mt-2"><EditableField label="Role" value={item.role || ''} onChange={value => updateItem(item.id, { role: value })} /></div>}
                {sectionType === 'testimonials' && <div className="mt-2"><EditableField label="Role / Title" value={item.role || ''} onChange={value => updateItem(item.id, { role: value })} /></div>}
                {sectionType === 'testimonials' && <div className="mt-2"><EditableField label="Team name" value={item.answer || ''} onChange={value => updateItem(item.id, { answer: value })} /></div>}
                {sectionType === 'stages' && <div className="mt-2"><EditableField label="Date / order" value={item.date || ''} onChange={value => updateItem(item.id, { date: value })} /></div>}
                <div className="mt-2"><EditableField label="Description" value={item.description || ''} onChange={value => updateItem(item.id, { description: value })} textarea /></div>
                {sectionType === 'sponsors' && <div className="mt-2"><EditableField label="Logo text (2-3 chars)" value={item.description || ''} onChange={value => updateItem(item.id, { description: value })} /></div>}
                {(sectionType === 'glimpses' || sectionType === 'gallery') && (
                  <div className="mt-2">
                    <MediaUploadField
                      label={sectionType === 'glimpses' ? 'Video or image' : 'Gallery media'}
                      value={item.media?.url || item.imageUrl || ''}
                      media={item.media}
                      pathPrefix={sectionType}
                      onChange={(value, media) => updateItem(item.id, { imageUrl: value, media })}
                    />
                  </div>
                )}
                {(sectionType === 'domains' || sectionType === 'prizes' || sectionType === 'custom' || sectionType === 'about' || sectionType === 'highlights') && (
                  <div className="mt-2 grid gap-3">
                    <IconPresetField value={item.icon || 'Lightbulb'} onChange={value => updateItem(item.id, { icon: value })} />
                    <ColorField label="Color" value={item.color || '#B9FF66'} onChange={value => updateItem(item.id, { color: value })} />
                  </div>
                )}
                {sectionType === 'mentors' && (
                  <div className="mt-2 space-y-2">
                    <MediaUploadField
                      label="Mentor media"
                      value={item.media?.url || item.imageUrl || ''}
                      media={item.media}
                      pathPrefix="mentors"
                      previewShape="passport"
                      onChange={(value, media) => updateItem(item.id, { imageUrl: value, media })}
                    />
                    <EditableField label="Social link" value={item.socialLink || ''} onChange={value => updateItem(item.id, { socialLink: value })} />
                  </div>
                )}
              </>
            )}
            <button type="button" onClick={() => removeItem(item.id)} className="landing-editor-remove-small"><Trash2 className="h-3 w-3" /> Remove item</button>
          </div>
        ))}
        {items.length === 0 && <p className="landing-editor-empty">No items yet.</p>}
      </div>
    </div>
  );
}

function itemTitle(type: LandingSectionType) {
  if (type === 'faq') return 'Questions and answers';
  if (type === 'domains') return 'Domain cards';
  if (type === 'stages') return 'Timeline stages';
  if (type === 'prizes') return 'Prize cards';
  if (type === 'mentors') return 'Mentor cards';
  if (type === 'about') return 'Feature cards';
  if (type === 'highlights') return 'Why join cards';
  if (type === 'testimonials') return 'Testimonial cards';
  if (type === 'sponsors') return 'Partner / sponsor items';
  if (type === 'cta') return 'CTA content';
  return 'Items';
}

export type { SaveState, SelectedLandingBlock };
