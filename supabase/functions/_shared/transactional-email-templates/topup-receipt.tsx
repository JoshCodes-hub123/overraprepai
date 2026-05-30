/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'OverraPrep AI'

interface TopupReceiptProps {
  name?: string
  amount_naira?: number
  tokens?: number
  balance?: number
  reference?: string
}

const TopupReceipt = ({
  name,
  amount_naira = 0,
  tokens = 0,
  balance = 0,
  reference = '',
}: TopupReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>₦{amount_naira} added · +{tokens} tokens · {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Top-up successful 🎉</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} we've received your payment and added tokens to your wallet.
        </Text>

        <Section style={card}>
          <Text style={row}><span style={label}>Amount paid</span><span style={value}>₦{amount_naira.toLocaleString()}</span></Text>
          <Text style={row}><span style={label}>Tokens added</span><span style={valueGold}>+{tokens}</span></Text>
          <Text style={row}><span style={label}>New balance</span><span style={value}>{balance} tokens</span></Text>
          {reference ? (
            <Text style={row}><span style={label}>Reference</span><span style={mono}>{reference}</span></Text>
          ) : null}
        </Section>

        <Text style={text}>
          1 token = ₦25 = 1 AI action (quiz, AI explanation, summary, flashcards, tutor chat and more).
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Study smart, not hard. — The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TopupReceipt,
  subject: (d: Record<string, any>) => `Wallet top-up · +${d?.tokens ?? 0} tokens`,
  displayName: 'Wallet top-up receipt',
  previewData: { name: 'Abayomi', amount_naira: 500, tokens: 20, balance: 24, reference: 'flw_8847291' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0a0a0a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#3f3f46', margin: '0 0 18px' }
const card = { background: '#fbf7ea', border: '1px solid #f1e6b8', borderRadius: '14px', padding: '18px 20px', margin: '0 0 22px' }
const row = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', margin: '6px 0', color: '#0a0a0a' } as React.CSSProperties
const label = { color: '#6b7280' }
const value = { fontWeight: 600 }
const valueGold = { fontWeight: 700, color: '#b8860b' }
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '12px', color: '#6b7280' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }
