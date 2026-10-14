import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import { getAllowedStates, getPaymentMode, getPlatformFeePercent } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { HELPER_LABOR_ONLY_TERMS } from "@/lib/compliance/jobTypes";
import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Helper Agreement · LiftCrew" };

// Phase 5: independent-contractor agreement every helper accepts before applying.
export default async function HelperAgreementPage() {
  const [allowed, mode, fee] = await Promise.all([getAllowedStates(), getPaymentMode(), getPlatformFeePercent()]);
  const states = formatAllowedStates(allowed) || "our launch state";
  const ul = "list-disc space-y-1 pl-5";

  return (
    <LegalPage
      title="Helper Agreement"
      intro={
        <p>
          This agreement is between you, as a helper, and {LEGAL_ENTITY} (&quot;LiftCrew&quot;). It adds to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          . You accept it when you complete your helper profile, and you must accept it before applying to jobs.
        </p>
      }
    >
      <Section title="1. Independent contractor">
        <ul className={ul}>
          <li>
            You are an independent contractor running your own business. You are not an employee, agent, or partner of
            LiftCrew, and nothing in this agreement creates an employment relationship.
          </li>
          <li>
            You decide whether to use LiftCrew, when you are available, which jobs to apply for, and how to do the work
            safely and well. LiftCrew does not set your hours, require a minimum number of jobs, or stop you from
            working for others, including competitors.
          </li>
          <li>
            You supply your own work clothes, gloves, tools, and equipment (dollies, straps, blankets) and your own way
            to get to jobs.
          </li>
          <li>
            You are not eligible for employee benefits from LiftCrew, such as wages, overtime, workers&apos;
            compensation, or unemployment insurance, and you are responsible for your own insurance.
          </li>
        </ul>
      </Section>

      <Section title="2. Labor only — no transport">
        <p>You agree: &quot;{HELPER_LABOR_ONLY_TERMS}&quot;</p>
        <ul className={ul}>
          <li>
            Never drive a customer&apos;s truck or vehicle with their belongings, ride with their belongings, or offer
            to haul, deliver, or store anything. Politely decline if asked and tell us.
          </li>
          <li>
            Only take jobs within {states}. You must live in {states} to be a helper.
          </li>
        </ul>
      </Section>

      <Section title="3. Doing the work">
        <ul className={ul}>
          <li>
            Show up on time for jobs you are booked on, and check in and out in the app at the job address. Your
            location is recorded at check-in to confirm attendance.
          </li>
          <li>
            If you can&apos;t make it, tell the customer in the app as early as possible. A customer may report you as a
            no-show if you haven&apos;t checked in 30 minutes after the start; 3 no-shows suspend your account.
          </li>
          <li>
            Work safely: lift within your limits, use proper equipment, and refuse any task that is unsafe, involves
            hazardous materials, or needs a licensed trade.
          </li>
          <li>
            Treat customers, their homes, and their belongings with care and respect. Don&apos;t drink alcohol or use
            drugs on a job, and don&apos;t bring anyone who isn&apos;t booked.
          </li>
          <li>Keep customer information private and use it only for the job.</li>
        </ul>
      </Section>

      <Section title="4. Getting paid">
        <ul className={ul}>
          <li>
            Your pay for a job is the customer&apos;s hourly rate × the hours on the job. LiftCrew charges customers a
            separate service fee (currently {fee}% of labor); it does not come out of your rate.
          </li>
          {mode === "offline" ? (
            <li>
              <strong>Pay in person (pilot).</strong> The customer pays at the end of the job by cash, Cash App, or
              Zelle. Collect only your pay unless LiftCrew asks you to collect the full total, in which case you hold
              the service fee for LiftCrew and send it to LiftCrew within 7 days.
            </li>
          ) : (
            <li>
              <strong>Stripe payouts.</strong> You must set up a Stripe account to be paid. Your pay is released to it
              after the job is completed. Stripe&apos;s own terms apply to your account.
            </li>
          )}
          <li>
            Never ask a customer to pay you outside the app for a job you found on LiftCrew, beyond what this agreement
            allows.
          </li>
          <li>
            You are responsible for your own taxes. LiftCrew does not withhold taxes from your pay. Where required, you
            will receive a tax form (such as a 1099) and may need to provide your taxpayer information.
          </li>
        </ul>
      </Section>

      <Section title="5. Damage, injury, and insurance">
        <ul className={ul}>
          <li>You are responsible for damage or injury you cause through your own carelessness or misconduct.</li>
          <li>
            LiftCrew does not provide insurance for you. We recommend you carry your own general liability and
            occupational accident or health coverage.
          </li>
          <li>
            You agree to defend and indemnify LiftCrew against claims arising from your work, your conduct, or your
            breach of this agreement, except to the extent caused by LiftCrew&apos;s own gross negligence or misconduct.
          </li>
        </ul>
      </Section>

      <Section title="6. Ending this agreement">
        <p>
          You may stop using LiftCrew at any time. LiftCrew may suspend or close your account for breaking this
          agreement or the Terms, for repeated no-shows or poor ratings, or to protect customers. Sections 4 and 5
          survive after it ends. New Jersey law governs this agreement. Questions: {SUPPORT_EMAIL}.
        </p>
      </Section>
    </LegalPage>
  );
}
