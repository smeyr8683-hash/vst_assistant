import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-200 py-16 px-6 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-extrabold text-white mb-2">គោលការណ៍ឯកជនភាព (Privacy Policy)</h1>
        <p className="text-sm text-cyan-400 mb-8">VST Assistant — Facebook Automation Platform</p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-base font-bold text-white mb-2">១. ការប្រមូលព័ត៌មាន (Information We Collect)</h2>
            <p>
              កម្មវិធី VST Assistant ត្រូវបានរៀបចំឡើងដើម្បីសម្រួលដល់ការឆ្លើយតបសារ និងមតិយោបល់ (Comments) លើទំព័រ Facebook របស់អាជីវកម្មដោយស្វ័យប្រវត្តិ។ យើងប្រមូល និងប្រើប្រាស់តែព័ត៌មានចាំបាច់ជាសាធារណៈដូចជា ឈ្មោះគណនី (Public Profile Name), លេខសម្គាល់មតិយោបល់ (Comment ID), និងខ្លឹមសារដែលអតិថិជនបានផ្ញើមកកាន់ទំព័រ Facebook Page ប៉ុណ្ណោះ។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">២. គោលបំណងនៃការប្រើប្រាស់ (How We Use Information)</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>ឆ្លើយតបមតិយោបល់ និងសាររបស់អតិថិជនដោយស្វ័យប្រវត្តិតាមរយៈ Facebook Messenger & Comment API។</li>
              <li>ផ្ដល់ព័ត៌មានផលិតផល តម្លៃ និងការប្រឹក្សាសុខភាពតាមការស្នើសុំរបស់អតិថិជន។</li>
              <li>គ្រប់គ្រង និងតាមដានសកម្មភាពអតិថិជនក្នុងផ្ទាំងគ្រប់គ្រងសម្រាប់ម្ចាស់អាជីវកម្ម។</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">៣. ការរក្សាការសម្ងាត់ និងសុវត្ថិភាពទិន្នន័យ (Data Protection & Privacy)</h2>
            <p>
              យើងប្តេជ្ញាចិត្តយ៉ាងម៉ឺងម៉ាត់ក្នុងការការពារឯកជនភាពរបស់អ្នកប្រើប្រាស់។ យើងមិនធ្វើការលក់ ចែករំលែក ឬផ្ទេរទិន្នន័យផ្ទាល់ខ្លួនរបស់អតិថិជនទៅកាន់ភាគីទីបីណាមួយឡើយ លើកលែងតែមានការអនុញ្ញាត ឬតម្រូវដោយច្បាប់។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">៤. សិទ្ធិក្នុងការលុបទិន្នន័យ (Data Deletion Request)</h2>
            <p>
              អតិថិជនមានសិទ្ធិស្នើសុំលុបទិន្នន័យផ្ទាល់ខ្លួនរបស់ពួកគេចេញពីប្រព័ន្ធរបស់យើងនៅគ្រប់ពេលវេលា ដោយគ្រាន់តែទាក់ទងមកកាន់ទំព័រ Facebook Page ឬផ្ញើអ៊ីមែលមកកាន់ផ្នែកជំនួយបច្ចេកទេស។
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">៥. ទំនាក់ទំនង (Contact Us)</h2>
            <p>
              ប្រសិនបើអ្នកមានសំណួរអំពីគោលការណ៍ឯកជនភាពនេះ សូមទាក់ទងមកកាន់ក្រុមការងារ VST Assistant តាមរយៈទំព័រ Facebook Page ផ្លូវការ ឬតាមរយៈអ៊ីមែល support@vst-assistant.com។
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
