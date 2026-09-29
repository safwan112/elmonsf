// Lazily loaded content pages (see routes/router.tsx).
import { CmsPage } from './content-pages'

export { BlogPage, PostPage } from './blog-pages'
export { CmsPage, ContactPage, FaqPage } from './content-pages'

// Well-known CMS pages served at the site root.
export const AboutPage = () => <CmsPage slug="about" />
export const TermsPage = () => <CmsPage slug="terms" />
export const PrivacyPage = () => <CmsPage slug="privacy" />
export const RefundPolicyPage = () => <CmsPage slug="refund-policy" />
