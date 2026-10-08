import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { BrandButton, BrandLayout, link, text } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandLayout
    siteName={siteName}
    preview={`Confirm your email for ${siteName}`}
    title="Confirm your email"
    footerNote="If you didn't create an account, you can safely ignore this email."
  >
    <Text style={text}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={link}>
        {siteName}
      </Link>
      !
    </Text>
    <Text style={text}>
      Please confirm your email address (
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>
      ) by clicking the button below:
    </Text>
    <BrandButton href={confirmationUrl} label="Verify Email" />
  </BrandLayout>
)

export default SignupEmail
