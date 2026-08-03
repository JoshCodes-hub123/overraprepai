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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <BrandShell preview={`You've been invited to join ${siteName}`}>
    <Heading style={h1}>You've been invited 🎉</Heading>
    <Text style={text}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={linkStyle}>
        <strong>{siteName}</strong>
      </Link>{' '}
      — AI-powered practice, past questions, audio learning and live classes built for
      university students. Accept below to create your account.
    </Text>
    <Section style={ctaWrap}>
      <Button style={ctaButton} href={confirmationUrl}>
        Accept invitation
      </Button>
    </Section>
    <Text style={muted}>
      Button not working?{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        Open the invitation link
      </Link>
      .
    </Text>
    <Text style={muted}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </BrandShell>
)

export default InviteEmail
