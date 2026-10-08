import * as React from 'react'
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
} from '@react-email/components'

// Email clients cannot read the site's CSS tokens, so the brand colors are
// copied here from src/styles.css (grit-black, acid-lime, paper-distressed).
export const colors = {
  black: '#0b0c0e',
  lime: '#d8ff00',
  paper: '#fbf9f4',
  body: '#33363b',
  muted: '#6b6f76',
  rule: '#e3e1db',
}

const fontStack = "'Space Grotesk', Arial, Helvetica, sans-serif"
const monoStack = "'JetBrains Mono', 'Courier New', Courier, monospace"
const LOGO_URL = 'https://magicmanta.com/favicon.png'
const SITE_URL = 'https://magicmanta.com'

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #d8ff00 !important; color: #0b0c0e !important; }
  }
  [data-ogsc] .dm-btn { color: #0b0c0e !important; }
  [data-ogsb] .dm-btn { background-color: #d8ff00 !important; }
`

const main = { backgroundColor: '#ffffff', fontFamily: fontStack, margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', border: `2px solid ${colors.black}` }
const header = { backgroundColor: colors.black, padding: '18px 24px' }
const logo = { display: 'inline-block', verticalAlign: 'middle', borderRadius: '4px' }
const wordmark = {
  display: 'inline-block',
  verticalAlign: 'middle',
  margin: '0 0 0 12px',
  color: colors.lime,
  fontFamily: monoStack,
  fontSize: '18px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
}
const content = { padding: '28px 24px 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: colors.black,
  margin: '0 0 18px',
  lineHeight: '1.25',
}
export const text = { fontSize: '15px', color: colors.body, lineHeight: '1.6', margin: '0 0 20px' }
export const link = { color: colors.black, textDecoration: 'underline', fontWeight: 'bold' as const }
const button = {
  backgroundColor: colors.lime,
  color: colors.black,
  fontFamily: monoStack,
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  border: `2px solid ${colors.black}`,
  borderRadius: '0',
  padding: '14px 24px',
  textDecoration: 'none',
}
const fallback = { fontSize: '12px', color: colors.muted, lineHeight: '1.5', margin: '20px 0 0', wordBreak: 'break-all' as const }
const hr = { borderColor: colors.rule, margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: colors.muted, lineHeight: '1.5', margin: 0 }
const codeBox = {
  display: 'inline-block',
  backgroundColor: colors.paper,
  border: `2px solid ${colors.black}`,
  color: colors.black,
  fontFamily: monoStack,
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  padding: '12px 20px',
  margin: '0 0 20px',
}

interface LayoutProps {
  preview: string
  title: string
  footerNote: string
  siteName?: string
  children: React.ReactNode
}

export const BrandLayout = ({ preview, title, footerNote, siteName = 'M4G1C M4NT4', children }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Link href={SITE_URL}>
            <Img src={LOGO_URL} width="36" height="36" alt="" style={logo} />
            <span style={wordmark}>{siteName}</span>
          </Link>
        </Section>
        <Section style={content}>
          <Heading style={h1}>{title}</Heading>
          {children}
          <Hr style={hr} />
          <Text style={footer}>{footerNote}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const BrandButton = ({ href, label }: { href: string; label: string }) => (
  <>
    <Button className="dm-btn" style={button} href={href}>
      {label}
    </Button>
    <Text style={fallback}>
      Button not working? Paste this link into your browser:{' '}
      <Link href={href} style={{ color: colors.muted }}>
        {href}
      </Link>
    </Text>
  </>
)

export const BrandCode = ({ code }: { code: string }) => <Text style={codeBox}>{code}</Text>
