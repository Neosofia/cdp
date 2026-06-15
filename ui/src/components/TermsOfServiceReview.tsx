import {
  CORPORATE_TOS_SECTIONS,
  CORPORATE_TOS_VERSION,
} from '@/lib/corporateTermsOfServiceContent';

export default function TermsOfServiceReview() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-600">
          Post Discharge Care Platform · Version {CORPORATE_TOS_VERSION}
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700" role="document">
        {CORPORATE_TOS_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-base font-semibold text-slate-900">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mb-3 last:mb-0">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
