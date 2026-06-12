import { Link } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";

const lastUpdated = "June 12, 2026";

const sections = [
  {
    title: "1. Platform Purpose",
    body: "IntellectX is an education platform for courses, quizzes, progress tracking, instructor-authored content, and related learning tools. The service is intended to support learning, practice, and course delivery. It is not a substitute for professional academic, legal, medical, financial, or other specialist advice.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for the accuracy of the information you provide, keeping your login credentials secure, and activity under your account. You should notify us if you believe your account has been accessed without permission.",
  },
  {
    title: "3. Acceptable Use",
    body: "You agree not to misuse the platform, attempt to bypass security controls, upload harmful code, harass others, scrape or overload the service, or use IntellectX for unlawful, misleading, or abusive activity.",
  },
  {
    title: "4. Educational Content Disclaimer",
    body: "Course material, quiz feedback, progress indicators, and study recommendations may contain errors or omissions. You should use your judgment and verify important information through appropriate sources, instructors, or institutions.",
  },
  {
    title: "5. Instructor Content Responsibility",
    body: "Instructors are responsible for the content they upload or publish, including ensuring they have the rights to use videos, text, images, quizzes, and other materials. Instructor content must be accurate to the best of the instructor's knowledge and must not infringe third-party rights.",
  },
  {
    title: "6. Payments and Subscriptions",
    body: "Some features may require payment or a subscription. Pricing, billing cycles, renewals, cancellations, refunds, and provider-specific approval flows may be shown in the product at checkout or in account settings. Payment processing may be handled by third-party providers.",
  },
  {
    title: "7. Intellectual Property",
    body: "IntellectX and its platform materials are owned by IntellectX or its licensors. Users and instructors retain rights they already hold in their submitted content, but grant IntellectX the permissions needed to host, display, process, and deliver that content through the platform.",
  },
  {
    title: "8. Service Availability",
    body: "We aim to provide a reliable service, but availability may be interrupted by maintenance, upgrades, outages, provider failures, or events outside our control. We do not guarantee uninterrupted or error-free operation.",
  },
  {
    title: "9. Termination",
    body: "We may suspend or terminate access if an account violates these terms, creates risk for other users, infringes rights, or is used unlawfully. You may stop using the service at any time.",
  },
  {
    title: "10. Limitation of Liability",
    body: "To the maximum extent permitted by applicable law, IntellectX is not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, revenue, goodwill, or learning outcomes arising from use of the service.",
  },
  {
    title: "11. Changes to These Terms",
    body: "We may update these terms as the product, legal requirements, or business operations change. If changes are material, we will take reasonable steps to notify users through the product or another appropriate channel.",
  },
  {
    title: "12. Contact",
    body: "Contact placeholder pending legal review: support@intellectx.app.",
  },
];

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20">
      <GlassCard className="space-y-8">
        <header className="space-y-3 border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#4a9ff5]">
            Draft for legal review
          </p>
          <h1 className="text-4xl font-semibold text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
          <p className="text-gray-700">
            These draft terms are provided for product readiness and should be reviewed by qualified legal counsel before launch.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-gray-100 bg-white/60 p-5">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">{section.title}</h2>
              <p className="leading-7 text-gray-700">{section.body}</p>
            </section>
          ))}
        </div>

        <footer className="border-t border-gray-200 pt-6 text-sm text-gray-600">
          See also the{" "}
          <Link to="/privacy" className="font-semibold text-[#4a9ff5] hover:text-[#2e8ef7]">
            Privacy Policy
          </Link>
          .
        </footer>
      </GlassCard>
    </div>
  );
}
