interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-12 object-contain' }: LogoProps) {
  return (
    <>
      <img src="/logo.jpg"       alt="TekAccess" className={`${className} dark:hidden`} />
      <img src="/logo_white.png" alt="TekAccess" className={`${className} hidden dark:block`} />
    </>
  );
}
