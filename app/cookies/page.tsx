import type { Metadata } from "next";
import { PolicyLayout } from "../../components/PolicyLayout";

export const metadata: Metadata = {
  title: "Cookies Policy · MIXSMVRT",
  description: "Cookies Policy for MIXSMVRT, explaining how we use cookies and similar technologies.",
};

export default function CookiesPolicyPage() {
  return (
    <PolicyLayout
      title="Cookies Policy"
      description="This Cookies Policy explains how MIXSMVRT uses cookies and similar technologies to run our platform and improve your experience."
    >
      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">What Are Cookies</h2>
        <p className="mt-2">
          Cookies are small text files that are stored on your device when you visit a website. They
          help the site remember information about your visit, such as your login status, language
          settings, and other preferences.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">How We Use Cookies</h2>
        <p className="mt-2">
          MIXSMVRT uses cookies and similar technologies to:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Keep you signed in and maintain session security;</li>
          <li>Remember your preferences and settings (such as theme or language);</li>
          <li>Measure traffic, performance, and usage patterns on our site; and</li>
          <li>Diagnose and fix technical issues.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Types of Cookies Used</h2>
        <p className="mt-2">
          We may use the following types of cookies:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-brand-text">Essential cookies:</span> required for the
            site to function and to keep your account secure.
          </li>
          <li>
            <span className="font-medium text-brand-text">Performance and analytics cookies:</span>
            help us understand how people use MIXSMVRT so we can improve the experience.
          </li>
          <li>
            <span className="font-medium text-brand-text">Preference cookies:</span> remember your
            choices, such as language or display settings.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Third-Party Cookies</h2>
        <p className="mt-2">
          Some cookies may be placed by third-party services that we integrate, such as analytics,
          payment providers, or content delivery networks. These providers may use cookies to deliver
          their services, measure performance, or comply with their own legal obligations.
        </p>
        <p className="mt-2">
          We encourage you to review the privacy and cookies policies of those third parties for more
          information about their practices.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Managing Cookies</h2>
        <p className="mt-2">
          Most browsers allow you to control cookies through their settings, including blocking or
          deleting cookies. If you choose to block certain cookies, some features of MIXSMVRT may not
          work properly.
        </p>
        <p className="mt-2">
          To learn more about managing cookies, visit your browser&apos;s help pages or resources from
          your local data protection authority.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Updates to This Policy</h2>
        <p className="mt-2">
          We may update this Cookies Policy from time to time. When we make changes, we will post the
          updated version on this page with a revised effective date. Continued use of MIXSMVRT after
          the changes take effect means you accept the updated Policy.
        </p>
      </section>
    </PolicyLayout>
  );
}
