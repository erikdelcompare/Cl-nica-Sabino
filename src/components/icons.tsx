import type { SVGProps } from 'react'

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.02 3C9.4 3 4.02 8.37 4.02 15c0 2.22.6 4.3 1.65 6.09L3 29l8.1-2.6a12.9 12.9 0 0 0 4.92.98c6.63 0 12-5.37 12-12S22.65 3 16.02 3Zm0 21.8a9.7 9.7 0 0 1-4.94-1.35l-.35-.21-4.8 1.54 1.57-4.68-.23-.36A9.72 9.72 0 0 1 5.8 15c0-5.63 4.58-10.2 10.22-10.2 5.63 0 10.2 4.57 10.2 10.2 0 5.64-4.57 10.8-10.2 10.8Zm5.6-7.65c-.31-.15-1.82-.9-2.1-1s-.49-.15-.69.15-.79 1-.97 1.2-.36.23-.66.08a8.17 8.17 0 0 1-2.41-1.49 9.05 9.05 0 0 1-1.67-2.07c-.17-.3 0-.46.13-.61.14-.14.31-.36.46-.54.15-.18.2-.3.31-.51.1-.2.05-.38-.02-.53-.08-.15-.69-1.67-.95-2.28-.25-.6-.5-.52-.69-.53h-.59c-.2 0-.53.08-.81.38s-1.06 1.04-1.06 2.53 1.09 2.94 1.24 3.14c.15.2 2.15 3.28 5.2 4.6.73.31 1.3.5 1.74.64.73.23 1.4.2 1.92.12.59-.09 1.82-.74 2.08-1.46.26-.71.26-1.32.18-1.45-.07-.13-.28-.21-.59-.36Z" />
    </svg>
  )
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true" {...props}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  )
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true" {...props}>
      <path
        d="M6.2 3.5h2.9l1.5 3.7-2 1.3a11.5 11.5 0 0 0 5.2 5.2l1.3-2 3.7 1.5v2.9a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" {...props}>
      <path d="M4 7.5h16M4 16.5h16" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}
