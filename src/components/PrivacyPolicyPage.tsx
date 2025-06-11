
import React, { useEffect } from 'react';
import Button from './common/Button'; // Assuming Button component for consistent styling

const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy - SoundTrace';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'SoundTrace Privacy Policy - How we collect, use, and safeguard your information when you use our website and services.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'SoundTrace Privacy Policy - How we collect, use, and safeguard your information when you use our website and services.';
      document.head.appendChild(newMeta);
    }
  }, []);

  const effectiveDate = "June 11, 2025";

  return (
    <div className="min-h-screen bg-[#C0C0C0] text-black p-2 sm:p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-[#C0C0C0] p-0.5 win95-border-outset">
        <header className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between h-8 mb-2">
          <h1 className="text-lg font-normal">Privacy Policy</h1>
          <a href="/" className="win95-button-sm !text-xs !px-1 !py-0 hover:bg-gray-300" title="Go to Homepage">
            Home
          </a>
        </header>

        <main className="p-4 sm:p-6 space-y-4 text-sm sm:text-base leading-relaxed">
          <p className="text-xs text-gray-700">Effective Date: {effectiveDate}</p>

          <p>
            Soundtrace ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
          </p>

          <section aria-labelledby="info-collect-heading">
            <h2 id="info-collect-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">1. Information We Collect</h2>
            
            <section aria-labelledby="personal-info-heading">
              <h3 id="personal-info-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">a. Personal Information</h3>
              <p>
                When you log in using Google Sign-In, we collect your basic profile information including:
              </p>
              <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
                <li>Your Google account email address</li>
                <li>Your name and profile picture (if you grant permission)</li>
                <li>Access tokens to connect with your YouTube data (with your consent)</li>
              </ul>
            </section>

            <section aria-labelledby="usage-data-heading">
              <h3 id="usage-data-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">b. Usage Data</h3>
              <p>
                We automatically collect certain information about your interaction with our services, such as scan activity, IP address, and device information, to improve and secure our service.
              </p>
            </section>
          </section>

          <section aria-labelledby="how-use-info-heading">
            <h2 id="how-use-info-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              <li>To authenticate you and provide access to your account</li>
              <li>To access your YouTube data via Google APIs for scanning videos and providing our service</li>
              <li>To improve, maintain, and secure our services</li>
              <li>To communicate with you about updates, support, or promotional information (only if you opt in)</li>
            </ul>
          </section>

          <section aria-labelledby="how-share-info-heading">
            <h2 id="how-share-info-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">3. How We Share Your Information</h2>
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              <li>We do not sell or rent your personal information to third parties.</li>
              <li>We may share your data with trusted service providers who assist us in operating our service, under strict confidentiality agreements.</li>
              <li>We comply with legal obligations and protect against fraud or abuse.</li>
            </ul>
          </section>

          <section aria-labelledby="data-security-heading">
            <h2 id="data-security-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">4. Data Security</h2>
            <p>
              We implement reasonable administrative, technical, and physical safeguards to protect your personal information from unauthorized access, alteration, or destruction.
            </p>
          </section>

          <section aria-labelledby="your-choices-heading">
            <h2 id="your-choices-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">5. Your Choices</h2>
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              <li>You can revoke access to your Google account data anytime by managing permissions in your Google account settings.</li>
              <li>You can contact us to request deletion or correction of your personal information.</li>
            </ul>
          </section>

          <section aria-labelledby="children-privacy-heading">
            <h2 id="children-privacy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">6. Children’s Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect data from children under 13.
            </p>
          </section>

          <section aria-labelledby="changes-policy-heading">
            <h2 id="changes-policy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page.
            </p>
          </section>

          <section aria-labelledby="contact-us-heading">
            <h2 id="contact-us-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">8. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at:
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

export default PrivacyPolicyPage;
