import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  code?: string
  requesterEmail?: string
  expiresAt?: string
}

const Email = ({ code, requesterEmail, expiresAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New team access code request</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New team access code</Heading>
        <Text style={text}>
          {requesterEmail
            ? `${requesterEmail} requested access to the Apex Digital Systems team dashboard.`
            : 'Someone requested access to the Apex Digital Systems team dashboard.'}
        </Text>
        <Text style={text}>Share this one-time code with them to unlock account creation:</Text>
        <Text style={codeStyle}>{code ?? '------'}</Text>
        <Text style={muted}>
          This code works once and expires {expiresAt ?? 'in 48 hours'}. If you don't recognize this
          request, ignore this email — no account can be created without the code.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Team access code request',
  displayName: 'Team invite code',
  to: 'owner@example.com',
  previewData: { code: '123456', requesterEmail: 'newhire@example.com', expiresAt: 'in 48 hours' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { fontSize: '22px', color: '#0f172a' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '22px' }
const codeStyle = {
  fontSize: '32px',
  fontFamily: 'monospace',
  letterSpacing: '8px',
  color: '#0f172a',
  backgroundColor: '#f1f5f9',
  padding: '16px',
  textAlign: 'center' as const,
  borderRadius: '8px',
}
const muted = { fontSize: '12px', color: '#64748b', lineHeight: '18px' }
