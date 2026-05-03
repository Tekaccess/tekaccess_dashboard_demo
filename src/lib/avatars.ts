// Registry of available AI assistant avatars. To add a new avatar:
//   1. Drop the image (svg / png / jpg / jpeg / webp) into /public/avatar/
//   2. Add an entry below pointing at it
// Avatars render as-is — no recoloring or theme adaptation.

export interface AvatarOption {
  id: string;
  /** Friendly name shown next to the avatar (e.g. in customization UI). */
  name: string;
  /** Public URL of the image. Any format the browser supports. */
  src: string;
  /** Short greeting shown in the assistant popup. */
  greeting?: string;
}

export const AVATARS: AvatarOption[] = [
  {
    id: 'default',
    name: 'TekAccess AI',
    src: '/avatar/default.jpeg',
    greeting: "Hi, I'm TekAccess AI. Ask me anything.",
  },
];

export const DEFAULT_AVATAR_ID = 'default';

export function getAvatar(id: string = DEFAULT_AVATAR_ID): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
