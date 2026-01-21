import type { Metadata } from "next";
import { PolicyLayout } from "../../components/PolicyLayout";

export const metadata: Metadata = {
  title: "Terms of Service · MIXSMVRT",
  description: "Terms of Service for MIXSMVRT, an AI-powered music mixing and mastering platform.",
};

export default function TermsOfServicePage() {
  return (
    <PolicyLayout
      title="Terms of Service"
      description="These Terms of Service (the \"Terms\") govern your access to and use of MIXSMVRT, our AI-powered music mixing and mastering tools, and related services. By using MIXSMVRT, you agree to these Terms."
    >
      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Introduction</h2>
        <p className="mt-2">
          MIXSMVRT ("MIXSMVRT", "we", "our", or "us") provides an online platform that lets
          artists, producers, and creators upload audio and have it processed using AI-assisted
          mixing, mastering, and related tools. These Terms apply to all visitors, account holders,
          and anyone who accesses or uses our services (collectively, "you").
        </p>
        <p className="mt-2">
          Please read these Terms carefully. If you do not agree to them, you should not use
          MIXSMVRT.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Acceptance of Terms</h2>
        <p className="mt-2">
          By creating an account, accessing, or using MIXSMVRT in any way, you confirm that you
          accept these Terms and our other policies that are referenced or linked from our site
          (including our Privacy Policy, Cookies Policy, and Refund Policy). If you are using
          MIXSMVRT on behalf of an organization, you represent that you are authorized to accept
          these Terms on that organization&apos;s behalf.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Eligibility</h2>
        <p className="mt-2">
          You must be at least 18 years old, or the age of majority in your place of residence, to
          use MIXSMVRT. By using the service, you represent and warrant that you meet this
          requirement and that you are capable of entering into a binding agreement.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">User Accounts</h2>
        <p className="mt-2">
          To access certain features, you may need to create an account using a valid email address
          and password or a supported authentication provider. You are responsible for keeping your
          login credentials secure and for all activity that occurs under your account.
        </p>
        <p className="mt-2">
          You agree to provide accurate, complete information when creating your account and to
          update it as needed. We may suspend or terminate your account if we reasonably believe you
          have provided false information or violated these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Uploads &amp; Content Ownership</h2>
        <p className="mt-2">
          You may upload audio files, stems, mixes, artwork, metadata, and other content (collectively,
          "User Content") to be processed by MIXSMVRT. You keep full ownership of your User Content
          and any rights you already hold in it.
        </p>
        <p className="mt-2">
          By uploading User Content, you grant MIXSMVRT a limited, worldwide, non-exclusive,
          royalty-free license to host, store, copy, process, and create temporary derivative
          outputs solely for the purpose of providing and improving our services to you (for example,
          to apply AI chains, generate previews, and deliver processed files back to you).
        </p>
        <p className="mt-2">
          You are responsible for ensuring that you have all necessary rights, permissions, and
          clearances to upload User Content and to use our services with respect to that content.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">AI Processing Disclaimer</h2>
        <p className="mt-2">
          MIXSMVRT uses AI models, signal-processing algorithms, and other automated tools to
          process audio. Results may vary depending on your material, chosen presets, and settings.
          Our output is designed to provide mixes and masters that are suitable for professional use,
          but we do not guarantee any specific artistic outcome, loudness target, or third-party
          platform approval.
        </p>
        <p className="mt-2">
          You are solely responsible for reviewing all processed audio before release and for
          ensuring that it meets your technical, artistic, and legal requirements. MIXSMVRT does not
          act as your producer, engineer of record, or legal advisor.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Payments &amp; Subscriptions</h2>
        <p className="mt-2">
          MIXSMVRT may offer both subscription plans and one-time purchases. Prices, features, and
          limits for each plan are described on our pricing page and may change over time.
        </p>
        <p className="mt-2">
          When you purchase a subscription or a one-time service, you authorize us and our payment
          processors to charge the payment method you provide for the applicable fees and any
          associated taxes. Unless stated otherwise, subscriptions automatically renew at the end of
          each billing period until you cancel through your account or by contacting support.
        </p>
        <p className="mt-2">
          Our Refund Policy explains when refunds may be available. Where required by law, you may
          have additional statutory rights that are not affected by these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Prohibited Use</h2>
        <p className="mt-2">
          You agree not to use MIXSMVRT to:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Upload or distribute content that is unlawful, infringing, or defamatory;</li>
          <li>Violate copyrights, neighboring rights, or other intellectual property rights;</li>
          <li>
            Exploit or attempt to reverse engineer our systems, models, or infrastructure except as
            permitted by applicable law;
          </li>
          <li>Interfere with or disrupt the security or integrity of our services;</li>
          <li>Use automated scripts or bots to abuse rate limits or bypass usage controls; or</li>
          <li>Engage in any use that we reasonably consider abusive or harmful to others.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Intellectual Property</h2>
        <p className="mt-2">
          MIXSMVRT, including its software, user interface, brand, and underlying models, is
          protected by copyright, trademark, and other intellectual property laws. Except for the
          limited rights granted in these Terms, we reserve all rights, title, and interest in and to
          the service.
        </p>
        <p className="mt-2">
          You may not use our name, logo, or brand elements in a way that suggests endorsement or
          partnership without our prior written permission.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Limitation of Liability</h2>
        <p className="mt-2">
          To the maximum extent permitted by law, MIXSMVRT and its owners, employees, and partners
          shall not be liable for any indirect, incidental, special, consequential, or punitive
          damages, or for any loss of profits, revenues, data, or use, arising out of or in
          connection with your use of the service.
        </p>
        <p className="mt-2">
          Where our liability cannot be excluded under applicable law, it is limited to the amount
          you paid for the service in the twelve (12) months immediately preceding the event giving
          rise to the claim.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Termination</h2>
        <p className="mt-2">
          You may stop using MIXSMVRT at any time and may request account closure by contacting us.
          We may suspend or terminate your access to the service if we reasonably believe you have
          violated these Terms, used the service in a fraudulent or abusive way, or where we are
          required to do so by law or a court order.
        </p>
        <p className="mt-2">
          If we terminate your access due to a material breach of these Terms, we are not obligated
          to refund any fees already paid, except where required by law or our Refund Policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Governing Law</h2>
        <p className="mt-2">
          These Terms are governed by the laws of the jurisdiction in which MIXSMVRT is operated,
          without regard to conflict-of-law principles. Depending on where you live, you may also be
          entitled to the protection of mandatory consumer protection laws in your country of
          residence.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Contact Information</h2>
        <p className="mt-2">
          If you have questions about these Terms or about MIXSMVRT, you can contact us at:
        </p>
        <p className="mt-2">
          Email: <span className="font-medium text-brand-text">support@mixsmvrt.com</span>
        </p>
      </section>
    </PolicyLayout>
  );
}
