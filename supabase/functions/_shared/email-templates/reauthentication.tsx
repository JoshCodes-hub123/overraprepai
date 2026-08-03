/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  BrandShell,
  codeBox,
  codeText,
  h1,
  label,
  muted,
  text,
} from './brand.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandShell preview="Your OverraPrep AI verification code">
    <Heading style={h1}>Confirm it's you 🛡️</Heading>
    <Text style={text}>
      Use the code below to confirm your identity and continue with this sensitive
      action on OverraPrep AI.
    </Text>
    <Text style={label}>Your verification code</Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token || '------'}</Text>
    </Section>
    <Text style={muted}>
      This code expires shortly. Never share it with anyone — not even an OverraPrep
      team member.
    </Text>
    <Text style={muted}>
      If you didn't request this, you can safely ignore this email.
    </Text>
  </BrandShell>
)

export default ReauthenticationEmail
