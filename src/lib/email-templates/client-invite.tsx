import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

type D = { contact?: string; business?: string; link?: string }
function ClientInviteEmail(d: D) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Set up your Apex Digital Systems project portal</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ color: '#0b0f1a', fontSize: 22 }}>Your project portal is ready</Heading>
          <Text style={{ color: '#334155', fontSize: 15 }}>{d.contact ? `Hi ${d.contact},` : 'Hi there,'}</Text>
          <Text style={{ color: '#334155', fontSize: 15 }}>
            Thanks for choosing Apex Digital Systems{d.business ? ` for ${d.business}` : ''}. Your details are already filled in — just choose a password to see your order, signed agreement, files and send us changes any time.
          </Text>
          {d.link ? <Button href={d.link} style={{ backgroundColor: '#3b82f6', color: '#ffffff', padding: '12px 20px', borderRadius: 8 }}>Create my account</Button> : null}
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 24 }}>This link works once and expires in 14 days.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ClientInviteEmail,
  subject: 'Set up your Apex Digital Systems project portal',
  displayName: 'Client portal invite',
  previewData: { contact: 'Jamie', business: 'Reno Plumbing Co', link: 'https://apexdigitalsystems.org/client/setup?token=example' },
} satisfies TemplateEntry
