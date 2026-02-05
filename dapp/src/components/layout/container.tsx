import {cn} from '~/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Container({
  children,
  size = 'lg',
  className,
  ...props
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn('mx-auto w-full px-4', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}
