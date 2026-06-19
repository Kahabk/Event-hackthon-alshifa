import { useEffect, useState } from 'react';

interface AppleStyleAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'purple' | 'peach' | 'mint' | 'gold' | 'rose' | 'admin';
  imageUrl?: string | null;
  className?: string;
}

const sizeClass = {
  sm: 'apple-avatar-sm',
  md: 'apple-avatar-md',
  lg: 'apple-avatar-lg',
};

export default function AppleStyleAvatar({
  size = 'md',
  variant = 'purple',
  imageUrl,
  className = '',
}: AppleStyleAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <span className={`apple-avatar apple-avatar-photo ${sizeClass[size]} ${className}`} aria-hidden="true">
        <img src={imageUrl} alt="" onError={() => setImageFailed(true)} />
      </span>
    );
  }

  return (
    <span className={`apple-avatar ${sizeClass[size]} apple-avatar-${variant} ${className}`} aria-hidden="true">
      <span className="apple-avatar-head">
        <span className="apple-avatar-hair" />
        <span className="apple-avatar-ear apple-avatar-ear-left" />
        <span className="apple-avatar-ear apple-avatar-ear-right" />
        <span className="apple-avatar-face">
          <span className="apple-avatar-brow apple-avatar-brow-left" />
          <span className="apple-avatar-brow apple-avatar-brow-right" />
          <span className="apple-avatar-eye apple-avatar-eye-left" />
          <span className="apple-avatar-eye apple-avatar-eye-right" />
          <span className="apple-avatar-nose" />
          <span className="apple-avatar-mouth" />
        </span>
      </span>
      <span className="apple-avatar-body" />
    </span>
  );
}
