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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandShell preview={`Confirm your email change for ${siteName}`}>
    <Heading style={h1}>Confirm your email change ✉️</Heading>
    <Text style={text}>
      You requested to change the email address on your <strong>{siteName}</strong>{' '}
      account from{' '}
      <Link href={`mailto:${oldEmail}`} style={linkStyle}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={linkStyle}>
        {newEmail}
      </Link>
      . Confirm the change below.
    </Text>
    <Section style={ctaWrap}>
      <Button style={ctaButton} href={confirmationUrl}>
        Confirm email change
      </Button>
    </Section>
    <Text style={muted}>
      Button not working?{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        Open the confirmation link
      </Link>
      .
    </Text>
    <Text style={muted}>
      If you didn't request this change, ignore this email and consider updating your
      password — your address will stay the same.
    </Text>
  </BrandShell>
)

export default EmailChangeEmail
