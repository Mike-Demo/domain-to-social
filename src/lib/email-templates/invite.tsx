import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { BrandButton, BrandLayout, link, text } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <BrandLayout
    siteName={siteName}
    preview={`You've been invited to join ${siteName}`}
    title="You've been invited"
    footerNote="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <Text style={text}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={link}>
        {siteName}
      </Link>
      . Click the button below to accept the invitation and create your account.
    </Text>
    <BrandButton href={confirmationUrl} label="Accept Invitation" />
  </BrandLayout>
)

export default InviteEmail
