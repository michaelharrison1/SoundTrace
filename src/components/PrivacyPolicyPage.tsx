
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

  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
            SoundTrace ("we", "our", "us", or "the Service") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (soundtrace.uk) and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
          </p>

          <section aria-labelledby="info-collect-heading">
            <h2 id="info-collect-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">1. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>

            <section aria-labelledby="personal-info-heading">
              <h3 id="personal-info-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">a. Personal Data</h3>
              <p>
                Personally identifiable information, such as your username and hashed password, that you voluntarily give to us when you register for an account. If you choose to link your account with third-party services, we may collect:
              </p>
              <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
                <li><strong>Google Account:</strong> Your Google email address, name, profile picture, and authentication tokens (access and refresh tokens) if you connect your Google account. This is used for basic profile information and to facilitate interactions with Google services as directed by you.</li>
                <li><strong>Spotify Account:</strong> Your Spotify profile information (User ID, display name, profile URL, avatar), email address, and authentication tokens (access and refresh tokens) if you connect your Spotify account. This is used to fetch your Spotify data and enable features like playlist creation.</li>
              </ul>
            </section>

            <section aria-labelledby="uploaded-content-heading">
              <h3 id="uploaded-content-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">b. Uploaded Content and Scan Data</h3>
              <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
                <li><strong>Instrumentals:</strong> Audio files you upload for scanning. Snippets or fingerprints of these files are sent to third-party recognition services.</li>
                <li><strong>Scan Results:</strong> Information returned from audio recognition services (e.g., ACRCloud), such as matched song titles, artists, albums, and platform-specific identifiers.</li>
                <li><strong>Stream Data:</strong> We use services like StreamClout to fetch estimated stream counts and cover art for matched tracks, using identifiers obtained from scan results.</li>
              </ul>
            </section>

            <section aria-labelledby="derivative-data-heading">
                <h3 id="derivative-data-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">c. Derivative Data</h3>
                <p>
                    Information our servers automatically collect when you access the Site, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Site. We also collect data about your interactions with the Service, such as scan jobs initiated and features used.
                </p>
            </section>

            <section aria-labelledby="cookie-data-heading">
                <h3 id="cookie-data-heading" className="text-sm sm:text-base font-normal mt-2 mb-0.5">d. Cookies and Tracking Technologies</h3>
                <p>
                    We use cookies to manage your session and authentication (e.g., `soundtrace_session_token`). We may also use cookies for third-party authentication flows (e.g., `spotify_auth_state`, `spotify_code_verifier`). You can control the use of cookies at the browser level, but if you choose to disable cookies, it may limit your use of certain features or functions on our website or service.
                </p>
            </section>
          </section>

          <section aria-labelledby="how-use-info-heading">
            <h2 id="how-use-info-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">2. How We Use Your Information</h2>
            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
            <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
              <li>Create and manage your account.</li>
              <li>Process your uploaded instrumentals for music recognition using third-party services like ACRCloud.</li>
              <li>Fetch and display estimated stream counts and related metadata from services like StreamClout for matched tracks.</li>
              <li>Enable Spotify integration features, such as displaying your Spotify profile information and creating playlists on your behalf, with your explicit consent and action.</li>
              <li>Enable Google integration for profile information.</li>
              <li>Display historical scan data and analytics related to your content's usage.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the Site and our services.</li>
              <li>Notify you of updates to the Service.</li>
              <li>Respond to customer service requests.</li>
              <li>Maintain the security and operation of our Service.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section aria-labelledby="how-share-info-heading">
            <h2 id="how-share-info-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">3. Disclosure of Your Information</h2>
            <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
            <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
              <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
              <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including:
                <ul className="list-['-_'] list-inside pl-4 space-y-0.5 mt-0.5">
                    <li><strong>ACRCloud:</strong> For audio fingerprinting and music recognition. We send audio snippets or fingerprints of your uploaded instrumentals.</li>
                    <li><strong>StreamClout:</strong> To fetch estimated stream counts and related metadata. We send identifiers (e.g., Spotify track IDs) of matched songs.</li>
                    <li><strong>Spotify API:</strong> When you connect your Spotify account or use Spotify-related features (e.g., playlist creation), we interact with the Spotify API as authorized by you.</li>
                    <li><strong>Google API Services:</strong> When you connect your Google account, we interact with Google APIs to retrieve profile information as authorized by you. Our use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
                    <li>Other service providers for hosting, data storage, analytics, and customer service. These providers are obligated to protect your information.</li>
                </ul>
              </li>
              <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
              <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.</li>
            </ul>
            <p className="mt-1">We do not sell your personal information to third parties.</p>
          </section>

          <section aria-labelledby="data-security-heading">
            <h2 id="data-security-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">4. Data Security, Storage, and Retention</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
            <p>
              Your information is stored on secure servers, which may be located outside of your country of residence. We retain your personal information for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes, and enforce our agreements. Scan logs and associated data will be retained as long as they are relevant to the service, or until you request deletion.
            </p>
          </section>

          <section aria-labelledby="your-choices-heading">
            <h2 id="your-choices-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">5. Your Rights and Choices</h2>
            <ul className="list-disc list-inside pl-4 space-y-0.5 mt-1">
              <li><strong>Account Information:</strong> You may at any time review or change the information in your account or terminate your account by logging into your account settings or contacting us using the contact information provided below. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Service and/or comply with legal requirements.</li>
              <li><strong>Third-Party Account Connections:</strong> You can disconnect your Google or Spotify account from SoundTrace at any time through your SoundTrace account settings or through the respective third-party's account settings page. Revoking access will stop further data collection from that service but will not delete data already collected.</li>
              <li><strong>Access, Correction, Deletion:</strong> Depending on your jurisdiction, you may have the right to request access to, correction of, or deletion of your personal data. Please contact us to make such requests.</li>
              <li><strong>Emails and Communications:</strong> If you no longer wish to receive correspondence, emails, or other communications from us, you may opt-out by contacting us using the contact information provided below.</li>
            </ul>
          </section>

          <section aria-labelledby="children-privacy-heading">
            <h2 id="children-privacy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">6. Policy for Children</h2>
            <p>
              We do not knowingly solicit information from or market to children under the age of 13 (or other age as required by local law). If we learn that we have collected personal information from a child under such age without verification of parental consent, we will delete that information as quickly as possible. If you believe we might have any information from or about a child under this age, please contact us.
            </p>
          </section>

          <section aria-labelledby="changes-policy-heading">
            <h2 id="changes-policy-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">7. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top of this PrivacyPolicy. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section aria-labelledby="contact-us-heading">
            <h2 id="contact-us-heading" className="text-base sm:text-lg font-normal mt-3 mb-1">8. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at:
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