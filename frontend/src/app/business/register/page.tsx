"use client";
// Become a business partner — the five-step sign-up (inspired by the approved screens):
// 1 partner type · 2 business details (+ your account) · 3 services → the account and business are created here
// (same registration as before) · 4 documents and bank account · 5 review and submit (same submit as before).
// A server problem with the details takes you back to step 2 with the message under the field.
import { useQuery } from "@tanstack/react-query";
import { Building2, FileUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b, refreshBusinessSession } from "@/b2b/api";
import { useMe } from "@/b2b/components/BusinessShell";
import { Field } from "@/b2b/components/Field";
import { BankSection } from "@/b2b/components/kyc/BankSection";
import { BusinessDetailsForm, emptyDetails, toRequest } from "@/b2b/components/kyc/BusinessDetailsForm";
import { DocumentsSection } from "@/b2b/components/kyc/DocumentsSection";
import { PartnerTypeStep, ReviewStep, ServicesStep } from "@/b2b/components/wizard/steps";
import { StepButtons, StepHeading, WizardFrame } from "@/b2b/components/wizard/WizardFrame";
import { fieldErrors, TERMS_VERSION, type KycApplication } from "@/b2b/kyc";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Tokens } from "@/b2b/types";

const HEADINGS = [
  ["Choose your", "partnership type", "Tell us what kind of business you are."],
  ["Tell us about your", "business", "Help us understand your organisation, as per your official documents (GST / PAN)."],
  ["Add your travel", "services", "Choose the services you offer so we can set up your business profile."],
  ["Upload your business", "documents", "Share your documents and payout account for verification and activation."],
  ["Review & submit", "your application", "Please check your details before sending them to MusafirBaba."],
] as const;

export default function RegisterWizard() {
  const router = useRouter();
  const token = useBusinessSession((s) => s.accessToken);
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [checked, setChecked] = useState(Boolean(token));
  const [signedInAtStart, setSignedInAtStart] = useState(false);
  const [step, setStep] = useState(1);
  const [created, setCreated] = useState(false);
  const [details, setDetails] = useState(emptyDetails);
  const [owner, setOwner] = useState({ name: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const me = useMe();
  const kyc = useQuery({ queryKey: ["b2b", "kyc", token, "wizard"], queryFn: () => b2b<KycApplication>("/kyc"), enabled: created && Boolean(token) });

  useEffect(() => {
    if (checked) return;
    refreshBusinessSession().then((t) => {
      setSignedInAtStart(Boolean(t)); // already signed in: the new business is added to this account
      setChecked(true);
    });
  }, [checked]);
  useEffect(() => {
    if (checked && token && !created) setSignedInAtStart(true);
  }, [checked, token, created]);
  useEffect(() => {
    // braces on purpose: newer browsers return a Promise from a smooth scroll, and React must not get it back
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  async function createBusiness() {
    setBusy(true);
    setErrors({});
    try {
      const body = { details: toRequest(details, TERMS_VERSION), owner: signedInAtStart ? undefined : owner };
      const r = await b2b<Tokens>("/registrations/hotel", { method: "POST", body });
      setToken(r.accessToken);
      setCreated(true);
      setStep(4);
      toast.success(signedInAtStart ? "Business added to your account" : "Account created — we've emailed you a link to confirm your address");
    } catch (err) {
      if (err instanceof B2BError) {
        const fe = fieldErrors(err.details);
        if (Object.keys(fe).length > 0 || err.code === "NAME_AND_PASSWORD_REQUIRED" || err.code === "ACCOUNT_EXISTS_SIGN_IN") {
          setErrors(fe);
          setStep(2);
        }
      }
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!checked) return <div className="flex min-h-screen items-center justify-center text-[13px] text-slate-500">Loading…</div>;
  const [title, highlight, subtitle] = HEADINGS[step - 1] ?? HEADINGS[0];
  const refresh = () => void kyc.refetch();
  return (
    <WizardFrame step={step} title={title} highlight={highlight} subtitle={subtitle} canEdit={(n) => (created ? n >= 4 : n < 4)} onEdit={setStep}>
      {step === 1 && <PartnerTypeStep onNext={() => setStep(2)} />}
      {step === 2 && (
        <form onSubmit={(e) => (e.preventDefault(), setStep(3))}>
          <StepHeading icon={<Building2 className="h-5 w-5" />} title="Business details" text="Provide your organisation details as per your official documents (GST / PAN)." />
          {!signedInAtStart ? (
            <div className="mb-6 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <Field label="Your name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} autoComplete="name" required maxLength={120} />
              <Field label="Choose a password" type="password" value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} autoComplete="new-password" hint="At least 10 characters — you'll sign in with the email below." required />
            </div>
          ) : (
            <p className="mb-6 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">You&apos;re signed in — this business will be added to your account. A hotel company with its own PAN is a separate business; same PAN in another state? Add that GSTIN on your Verification page instead.</p>
          )}
          <BusinessDetailsForm value={details} onChange={setDetails} errors={errors} showPropertyCount={false} />
          <StepButtons onBack={() => setStep(1)} continueLabel="Continue to services" />
          {!signedInAtStart && (
            <p className="mt-3 text-center text-[13px] text-slate-500">
              Already registered? <Link href="/business/login" className="text-[#FE5300] hover:underline">Sign in</Link>
            </p>
          )}
        </form>
      )}
      {step === 3 && <ServicesStep value={details} onChange={setDetails} onBack={() => setStep(2)} onNext={createBusiness} busy={busy} />}
      {step >= 4 && !kyc.data && (
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {kyc.error ? errorMessage(kyc.error) : "Loading your application…"}
        </div>
      )}
      {step === 4 && kyc.data && (
        <div className="space-y-4">
          <StepHeading icon={<FileUp className="h-5 w-5" />} title="Required documents" text="Clear and valid documents: PDF, JPG or PNG (max 10 MB each). Then your payout bank account." />
          <DocumentsSection app={kyc.data} canEdit={kyc.data.editable} onChanged={refresh} />
          <BankSection key={`bank-${kyc.data.revision}`} app={kyc.data} canEdit={kyc.data.editable} onSaved={refresh} />
          <StepButtons type="button" onBack={undefined} continueLabel="Continue to review" onContinue={() => setStep(5)} />
        </div>
      )}
      {step === 5 && kyc.data && (
        <ReviewStep
          app={kyc.data}
          emailVerified={Boolean(me.data?.user.emailVerified)}
          email={me.data?.user.email ?? null}
          onBack={() => setStep(4)}
          onSubmitted={() => router.replace("/business/verification")}
        />
      )}
    </WizardFrame>
  );
}
