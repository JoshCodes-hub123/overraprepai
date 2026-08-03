/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export const GOLD = '#f5b400'
export const GOLD_DEEP = '#a37500'
export const INK = '#1a1300'
export const INK_SOFT = '#3a3000'
export const MUTED = '#8a7a3a'
export const CREAM = '#fffaee'

export const LOGO_URL =
  'https://vfbxyldwtjwwecpbgezu.supabase.co/storage/v1/object/public/email-assets/overraprep-logo.png'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '0',
  margin: '0',
}
export const container = { maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }
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
export const card = {
  background: '#ffffff',
  border: `1px solid ${GOLD}33`,
  borderTop: 'none',
  borderRadius: '0 0 20px 20px',
  padding: '28px 26px 24px',
  boxShadow: '0 12px 32px -18px rgba(245,180,0,0.45)',
}
export const h1 = {
  fontSize: '24px',
  lineHeight: '1.25',
  fontWeight: 800 as const,
  color: INK,
  margin: '0 0 14px',
  letterSpacing: '-0.01em',
}
export const text = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: INK_SOFT,
  margin: '0 0 22px',
}
export const muted = {
  fontSize: '13px',
  color: MUTED,
  lineHeight: '1.55',
  margin: '0 0 8px',
}
export const linkStyle = { color: GOLD_DEEP, textDecoration: 'underline' }
export const hr = { border: 'none', borderTop: `1px solid ${GOLD}33`, margin: '24px 0' }
export const ctaButton = {
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
}
export const ctaWrap = { textAlign: 'center' as const, margin: '0 0 18px' }
export const label = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.18em',
  fontWeight: 700 as const,
  color: GOLD_DEEP,
  margin: '0 0 10px',
}
export const codeBox = {
  background: CREAM,
  border: `2px dashed ${GOLD}`,
  borderRadius: '14px',
  padding: '20px 12px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
export const codeText = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '38px',
  fontWeight: 800 as const,
  letterSpacing: '0.32em',
  color: INK,
  margin: '0',
}
export const legal = {
  fontSize: '11px',
  color: MUTED,
  textAlign: 'center' as const,
  margin: '18px 0 0',
}

export const BrandHeader = () => (
  <Section style={brandBar}>
    <Img src={LOGO_URL} width="64" height="64" alt="OverraPrep AI" style={logoImg} />
    <Text style={brandMark}>
      OVERRAPREP <span style={brandAi}>AI</span>
    </Text>
    <Text style={brandTag}>Study Smart · Not Hard</Text>
  </Section>
)

export const BrandShell = ({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Section style={card}>{children}</Section>
        <Text style={legal}>
          © {new Date().getFullYear()} OverraPrep AI · Built for university students
          everywhere.
        </Text>
      </Container>
    </Body>
  </Html>
)
