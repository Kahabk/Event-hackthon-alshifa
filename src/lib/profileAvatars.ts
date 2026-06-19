const avatarModules = import.meta.glob('../../profile_avdar/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

export interface ProfileAvatarOption {
  id: string;
  label: string;
  url: string;
}

export const profileAvatars: ProfileAvatarOption[] = Object.entries(avatarModules)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() || '';
    const id = fileName.replace(/\.png$/i, '');

    return {
      id,
      label: `Avatar ${id}`,
      url: String(url),
    };
  })
  .sort((first, second) => Number(first.id) - Number(second.id));

export function getFallbackAvatar(uid: string) {
  if (!profileAvatars.length) return null;

  const seed = uid.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return profileAvatars[seed % profileAvatars.length];
}

export function getAvatarById(id?: string) {
  if (!id) return null;
  return profileAvatars.find(avatar => avatar.id === id) || null;
}

export function getAvatarByUrl(url?: string | null) {
  if (!url) return null;
  return profileAvatars.find(avatar => avatar.url === url) || null;
}
