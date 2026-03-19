import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right';
  delay?: number;
  className?: string;
}

export function AnimatedSection({
  children,
  animation = 'fade-up',
  delay = 0,
  className = ''
}: AnimatedSectionProps) {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0.15,
    triggerOnce: true,
    rootMargin: '0px 0px -80px 0px'
  });

  const animationClass = `scroll-${animation}`;
  const delayClass = delay > 0 ? `transition-delay-${delay}` : '';
  const visibilityClass = isVisible ? 'visible' : '';

  const combinedClassName = [
    animationClass,
    delayClass,
    visibilityClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={elementRef} className={combinedClassName}>
      {children}
    </div>
  );
}
