/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  BrandShell,
  ctaButton,
  ctaWrap,
  h1,
  linkStyle,
  muted,
  text,
} from './brand.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <BrandShell preview={`Your login link for ${siteName}`}>
    <Heading style={h1}>Your login link is ready 🔓</Heading>
    <Text style={text}>
      Tap the button below to log in to <strong>{siteName}</strong>. For your security,
      this link works once and expires shortly.
    </Text>
    <Section style={ctaWrap}>
      <Button style={ctaButton} href={confirmationUrl}>
        Log in to OverraPrep AI
      </Button>
    </Section>
    <Text style={muted}>
      Button not working?{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        Open your login link
      </Link>
      .
    </Text>
    <Text style={muted}>
      If you didn't request this link, you can safely ignore this email — your account
      stays secure.
    </Text>
  </BrandShell>
)

export default MagicLinkEmail
