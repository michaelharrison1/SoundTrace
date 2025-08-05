
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

  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
            Welcome to SoundTrace ("SoundTrace", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of the soundtrace.uk website, including any content, functionality, and services offered on or through soundtrace.uk (the "Service").
          </p>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms or the Privacy Policy, you may not access or use the Service.
          </p>

          <section aria-labelledby="use-of-service-heading">
            <h2 id="use-of-service-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">1. Description of Service</h2>
            <p>
              SoundTrace provides a platform for music producers and rights holders to upload their instrumentals (audio files) and scan for public uses across various platforms. The Service utilizes third-party audio recognition technology (e.g., ACRCloud) to identify matches. For matched tracks, the Service may retrieve additional metadata, such as estimated stream counts and cover art, from services like StreamClout. Users can also connect their Spotify accounts for enhanced functionality, such as playlist creation and profile integration.
            </p>
          </section>

          <section aria-labelledby="user-accounts-heading">
            <h2 id="user-accounts-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">2. User Accounts</h2>
            <p>
              To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section aria-labelledby="user-content-responsibilities-heading">
            <h2 id="user-content-responsibilities-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">3. User Content and Responsibilities</h2>
            <p>
              You are solely responsible for all audio files, data, information, and other materials ("User Content") that you upload, post, or otherwise transmit via the Service. You represent and warrant that you own or have all necessary licenses, rights, consents, and permissions to your User Content and to grant SoundTrace the rights to use your UserContent as described in these Terms.
            </p>
            <p>
              You grant SoundTrace a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content solely in connection with operating and providing the Service. This includes processing your audio files (e.g., creating snippets or fingerprints) and transmitting them to third-party recognition services.
            </p>
            <p>
              You agree not to upload User Content that is unlawful, harmful, defamatory, obscene, infringing, or otherwise objectionable.
            </p>
          </section>

          <section aria-labelledby="third-party-services-heading">
            <h2 id="third-party-services-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">4. Third-Party Services and Data</h2>
            <p>
              The Service integrates with and relies on various third-party services, including but not limited to ACRCloud (for audio recognition), StreamClout (for stream data), and Spotify API. Your use of these third-party services through SoundTrace may be subject to their respective terms of service and privacy policies.
            </p>
            <p>
              SoundTrace does not guarantee the accuracy, completeness, or timeliness of data provided by these third-party services (e.g., match accuracy, stream counts, artist information). The Service provides this information "as is" based on what is available from these third parties.
            </p>
          </section>

          <section aria-labelledby="intellectual-property-heading">
            <h2 id="intellectual-property-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">5. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of SoundTrace and its licensors. The Service is protected by copyright, trademark, and other laws of both the United Kingdom and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of SoundTrace.
            </p>
          </section>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">6. Privacy</h2>
            <p>
              Your privacy is important to us. Our <a href="/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</a> explains how we collect, use, and share your personal information. By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy.
            </p>
          </section>

          <section aria-labelledby="disclaimers-heading">
            <h2 id="disclaimers-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">7. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. SOUNDTRACE MAKES NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE SERVICE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE.
            </p>
            <p>
              SOUNDTRACE DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT DEFECTS WILL BE CORRECTED. WE DO NOT GUARANTEE THE ACCURACY OR COMPLETENESS OF ANY INFORMATION PROVIDED THROUGH THE SERVICE, INCLUDING MATCH RESULTS OR STREAM COUNT DATA FROM THIRD PARTIES.
            </p>
          </section>

          <section aria-labelledby="limitation-liability-heading">
            <h2 id="limitation-liability-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">8. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SOUNDTRACE, ITS AFFILIATES, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; (III) ANY CONTENT OBTAINED FROM THE SERVICE; AND (IV) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.
            </p>
          </section>

          <section aria-labelledby="changes-terms-heading">
            <h2 id="changes-terms-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">9. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section aria-labelledby="termination-heading">
            <h2 id="termination-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">10. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section aria-labelledby="governing-law-heading">
            <h2 id="governing-law-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">11. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.
            </p>
          </section>

          <section aria-labelledby="contact-us-tos-heading">
            <h2 id="contact-us-tos-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">12. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
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