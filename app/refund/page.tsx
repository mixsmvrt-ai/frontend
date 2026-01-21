import type { Metadata } from "next";
import { PolicyLayout } from "../../components/PolicyLayout";

export const metadata: Metadata = {
  title: "Refund Policy · MIXSMVRT",
  description: "Refund Policy for MIXSMVRT, covering subscriptions, one-time purchases, and failed processing cases.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      title="Refund Policy"
      description="This Refund Policy explains when refunds may be available for MIXSMVRT subscriptions and one-time processing purchases."
    >
      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Overview</h2>
        <p className="mt-2">
          MIXSMVRT provides digital audio processing services, including AI-assisted mixing and
          mastering. Because our services are delivered digitally and often completed shortly after
          you submit material, refunds are limited and evaluated case by case as described below.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Digital Services Disclaimer</h2>
        <p className="mt-2">
          When you request processing (for example, by uploading a track and starting a mix or
          master), you understand that we begin providing the service immediately. In many
          jurisdictions, this means that once the service has been fully performed, you may lose any
          statutory right to withdraw that applies to digital content.
        </p>
        <p className="mt-2">
          Nothing in this Policy is intended to limit any non-waivable consumer rights you may have
          under applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Subscription Refunds</h2>
        <p className="mt-2">
          Subscription fees are typically non-refundable once a billing period has started. However,
          we may consider partial or full refunds in limited situations, such as:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Repeated technical issues on our side that prevent you from using the service;</li>
          <li>Incorrect charges caused by a system error; or</li>
          <li>Duplicate subscriptions for the same account.</li>
        </ul>
        <p className="mt-2">
          If you believe you are entitled to a subscription refund, contact us with relevant details
          (account email, dates, and receipts). We review each request individually and may ask for
          additional information.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">One-Time Purchases</h2>
        <p className="mt-2">
          For one-time processing purchases (such as per-track mix or master credits), refunds are
          generally not offered after a job has been successfully processed and delivered. If you
          encounter a technical issue that clearly prevents us from delivering a usable result, we
          will work with you to either re-process the material or, where appropriate, issue a
          replacement credit.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Failed Processing Cases</h2>
        <p className="mt-2">
          In rare cases, a processing job may fail due to system errors, incompatible files, or
          other technical problems. If a job fails for reasons within our control and we are unable
          to provide a successful result within a reasonable time, we may offer a refund or credit at
          our discretion.
        </p>
        <p className="mt-2">
          We may request that you re-upload source files or adjust settings so we can attempt to
          resolve the issue before deciding on a refund.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Chargebacks</h2>
        <p className="mt-2">
          If you initiate a chargeback with your bank or payment provider, we may suspend or limit
          your access to MIXSMVRT while the matter is investigated. Where a chargeback is resolved in
          our favor, we may reinstate access once outstanding amounts have been settled.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-red-400 sm:text-lg">Contact &amp; Support</h2>
        <p className="mt-2">
          If you have questions about this Refund Policy or believe you are entitled to a refund or
          credit, please contact us using the details below:
        </p>
        <p className="mt-2">
          Email: <span className="font-medium text-brand-text">billing@mixsmvrt.com</span>
        </p>
      </section>
    </PolicyLayout>
  );
}
