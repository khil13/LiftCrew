import LegalPage, { Section } from "@/components/LegalPage";
import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy · LiftCrew" };

export default function PrivacyPage() {
  const ul = "list-disc space-y-1 pl-5";

  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal information {LEGAL_ENTITY} (&quot;LiftCrew&quot;) collects when you use our
          website and app, how we use and share it, and the choices you have. We do not sell your personal information.
        </p>
      }
    >
      <Section title="1. Information we collect">
        <ul className={ul}>
          <li>
            <strong>Account:</strong> email address, name, phone number, city, profile photo, and account type
            (customer, helper, or company).
          </li>
          <li>
            <strong>Helpers:</strong> home address and its map location (used to show nearby jobs and never shown to
            other users), skills, experience, rate, travel radius, ratings, attendance, and no-show history.
          </li>
          <li>
            <strong>Companies:</strong> business name, website, and license details you provide.
          </li>
          <li>
            <strong>Jobs:</strong> job addresses, dates, and the details you add, applications, reviews, and dispute
            reports.
          </li>
          <li>
            <strong>Messages</strong> you send through LiftCrew.
          </li>
          <li>
            <strong>Location at check-in and check-out:</strong> helpers&apos; device location at the moment they check
            in or out of a job, to confirm attendance. We do not track location at other times.
          </li>
          <li>
            <strong>Payments:</strong> when card payments are on, our processor Stripe collects card and payout details;
            we receive only limited information such as payment status and the last 4 digits. When you pay in person, we
            don&apos;t collect payment details.
          </li>
          <li>
            <strong>Device and usage:</strong> IP address, browser and device type, log data, push notification tokens
            if you turn on notifications, and cookies needed to keep you signed in. We count page visits with Vercel Web
            Analytics, which uses no cookies and does not identify you.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <ul className={ul}>
          <li>
            To run the marketplace: create accounts, verify addresses are in our service area, match helpers with nearby
            jobs, handle bookings, check-ins, payments, reviews, and disputes.
          </li>
          <li>To send you sign-in codes and job notifications by email, text, or push notification.</li>
          <li>
            To keep LiftCrew safe and lawful: enforce our labor-only and service-area rules, review flagged posts and
            messages, prevent fraud, and respond to legal requests.
          </li>
          <li>To support you and improve the Service.</li>
        </ul>
      </Section>

      <Section title="3. What other users see">
        <ul className={ul}>
          <li>
            Helpers&apos; name, photo, bio, skills, rate, rating, and jobs completed are visible to signed-in users.
          </li>
          <li>
            Open jobs, including their addresses, are shown to helpers who can apply. Customers see the profiles of
            helpers who apply.
          </li>
          <li>
            Booked customers and helpers can message each other in the app. Phone numbers, emails, and helpers&apos;
            home addresses are not shown to other users.
          </li>
        </ul>
      </Section>

      <Section title="4. Who we share it with">
        <p>We share information only as needed to run LiftCrew, with service providers bound to protect it:</p>
        <ul className={ul}>
          <li>Supabase (database and sign-in) and Vercel (website hosting and visit counts)</li>
          <li>Google Maps Platform (address lookup and verification)</li>
          <li>Stripe (card payments and helper payouts, when enabled)</li>
          <li>Resend (email), Twilio (text messages), and your browser&apos;s push service (notifications)</li>
        </ul>
        <p>
          We may also share information to comply with the law or a valid legal request, to protect the safety and
          rights of users or others, or as part of a merger or sale of our business. We do not sell personal information
          or share it for targeted advertising.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your information while your account is open. After you close it, we delete or anonymize it within a
          reasonable time, except records we need to keep for legal, tax, safety, or dispute reasons (for example,
          completed job and payment records).
        </p>
      </Section>

      <Section title="6. Your choices and rights">
        <ul className={ul}>
          <li>You can update your profile and notification settings in the app.</li>
          <li>
            You can ask to access, correct, download, or delete your personal information, or to close your account, by
            emailing {SUPPORT_EMAIL}. New Jersey residents have these rights under the New Jersey Data Privacy Act,
            along with the right to opt out of sale, targeted advertising, and profiling (we do none of these).
          </li>
          <li>
            If we deny a request you may appeal by replying to our decision; we will respond within the time the law
            requires.
          </li>
        </ul>
      </Section>

      <Section title="7. Security">
        <p>
          We use encryption in transit, access controls, and database rules that limit each user to the data they need.
          No system is perfectly secure, so please use a secure email account, since it is how you sign in.
        </p>
      </Section>

      <Section title="8. Children">
        <p>LiftCrew is only for people 18 and older. We do not knowingly collect information from children.</p>
      </Section>

      <Section title="9. Changes and contact">
        <p>We will post changes here and notify you of material ones. Questions or requests: {SUPPORT_EMAIL}.</p>
      </Section>
    </LegalPage>
  );
}
