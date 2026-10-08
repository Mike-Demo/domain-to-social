import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandButton, BrandLayout, text } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <BrandLayout
    siteName={siteName}
    preview={`Your login link for ${siteName}`}
    title="Your login link"
    footerNote="If you didn't request this link, you can safely ignore this email."
  >
    <Text style={text}>
      Click the button below to log in to {siteName}. This link will expire shortly.
    </Text>
    <BrandButton href={confirmationUrl} label="Log In" />
  </BrandLayout>
)

export default MagicLinkEmail
