import heroStudentsImage from '../../hero_students_cropped.png';
import image0 from '../../0.png';
import image1 from '../../1.png';
import image2 from '../../2.png';
import image3 from '../../3.png';
import image4 from '../../4.png';
import image5 from '../../5.png';
import { profileAvatars } from './profileAvatars';

export type LandingAssetType = 'image' | 'video';

export interface LandingAsset {
  id: string;
  type: LandingAssetType;
  title: string;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  source?: 'static' | 'uploaded';
}

export const landingAssetsCollection = 'landingAssets';

export const staticLandingAssets: LandingAsset[] = [
  {
    id: 'hero-main',
    type: 'image',
    title: 'Hero visual',
    url: heroStudentsImage,
    thumbnailUrl: heroStudentsImage,
    alt: 'Students representing the Shifa SDG innovation challenge',
    mimeType: 'image/png',
    source: 'static',
  },
  ...[
    { id: 'glimpse-image-1', url: image0, title: 'Think With Purpose' },
    { id: 'glimpse-image-2', url: image1, title: 'Build For People' },
    { id: 'glimpse-image-3', url: image2, title: 'Shape The Future' },
    { id: 'glimpse-image-4', url: image3, title: 'Learn By Doing' },
    { id: 'glimpse-image-5', url: image4, title: 'Lead With Impact' },
    { id: 'glimpse-image-6', url: image5, title: 'Create With Courage' },
  ].map(asset => ({
    ...asset,
    type: 'image' as const,
    thumbnailUrl: asset.url,
    alt: `${asset.title} visual`,
    mimeType: 'image/png',
    source: 'static' as const,
  })),
  ...[
    {
      id: 'glimpse-video-ignite',
      url: '/Uneen.mp4',
      title: 'Innovation Bootcamp',
      alt: 'Student teams sharpening ideas through design thinking and mentoring',
    },
    {
      id: 'glimpse-video-pitch',
      url: '/startup.mp4',
      title: 'Final Pitch Stage',
      alt: 'Finalists presenting SDG-focused solutions',
    },
    {
      id: 'glimpse-video-impact',
      url: '/girl.mp4',
      title: 'Student Innovation',
      alt: 'Young innovators transforming real-world problems into sustainable solutions',
    },
    {
      id: 'loader-countdown',
      url: '/Countdown-Bold-lite.mp4',
      title: 'Countdown Loader',
      alt: 'Shifa SDG countdown loader video',
    },
  ].map(asset => ({
    ...asset,
    type: 'video' as const,
    mimeType: 'video/mp4',
    source: 'static' as const,
  })),
  ...profileAvatars.slice(0, 12).map(avatar => ({
    id: `profile-avatar-${avatar.id}`,
    type: 'image' as const,
    title: avatar.label,
    url: avatar.url,
    thumbnailUrl: avatar.url,
    alt: avatar.label,
    mimeType: 'image/png',
    source: 'static' as const,
  })),
];

export const getStaticLandingAssetById = (assetId?: string) => (
  assetId ? staticLandingAssets.find(asset => asset.id === assetId) || null : null
);
