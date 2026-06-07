/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
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

const LOGO_URL =
  'https://vfbxyldwtjwwecpbgezu.supabase.co/storage/v1/object/public/email-assets/overraprep-logo.png'

export const SignupEmail = ({
  recipient,
  token,
  fullName,
  confirmationUrl,
}: SignupEmailProps) => {
  const firstName = (fullName || '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Welcome, ${firstName} ✨` : 'Welcome to OverraPrep AI ✨'
  const code = (token || '------').toString()
  const verifyUrl = confirmationUrl || '#'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Tap to verify your OverraPrep AI account</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Gold brand header */}
          <Section style={brandBar}>
            <Img
              src={LOGO_URL}
              width="64"
              height="64"
              alt="OverraPrep AI"
              style={logoImg}
            />
            <Text style={brandMark}>
              OVERRAPREP <span style={brandAi}>AI</span>
            </Text>
            <Text style={brandTag}>Study Smart · Not Hard</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>{greeting}</Heading>
            <Text style={lede}>
              We're so glad you're here{firstName ? `, ${firstName}` : ''}. You just joined a
              fast-growing community of university students across Nigeria and beyond using{' '}
              <strong>OverraPrep AI</strong> to study smarter, ace CBTs &amp; theory exams,
              and finally beat exam stress — powered by AI tutors built around <em>you</em>.
            </Text>

            <Text style={label}>Verify {recipient} — one tap:</Text>

            <Section style={{ textAlign: 'center', margin: '0 0 18px' }}>
              <Button href={verifyUrl} style={ctaButton}>
                ✨ Verify my email
              </Button>
            </Section>

            <Text style={muted}>
              Button not working?{' '}
              <Link href={verifyUrl} style={linkStyle}>Tap here to verify</Link>.
            </Text>

            <Text style={muted}>
              This link expires in <strong>1 hour</strong>. Don't share it with anyone —
              not even an OverraPrep team member.
            </Text>

            <Hr style={hr} />

            <Text style={featuresHeading}>Everything you unlock inside OverraPrep AI</Text>

            <Text style={feature}>
              📚 <strong>AI Past-Question Practice &amp; CBT Simulation</strong> — adaptive
              quizzes for any university, faculty, department &amp; level, with real exam
              timing.
            </Text>
            <Text style={feature}>
              🧠 <strong>Instant AI Explanations</strong> — step-by-step breakdowns for every
              question, powered by top-tier reasoning models.
            </Text>
            <Text style={feature}>
              ✍️ <strong>Theory Prep &amp; AI Grading</strong> — write theory answers and get
              graded with feedback, ideal answers and improvement hints.
            </Text>
            <Text style={feature}>
              🎙️ <strong>Audio Learning</strong> — turn any PDF, DOCX or note into a podcast
              you can study on the go in 4 natural voices.
            </Text>
            <Text style={feature}>
              👩🏽‍🏫 <strong>Verified Tutor Marketplace</strong> — discover tutors, buy premium
              quiz packs, book 1:1 / live sessions, and message tutors directly.
            </Text>
            <Text style={feature}>
              🎥 <strong>Live Classrooms &amp; Recordings</strong> — join live classes,
              breakout rooms, and rewatch class recaps with AI summaries.
            </Text>
            <Text style={feature}>
              💬 <strong>Group Chats, Brainstorm &amp; @AI</strong> — study together in
              private chats with realtime sync and an AI study buddy on call.
            </Text>
            <Text style={feature}>
              📂 <strong>Personal Library &amp; AI Chat with Notes</strong> — upload your
              materials, chat with them, generate flashcards, summaries &amp; quizzes.
            </Text>
            <Text style={feature}>
              🔁 <strong>Smart Review (Spaced Repetition)</strong> — never forget what you've
              learned, with offline-ready SRS cards.
            </Text>
            <Text style={feature}>
              🧪 <strong>Mock Exams &amp; Readiness Score</strong> — full mock CBTs with
              proctoring-lite, mastery tracking and AI remediation playlists.
            </Text>
            <Text style={feature}>
              🏆 <strong>Leaderboards, Streaks, Badges &amp; Teams</strong> — challenge
              friends, climb weekly rankings, and earn rewards as you study.
            </Text>
            <Text style={feature}>
              🎓 <strong>Scholarships &amp; Opportunities</strong> — handpicked scholarships,
              internships and student events delivered to your dashboard.
            </Text>
            <Text style={feature}>
              📲 <strong>PWA &amp; Mobile App</strong> — install OverraPrep AI on any device
              and study even when your data is low.
            </Text>
            <Text style={feature}>
              🪙 <strong>Tokens, Pro Plans &amp; Referrals</strong> — free tokens to start,
              affordable packs, and rewards every time you invite a friend.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Didn't sign up for OverraPrep AI? You can safely ignore this email — no
              account will be created without verification.
            </Text>
            <Text style={signoff}>
              See you inside,<br />
              <strong>The OverraPrep AI Team</strong>
            </Text>
          </Section>

          <Text style={legal}>
            © {new Date().getFullYear()} OverraPrep AI · Built for university students
            everywhere.
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
  padding: '28px 16px 20px',
  background: `linear-gradient(135deg, ${GOLD} 0%, #ffd24d 100%)`,
  borderRadius: '20px 20px 0 0',
}
const logoImg = {
  display: 'block',
  margin: '0 auto 12px',
  borderRadius: '16px',
  boxShadow: '0 6px 18px -6px rgba(26,19,0,0.35)',
  background: '#fff',
}
const brandMark = {
  fontSize: '22px',
  fontWeight: 800 as const,
  letterSpacing: '0.18em',
  color: INK,
  margin: '0',
}
const brandAi = {
  color: '#ffffff',
  background: INK,
  padding: '2px 8px',
  borderRadius: '6px',
  marginLeft: '4px',
}
const brandTag = {
  fontSize: '11px',
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color: INK,
  opacity: 0.78,
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
  margin: '0 0 14px',
}
const feature = { fontSize: '14px', lineHeight: '1.7', color: INK_SOFT, margin: '0 0 10px' }
const footer = { fontSize: '12px', color: MUTED, lineHeight: '1.55', margin: '0 0 16px' }
const signoff = { fontSize: '14px', color: INK, lineHeight: '1.6', margin: '0' }
const legal = {
  fontSize: '11px',
  color: MUTED,
  textAlign: 'center' as const,
  margin: '18px 0 0',
}
const ctaButton = {
  backgroundColor: INK,
  background: `linear-gradient(135deg, ${INK} 0%, #2d2200 100%)`,
  color: '#ffd24d',
  fontSize: '15px',
  fontWeight: 800 as const,
  letterSpacing: '0.02em',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: `0 10px 24px -10px ${GOLD}`,
}
const linkStyle = { color: GOLD_DEEP, wordBreak: 'break-all' as const, textDecoration: 'underline' }
const fallbackLabel = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  fontWeight: 700 as const,
  color: MUTED,
  margin: '16px 0 8px',
}
const codeBoxSmall = {
  background: CREAM,
  border: `1px dashed ${GOLD}`,
  borderRadius: '10px',
  padding: '10px 12px',
  textAlign: 'center' as const,
  margin: '0 0 12px',
}
const codeTextSmall = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '22px',
  fontWeight: 800 as const,
  letterSpacing: '0.28em',
  color: INK,
  margin: '0',
}
