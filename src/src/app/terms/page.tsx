import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-200 py-16 px-6 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-extrabold text-white mb-2">លក្ខខណ្ឌនៃការប្រើប្រាស់ (Terms of Service)</h1>
        <p className="text-sm text-cyan-400 mb-8">VST Assistant — Facebook Automation Platform</p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-base font-bold text-white mb-2">១. ការទទួលយកលក្ខខណ្ឌ (Acceptance of Terms)</h2>
            <p>
              តាមរយៈការប្រើប្រាស់សេវាកម្ម VST Assistant និងការភ្ជាប់ជាមួយទំព័រ Facebook Page របស់អ្នក អ្នកយល់ព្រមគោរពតាមលក្ខខណ្ឌ និងគោលការណ៍ណែនាំដែលបានចែងក្នុងឯកសារនេះ ព្រមទាំងគោលការណ៍របស់ Meta Platform Terms។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">២. ការពិពណ៌នាអំពីសេវាកម្ម (Description of Service)</h2>
            <p>
              VST Assistant ផ្ដល់នូវឧបករណ៍ស្វ័យប្រវត្តិកម្មឆ្លាតវៃក្នុងការឆ្លើយតប Comment និងផ្ញើសារ Inbox ទៅកាន់អតិថិជននៅលើ Facebook Page ដោយអនុលោមតាមបច្ចេកវិទ្យា Meta Graph API។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">៣. ទំនួលខុសត្រូវរបស់អ្នកប្រើប្រាស់ (User Responsibility)</h2>
            <p>
              អ្នកប្រើប្រាស់ត្រូវធានាថាមាតិកា និងការឆ្លើយតបទាំងអស់មិនបំពានលើច្បាប់ ឬគោលការណ៍សហគមន៍របស់ Facebook មិនមានសារបោកប្រាស់ ឬការផ្ញើសាររំខាន (Spam) ឡើយ។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">៤. ការកែប្រែ ឬការផ្អាកសេវា (Modifications)</h2>
            <p>
              យើងរក្សាសិទ្ធិក្នុងការកែប្រែ ឬធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះដើម្បីឱ្យស្របទៅតាមការវិវត្តនៃបច្ចេកវិទ្យា និងគោលការណ៍របស់ Meta នៅពេលចាំបាច់។
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
          © 2026 VST Assistant. រក្សាសិទ្ធិគ្រប់យ៉ាង។
        </div>
      </div>
    </div>
  );
}
