import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BrandLayout, text } from './brand'
import { SUPPORT_EMAIL } from '@/lib/support'

interface Props {
  ticketId?: string
  subject?: string
}

const SupportReceiptEmail = ({ ticketId = '—', subject = 'your request' }: Props) => (
  <BrandLayout preview={`We got your ticket ${ticketId}`} title="Ticket received" footerNote={`You opened a support ticket on M4G1C M4NT4. Questions? Email ${SUPPORT_EMAIL}.`}>
    <Text style={text}>Thanks — we received your ticket about "{subject}".</Text>
    <Text style={text}>Your reference is {ticketId}. Mention it if you write to us at {SUPPORT_EMAIL}.</Text>
  </BrandLayout>
)

export const template = {
  component: SupportReceiptEmail,
  subject: (d: Record<string, any>) => `Ticket ${d.ticketId ?? ''} received`,
  displayName: 'Support ticket receipt',
  previewData: { ticketId: 'MM-7Q2K9', subject: 'Batch stalls' },
} satisfies TemplateEntry
