import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('bg-card border border-border rounded-xl', className)}
      {...rest}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 pt-4 pb-2', className)} {...rest} />
);
export const CardContent = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-4', className)} {...rest} />
);
export const CardFooter = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 pt-2 pb-4', className)} {...rest} />
);
export const CardTitle = ({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-sm font-semibold text-t1', className)} {...rest} />
);
export const CardDescription = ({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-t3', className)} {...rest} />
);
