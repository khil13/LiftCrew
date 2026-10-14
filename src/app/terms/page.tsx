import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import { getAllowedStates, getPaymentMode, getPlatformFeePercent } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { CUSTOMER_LABOR_ONLY_ATTESTATION, HELPER_LABOR_ONLY_TERMS } from "@/lib/compliance/jobTypes";
import { MIN_JOB_HOURS } from "@/lib/pricing";
import { LEGAL_ENTITY, SITE_URL, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Terms of Service · LiftCrew" };

// Section 7, Rule 5: the Terms must say LiftCrew is a labor-only marketplace,
// not a moving company or broker; that service is limited to the allowed
// state(s); and that helpers are independent contractors.
export default async function TermsPage() {
  const [allowed, mode, fee] = await Promise.all([getAllowedStates(), getPaymentMode(), getPlatformFeePercent()]);
  const states = formatAllowedStates(allowed) || "our launch state";
  const ul = "list-disc space-y-1 pl-5";

  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These Terms are an agreement between you and {LEGAL_ENTITY} (&quot;LiftCrew&quot;, &quot;we&quot;,
          &quot;us&quot;) and govern your use of {SITE_URL} and the LiftCrew app (the &quot;Service&quot;). By creating
          an account or using the Service you agree to these Terms and to our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          . Customers also agree to the{" "}
          <Link href="/customer-release" className="underline">
            Customer Booking Terms &amp; Release
          </Link>{" "}
          each time they post a job, and helpers agree to the{" "}
          <Link href="/helper-agreement" className="underline">
            Helper Agreement
          </Link>
          .
        </p>
      }
    >
      <Section title="1. What LiftCrew is">
        <p>
          LiftCrew is an online marketplace that connects people and businesses who need moving labor
          (&quot;customers&quot;, including moving companies) with independent helpers who provide that labor
          (&quot;helpers&quot;).{" "}
          <strong>
            LiftCrew is a labor-only marketplace. LiftCrew is not a moving company, household goods carrier, motor
            carrier, freight forwarder, or broker.
          </strong>{" "}
          We do not transport goods, arrange transportation, or book, rent, recommend, or resell trucks, containers,
          storage, or any transportation service. We do not perform the work: helpers do, and each job is an agreement
          between the customer and the helpers who accept it.
        </p>
      </Section>

      <Section title="2. Labor only — no transport">
        <p>
          Helpers may only load, unload, pack, unpack, assemble furniture, lift heavy items, and move items on foot
          within or between rooms and buildings at the job address.
        </p>
        <ul className={ul}>
          <li>
            Customers must provide their own truck, trailer, container, or other vehicle and arrange any driving
            themselves. When posting a job, customers confirm: &quot;{CUSTOMER_LABOR_ONLY_ATTESTATION}&quot;
          </li>
          <li>Helpers agree: &quot;{HELPER_LABOR_ONLY_TERMS}&quot;</li>
          <li>
            Asking a helper to drive, haul, deliver, or transport belongings, or offering to, breaks these Terms. We
            review posts and messages that mention transport and may remove content or suspend accounts.
          </li>
        </ul>
      </Section>

      <Section title="3. Service area">
        <p>
          LiftCrew is currently available only for jobs located entirely within <strong>{states}</strong>. Every job
          address must be in {states}, and a job with two addresses must have both in the same state. Helpers must live
          in {states}. We verify addresses with a mapping service and may cancel any job that does not meet this rule.
        </p>
      </Section>

      <Section title="4. Helpers are independent contractors">
        <p>
          Helpers are independent contractors, not employees, agents, or partners of LiftCrew. Helpers choose whether,
          when, and which jobs to accept, and control how they perform the work, subject to the labor-only rules above
          and the customer&apos;s reasonable instructions. LiftCrew does not supervise the work and does not guarantee
          the quality, safety, or legality of any job, helper, or customer.
        </p>
      </Section>

      <Section title="5. Eligibility and accounts">
        <ul className={ul}>
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>Give accurate information and keep it current. One person per account; don&apos;t share access.</li>
          <li>
            You are responsible for activity under your account. Tell us at {SUPPORT_EMAIL} if you think it has been
            accessed without permission.
          </li>
          <li>
            Company accounts must be approved by LiftCrew before posting jobs, and the person who creates one confirms
            they may bind that business.
          </li>
        </ul>
      </Section>

      <Section title="6. Booking, pricing, and fees">
        <ul className={ul}>
          <li>
            Customers set the hourly rate per helper, the number of helpers, and the estimated hours. The job total is
            helpers × hours × rate, plus a LiftCrew service fee (currently {fee}% of the labor amount), shown before you
            post. Every job is booked for at least {MIN_JOB_HOURS} hours.
          </li>
          {mode === "offline" ? (
            <li>
              <strong>Pay in person.</strong> During our pilot, no payment is taken in the app. The customer pays the
              total shown on the job page at the end of the job by cash, Cash App, or Zelle, as described in the
              job&apos;s payment instructions. LiftCrew does not process or hold these payments; disputes about them are
              between the customer and the helpers, though we will try to help.
            </li>
          ) : (
            <li>
              <strong>Pay at booking.</strong> Customers pay the job total by card through our payment processor,
              Stripe, when posting a job. We hold the payment and release helpers&apos; pay after the job is completed.
              Helpers are paid to their own Stripe account; LiftCrew keeps the service fee.
            </li>
          )}
          <li>
            If a job runs longer or shorter than estimated, the customer and helpers should agree on the change before
            the extra time is worked.
          </li>
          <li>Tips are optional and go entirely to helpers.</li>
        </ul>
      </Section>

      <Section title="7. Cancellations, no-shows, and disputes">
        <ul className={ul}>
          {mode === "offline" ? (
            <li>
              Customers may cancel a job in the app at any time before it starts. Please cancel as early as possible;
              repeated late cancellations may lead us to restrict an account.
            </li>
          ) : (
            <li>
              Customers who cancel more than 24 hours before the start receive a full refund. Later cancellations pay
              each booked helper for 1 hour and refund the rest.
            </li>
          )}
          <li>
            Helpers who are booked must show up on time. A customer may report a helper who has not checked in 30
            minutes after the start as a no-show. Repeated no-shows (3 by default) suspend a helper&apos;s account.
          </li>
          <li>
            Customers can report a problem with a job from the job page while it is in progress and before it is marked
            complete (jobs are completed automatically about 48 hours after their scheduled end). We will review the job
            record, check-in times, and messages and make a decision in good faith, which is final as far as
            LiftCrew&apos;s own fees and holds are concerned.
          </li>
        </ul>
      </Section>

      <Section title="8. Rules of conduct">
        <p>You agree not to:</p>
        <ul className={ul}>
          <li>Use the Service for any job involving transport of goods, or any job outside the service area.</li>
          <li>
            Post or ask helpers to handle hazardous materials, illegal items, firearms or ammunition, controlled
            substances, or live animals.
          </li>
          <li>
            Harass, threaten, discriminate against, or endanger anyone, or post false, misleading, or offensive content.
          </li>
          <li>Ask for or share another user&apos;s private information except as needed for a booked job.</li>
          <li>
            Misuse the Service, including scraping, reverse engineering, creating fake accounts, or interfering with its
            security.
          </li>
        </ul>
        <p>
          We may remove content, cancel jobs, and suspend or close accounts that break these Terms or put others at
          risk. You may close your account at any time by contacting {SUPPORT_EMAIL}.
        </p>
      </Section>

      <Section title="9. Ratings and content">
        <p>
          Customers and helpers can rate and review each other after a job. Reviews must be honest and about the job.
          You keep ownership of what you post, and you give LiftCrew a non-exclusive, royalty-free license to host,
          show, and use it to run and promote the Service. We may remove content that breaks these Terms.
        </p>
      </Section>

      <Section title="10. Risk, release, and limitation of liability">
        <p>
          Moving work involves physical effort and a risk of injury and property damage. Customers should protect, pack,
          and insure valuable or fragile items and remove them from the work area if needed. Except where the law does
          not allow it:
        </p>
        <ul className={ul}>
          <li>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </li>
          <li>
            LiftCrew is not responsible for the acts or omissions of customers or helpers, including injury, loss,
            theft, or damage to property that happens during a job. Claims for those belong between the customer and the
            helpers involved.
          </li>
          <li>
            LIFTCREW WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
            LOST PROFITS. LIFTCREW&apos;S TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THE SERVICE IS LIMITED TO THE
            GREATER OF $100 OR THE SERVICE FEES YOU PAID LIFTCREW IN THE 12 MONTHS BEFORE THE CLAIM.
          </li>
        </ul>
        <p>
          Nothing in these Terms limits liability that cannot be limited under New Jersey law, including for gross
          negligence or willful misconduct.
        </p>
      </Section>

      <Section title="11. Indemnity">
        <p>
          You agree to defend and indemnify LiftCrew and its owners and contractors against claims, losses, and costs
          (including reasonable attorneys&apos; fees) arising from your use of the Service, your jobs, your content, or
          your breach of these Terms or the law.
        </p>
      </Section>

      <Section title="12. Disputes with LiftCrew">
        <p>
          Please contact us first at {SUPPORT_EMAIL}; most problems can be solved quickly. These Terms are governed by
          the laws of the State of New Jersey, without regard to its conflict-of-law rules. Any claim against LiftCrew
          must be brought in the state or federal courts located in New Jersey, or in small claims court where it
          qualifies, and you and LiftCrew consent to those courts&apos; jurisdiction.
        </p>
      </Section>

      <Section title="13. Changes">
        <p>
          We may update these Terms. If a change is material we will notify you in the app or by email before it takes
          effect, and we may ask you to accept the new version before you post or apply to more jobs. Continuing to use
          the Service after a change means you accept it.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          {LEGAL_ENTITY} · New Jersey · {SUPPORT_EMAIL}
        </p>
      </Section>
    </LegalPage>
  );
}
