
import React, { useEffect } from 'react';
import Button from './common/Button';

const TermsOfServicePage: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service - SoundTrace';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'SoundTrace Terms of Service - Read the terms and conditions for using our website and services.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'SoundTrace Terms of Service - Read the terms and conditions for using our website and services.';
      document.head.appendChild(newMeta);
    }
  }, []);

  const effectiveDate = "June 11, 2025";

  return (
    <div className="min-h-screen bg-[#C0C0C0] text-black p-2 sm:p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-[#C0C0C0] p-0.5 win95-border-outset">
        <header className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between h-8 mb-2">
          <h1 className="text-lg font-normal">Terms of Service</h1>
          <a href="/" className="win95-button-sm !text-xs !px-1 !py-0 hover:bg-gray-300" title="Go to Homepage">
            Home
          </a>
        </header>

        <main className="p-4 sm:p-6 space-y-4 text-sm sm:text-base leading-relaxed">
          <p className="text-xs text-gray-700">Effective Date: {effectiveDate}</p>

          <p>
            Welcome to Soundtrace. By accessing or using our website and services, you agree to be bound by these Terms of Service (“Terms”). Please read them carefully.
          </p>

          <section aria-labelledby="use-of-service-heading">
            <h2 id="use-of-service-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">1. Use of Service</h2>
            <p>
              You agree to use Soundtrace only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else’s use and enjoyment of the service.
            </p>
          </section>

          <section aria-labelledby="account-registration-heading">
            <h2 id="account-registration-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">2. Account Registration</h2>
            <p>
              You may be required to create an account and provide accurate information. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          <section aria-labelledby="user-content-heading">
            <h2 id="user-content-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">3. User Content</h2>
            <p>
              You retain ownership of your content, but you grant Soundtrace a license to use, host, and display it as necessary to provide the service.
            </p>
          </section>

          <section aria-labelledby="intellectual-property-heading">
            <h2 id="intellectual-property-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">4. Intellectual Property</h2>
            <p>
              All content, trademarks, and intellectual property on Soundtrace are owned by or licensed to us. You may not use our intellectual property without permission.
            </p>
          </section>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">5. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our <a href="/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</a> to understand how we collect and use your information.
            </p>
          </section>

          <section aria-labelledby="limitation-liability-heading">
            <h2 id="limitation-liability-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">6. Limitation of Liability</h2>
            <p>
              Soundtrace is provided “as is” without warranties. We are not liable for damages arising from your use of the service.
            </p>
          </section>

          <section aria-labelledby="changes-terms-heading">
            <h2 id="changes-terms-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">7. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the service means you accept the changes.
            </p>
          </section>

          <section aria-labelledby="termination-heading">
            <h2 id="termination-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account for violations of these Terms.
            </p>
          </section>

          <section aria-labelledby="governing-law-heading">
            <h2 id="governing-law-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which Soundtrace operates.
            </p>
          </section>

          <section aria-labelledby="contact-us-tos-heading">
            <h2 id="contact-us-tos-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">10. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <ul className="list-none pl-0 space-y-0.5 mt-1">
              <li>Email: <a href="mailto:support@soundtrace.uk" className="text-blue-700 hover:underline">support@soundtrace.uk</a></li>
              <li>Website: <a href="https://soundtrace.uk" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">https://soundtrace.uk</a></li>
            </ul>
          </section>

          <div className="mt-6 text-center">
            <Button onClick={() => window.location.href = '/'} size="md">
              Back to Home
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
