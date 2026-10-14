import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import { getAllowedStates } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { CUSTOMER_LABOR_ONLY_ATTESTATION } from "@/lib/compliance/jobTypes";
import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Customer Booking Terms & Release · LiftCrew" };

// Phase 5: the liability waiver customers accept each time they post a job.
export default async function CustomerReleasePage() {
  const states = formatAllowedStates(await getAllowedStates()) || "our launch state";
  const ul = "list-disc space-y-1 pl-5";

  return (
    <LegalPage
      title="Customer Booking Terms & Release"
      intro={
        <p>
          You accept these terms each time you post a job on LiftCrew. They add to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          . Please read them carefully: <strong>section 4 is a release of claims against LiftCrew.</strong>
        </p>
      }
    >
      <Section title="1. Labor only">
        <p>By posting a job you confirm: &quot;{CUSTOMER_LABOR_ONLY_ATTESTATION}&quot;</p>
        <ul className={ul}>
          <li>
            You arrange and drive any truck, trailer, or container yourself, or through a separate company you hire.
            LiftCrew does not recommend or arrange one.
          </li>
          <li>
            Helpers will not drive your vehicle, ride with your belongings, or carry items anywhere other than on foot
            at your job address(es).
          </li>
          <li>Both addresses must be in {states}.</li>
        </ul>
      </Section>

      <Section title="2. Your responsibilities">
        <ul className={ul}>
          <li>Describe the job honestly, including stairs, elevators, long carries, and heavy or unusual items.</li>
          <li>
            Keep the work area reasonably safe: clear paths, working lights, secured pets, and parking or loading
            access.
          </li>
          <li>
            Pack, protect, and label your belongings. Remove or personally handle cash, jewelry, documents, medication,
            firearms, irreplaceable items, and anything fragile or very valuable.
          </li>
          <li>
            Do not ask helpers to handle hazardous materials (propane, gasoline, chemicals, etc.), illegal items, or
            anything that needs a licensed professional (gas lines, electrical, wall mounts into structure).
          </li>
          <li>Be present, or have an adult you authorize present, for the whole job.</li>
          <li>Pay the agreed amount as shown on the job page.</li>
        </ul>
      </Section>

      <Section title="3. Damage, loss, and injury">
        <ul className={ul}>
          <li>
            Helpers are independent contractors. LiftCrew does not employ, supervise, or insure them, and does not
            perform the work.
          </li>
          <li>
            LiftCrew does not provide moving insurance or valuation coverage. Check whether your homeowner&apos;s or
            renter&apos;s insurance covers your belongings during a move.
          </li>
          <li>
            If something is damaged or someone is hurt, raise it with the helpers right away, note it before the job
            ends, and report it from the job page so the record shows what happened.
          </li>
        </ul>
      </Section>

      <Section title="4. Release of LiftCrew">
        <p>
          To the fullest extent New Jersey law allows, you release {LEGAL_ENTITY} and its owners, employees, and
          contractors from all claims, damages, and liability for personal injury, property damage, loss, or theft
          arising from a job you book through LiftCrew, including claims based on LiftCrew&apos;s ordinary negligence.
          Any such claim is between you and the helpers involved. This release does not apply to LiftCrew&apos;s gross
          negligence, recklessness, or intentional misconduct, or to anything the law does not allow to be released.
        </p>
      </Section>

      <Section title="5. Questions">
        <p>Contact us at {SUPPORT_EMAIL} before posting a job if you have questions about these terms.</p>
      </Section>
    </LegalPage>
  );
}
