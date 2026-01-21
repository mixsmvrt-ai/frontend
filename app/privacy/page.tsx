import type { Metadata } from "next";
import { PolicyLayout } from "../../components/PolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy · MIXSMVRT",
  description: "Privacy Policy for MIXSMVRT, describing how we handle account data, audio files, and AI processing.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      description="This Privacy Policy explains how MIXSMVRT collects, uses, and protects your information when you use our AI-powered music mixing and mastering services."
    >
      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Introduction</h2>
        <p className="mt-2">
          MIXSMVRT ("MIXSMVRT", "we", "our", or "us") respects your privacy. This Privacy Policy
          applies to visitors and registered users of our platform and describes how we handle
          personal data, account information, and audio content in connection with our services.
        </p>
        <p className="mt-2">
          By using MIXSMVRT, you agree that we may process your information as described in this
          Policy. If you do not agree, you should not use our services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Information We Collect</h2>
        <p className="mt-2">
          We may collect the following categories of information:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-brand-text">Account information:</span> email
            address, password (stored in hashed form), and basic profile details you choose to
            provide.
          </li>
          <li>
            <span className="font-medium text-brand-text">Usage information:</span> log data,
            device information, approximate location (based on IP), and how you interact with the
            site (such as features used and processing history).
          </li>
          <li>
            <span className="font-medium text-brand-text">Payment information:</span> billing
            details handled by our payment processors (we do not store full card numbers).
          </li>
          <li>
            <span className="font-medium text-brand-text">Support information:</span> messages and
            attachments you send to our support channels.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Audio &amp; File Handling</h2>
        <p className="mt-2">
          When you upload audio files, stems, or mixes to MIXSMVRT, we store and process them solely
          to deliver the services you request and to maintain your account history. Processed
          versions of your audio may be stored to allow you to re-download files, compare versions,
          or continue projects.
        </p>
        <p className="mt-2">
          We do not sell your audio files or license them to third parties. Access to your audio is
          restricted to systems and staff that need it to operate and support the service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">How We Use Your Information</h2>
        <p className="mt-2">
          We use the information we collect for purposes such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Creating and managing your account;</li>
          <li>Providing AI-powered mixing, mastering, and related tools;</li>
          <li>Processing payments and managing subscriptions;</li>
          <li>Measuring and improving performance, reliability, and user experience;</li>
          <li>Communicating with you about updates, changes, and support requests; and</li>
          <li>Complying with legal obligations and enforcing our Terms of Service.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">AI Processing &amp; Data Usage</h2>
        <p className="mt-2">
          MIXSMVRT uses AI models and other automated systems to analyze and transform your audio.
          Depending on the configuration, we may use anonymized aggregates of processing behavior
          (for example, which presets are chosen or which types of material are uploaded) to improve
          our models and features over time.
        </p>
        <p className="mt-2">
          We do not use your account-identifiable audio to train third-party models. Where we rely on
          external AI providers, we take reasonable steps to ensure that they handle data in a
          manner consistent with this Policy and applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Cookies &amp; Tracking</h2>
        <p className="mt-2">
          We use cookies and similar technologies to keep you logged in, remember preferences, and
          understand how the platform is used. Some cookies are essential for the service to
          function; others are used for analytics and performance.
        </p>
        <p className="mt-2">
          For more detail about how we use cookies and how you can control them, please see our
          Cookies Policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Data Sharing</h2>
        <p className="mt-2">
          We may share your information with trusted third parties in limited circumstances, such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Payment processors that handle billing on our behalf;</li>
          <li>Infrastructure and storage providers that host our services and your files;</li>
          <li>Analytics and monitoring services that help us maintain performance and security; and</li>
          <li>
            Professional advisers and authorities when required by law, regulation, or legal
            process.
          </li>
        </ul>
        <p className="mt-2">
          We do not sell your personal data to third parties.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Data Retention</h2>
        <p className="mt-2">
          We retain personal data and audio files for as long as necessary to provide the service,
          maintain your account, and comply with legal obligations. You may request deletion of your
          account or of specific projects, subject to technical and legal limitations.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">User Rights</h2>
        <p className="mt-2">
          Depending on your location, you may have rights such as access, correction, deletion,
          restriction, or portability of your personal data. You may also have the right to object
          to certain types of processing.
        </p>
        <p className="mt-2">
          To exercise your rights, contact us using the details below. We may need to verify your
          identity before responding to your request.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Security Measures</h2>
        <p className="mt-2">
          We use reasonable technical and organizational measures to protect your information and
          audio from unauthorized access, loss, or misuse. No online service can be completely
          secure, but we work to keep risks at a level appropriate to the nature of the data we
          handle.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">International Users</h2>
        <p className="mt-2">
          MIXSMVRT is used by artists in different countries. Your data may be stored and processed
          in regions other than the country where you live, including in countries that may have
          different data protection laws. We take reasonable steps to handle data in a manner that is
          consistent with this Policy and applicable requirements.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Changes to This Policy</h2>
        <p className="mt-2">
          We may update this Privacy Policy from time to time to reflect changes in our service or
          in applicable law. When we make material changes, we will post a notice on our site or
          notify you through your account.
        </p>
        <p className="mt-2">
          The revised Policy will apply to your use of MIXSMVRT after the effective date shown at the
          top of the page, unless otherwise required by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Contact Information</h2>
        <p className="mt-2">
          If you have questions about this Privacy Policy or our data practices, you can contact us
          at:
        </p>
        <p className="mt-2">
          Email: <span className="font-medium text-brand-text">privacy@mixsmvrt.com</span>
        </p>
      </section>
    </PolicyLayout>
  );
}
