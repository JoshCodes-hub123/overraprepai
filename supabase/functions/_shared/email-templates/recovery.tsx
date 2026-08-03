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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <BrandShell preview={`Reset your password for ${siteName}`}>
    <Heading style={h1}>Reset your password 🔐</Heading>
    <Text style={text}>
      We received a request to reset the password for your{' '}
      <strong>{siteName}</strong> account. Tap the button below to choose a new one.
    </Text>
    <Section style={ctaWrap}>
      <Button style={ctaButton} href={confirmationUrl}>
        Choose a new password
      </Button>
    </Section>
    <Text style={muted}>
      Button not working?{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        Open the reset link
      </Link>
      .
    </Text>
    <Text style={muted}>
      Didn't request a password reset? You can safely ignore this email — your password
      will not be changed.
    </Text>
  </BrandShell>
)

export default RecoveryEmail
