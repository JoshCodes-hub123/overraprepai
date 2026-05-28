/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
  fullName?: string
}

export const SignupEmail = ({
  recipient,
  token,
  fullName,
}: SignupEmailProps) => {
  const firstName = (fullName || '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Welcome, ${firstName} 👋` : 'Welcome to OverraPrep AI 👋'
  const code = (token || '------').toString()

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your OverraPrep AI verification code: {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Gold brand bar */}
          <Section style={brandBar}>
            <Text style={brandMark}>OVERRAPREP <span style={brandAi}>AI</span></Text>
            <Text style={brandTag}>Study Smart · Not Hard</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>{greeting}</Heading>
            <Text style={lede}>
              We're so glad you're here. You just joined thousands of FUTA students
              using <strong>OverraPrep AI</strong> to study smarter, ace CBTs, and
              beat exam stress — powered by AI tutors built around you.
            </Text>

            <Text style={label}>Enter this 6-digit code to verify {recipient}:</Text>

            <Section style={codeBox}>
              <Text style={codeText}>{code}</Text>
            </Section>

            <Text style={muted}>
              This code expires in <strong>1 hour</strong>. Don't share it with anyone —
              not even an OverraPrep team member.
            </Text>

            <Hr style={hr} />

            <Text style={featuresHeading}>What's waiting for you inside ✨</Text>
            <Text style={feature}>📚 <strong>AI Past-Question Practice</strong> — adaptive CBTs tuned to your course & level.</Text>
            <Text style={feature}>🎙️ <strong>Audio Learning</strong> — turn any PDF or note into a podcast you can study on the go.</Text>
            <Text style={feature}>👩🏽‍🏫 <strong>Live & Async Tutors</strong> — book sessions, join live classes, message tutors 1:1.</Text>
            <Text style={feature}>🧠 <strong>Smart Review (SRS)</strong> — never forget what you've learned.</Text>
            <Text style={feature}>🏆 <strong>Leaderboards, Streaks & Tokens</strong> — make studying actually feel good.</Text>

            <Hr style={hr} />

            <Text style={footer}>
              Didn't sign up for OverraPrep AI? You can safely ignore this email —
              no account will be created without verification.
            </Text>
            <Text style={signoff}>
              See you inside,<br />
              <strong>The OverraPrep AI Team</strong>
            </Text>
          </Section>

          <Text style={legal}>
            © {new Date().getFullYear()} OverraPrep AI · Built for FUTA students, by students.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

const GOLD = '#f5b400'
const GOLD_DEEP = '#a37500'
const INK = '#1a1300'
const INK_SOFT = '#3a3000'
const MUTED = '#8a7a3a'
const CREAM = '#fffaee'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '0',
  margin: '0',
}
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }
const brandBar = {
  textAlign: 'center' as const,
  padding: '24px 16px 18px',
  background: `linear-gradient(135deg, ${GOLD} 0%, #ffd24d 100%)`,
  borderRadius: '20px 20px 0 0',
}
const brandMark = {
  fontSize: '22px',
  fontWeight: 800 as const,
  letterSpacing: '0.18em',
  color: INK,
  margin: '0',
}
const brandAi = { color: '#ffffff', background: INK, padding: '2px 8px', borderRadius: '6px', marginLeft: '4px' }
const brandTag = {
  fontSize: '11px',
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color: INK,
  opacity: 0.75,
  margin: '8px 0 0',
  fontWeight: 700 as const,
}
const card = {
  background: '#ffffff',
  border: `1px solid ${GOLD}33`,
  borderTop: 'none',
  borderRadius: '0 0 20px 20px',
  padding: '28px 26px 24px',
  boxShadow: '0 12px 32px -18px rgba(245,180,0,0.45)',
}
const h1 = {
  fontSize: '26px',
  lineHeight: '1.2',
  fontWeight: 800 as const,
  color: INK,
  margin: '0 0 14px',
  letterSpacing: '-0.01em',
}
const lede = { fontSize: '15px', lineHeight: '1.65', color: INK_SOFT, margin: '0 0 24px' }
const label = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.18em',
  fontWeight: 700 as const,
  color: GOLD_DEEP,
  margin: '0 0 10px',
}
const codeBox = {
  background: CREAM,
  border: `2px dashed ${GOLD}`,
  borderRadius: '14px',
  padding: '20px 12px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const codeText = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '38px',
  fontWeight: 800 as const,
  letterSpacing: '0.32em',
  color: INK,
  margin: '0',
}
const muted = { fontSize: '13px', color: MUTED, lineHeight: '1.55', margin: '0 0 8px' }
const hr = { border: 'none', borderTop: `1px solid ${GOLD}33`, margin: '24px 0' }
const featuresHeading = {
  fontSize: '16px',
  fontWeight: 800 as const,
  color: INK,
  margin: '0 0 12px',
}
const feature = { fontSize: '14px', lineHeight: '1.7', color: INK_SOFT, margin: '0 0 8px' }
const footer = { fontSize: '12px', color: MUTED, lineHeight: '1.55', margin: '0 0 16px' }
const signoff = { fontSize: '14px', color: INK, lineHeight: '1.6', margin: '0' }
const legal = { fontSize: '11px', color: MUTED, textAlign: 'center' as const, margin: '18px 0 0' }
