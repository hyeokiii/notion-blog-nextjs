'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export function ProfileImage() {
  const { theme } = useTheme();
  return (
    <Image
      src={theme === 'light' ? '/profile.png' : '/profile.png'}
      alt="짐코딩"
      width={144}
      height={144}
      className="object-cover"
    />
  );
}
