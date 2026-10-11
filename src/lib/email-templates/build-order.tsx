import { Body, Button, Container, Head, Heading, Html, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

const row = { color: '#e6ebf5', fontSize: 14, margin: '0 0 8px' }

type D = { business?: string; contact?: string; email?: string; phone?: string; address?: string; website?: string; packageName?: string; addons?: string; membership?: string; total?: string; paid?: string; promo?: string; caller?: string; appointment?: string; expectedBy?: string; needs?: string; notes?: string; link?: string }
function BuildOrderEmail(d: D) {
  const line = (label: string, v?: string) => (v ? <Text style={row}><strong>{label}:</strong> {v}</Text> : null)
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0b0f1a', color: '#e6ebf5', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ color: '#e6ebf5', fontSize: 22 }}>Build order ready: {d.business || 'New customer'}</Heading>
          <Text style={{ color: '#9aa7bd', fontSize: 14 }}>A sale cleared and is ready for execution.</Text>
          <Section style={{ backgroundColor: '#121828', borderRadius: 12, padding: '20px 24px', marginTop: 16 }}>
            {line('Contact', d.contact)}{line('Email', d.email)}{line('Phone', d.phone)}{line('Address', d.address)}{line('Website', d.website)}
            {line('Package', d.packageName)}{line('Add-ons', d.addons)}{line('Membership', d.membership)}
            {line('One-time total', d.total)}{line('Paid', d.paid)}{line('Promo', d.promo)}{line('Sold by', d.caller)}{line('Appointment', d.appointment)}{line('Expected by', d.expectedBy)}
            {line('Needs', d.needs)}{line('Caller notes', d.notes)}
          </Section>
          {d.link ? <Button href={d.link} style={{ marginTop: 20, backgroundColor: '#3b82f6', color: '#fff', padding: '12px 20px', borderRadius: 8 }}>Open build orders</Button> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BuildOrderEmail,
  subject: (d: Record<string, any>) => `Build order ready: ${d['business'] || 'new sale'}`,
  displayName: 'Build order ready',
  to: 'owner@example.com',
  previewData: { business: 'Reno Plumbing Co', contact: 'Sam', packageName: 'Website Launch', total: '$1,000.00', paid: '1 of 4 payments', caller: 'Alex' },
} satisfies TemplateEntry
