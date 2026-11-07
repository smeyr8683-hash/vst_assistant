# VST Assistant Team — កញ្ចប់ដំឡើង 0.2.0

កញ្ចប់នេះសម្រាប់ម្នាក់ៗដំឡើងលើកុំព្យូទ័រខ្លួន សាកភ្ជាប់ Facebook Page និងផុសដោយខ្លួនឯង។ Bot ត្រូវបានបិទជាលំនាំដើម។ កញ្ចប់នេះមិនមែនជាប្រព័ន្ធ Web កណ្ដាលសម្រាប់មនុស្សជាច្រើនចូលប្រើរួមទេ។

## ចាប់ផ្ដើម

1. ពន្លា ZIP ទៅ Folder ថ្មី។ កុំ Run ពីក្នុង ZIP។
2. ដំឡើង Node.js 22.14 ឡើងទៅ ឬ LTS ថ្មីដែលមាន `node:sqlite` ពី https://nodejs.org ។
3. Mac៖ បើក Terminal ក្នុង Folder នេះ ហើយវាយ `npm run setup:local`។ Windows៖ បើក `Install-Windows.cmd` ឬវាយបញ្ជាដូចគ្នាក្នុង Terminal។
4. Setup នឹងដំឡើង dependencies និង mkcert ពីប្រភពផ្លូវការ បង្កើត `.env.local` និង HTTPS សម្រាប់ម៉ាស៊ីននេះ។ វាអាចទាមទារពាក្យសម្ងាត់ម៉ាស៊ីន ឬការយល់ព្រមរបស់ Windows ដើម្បីដំឡើង Certificate Trust។ បញ្ចូលតែនៅក្នុង Terminal/System Prompt ផ្ទាល់។
5. អាន `FACEBOOK_SETUP_KM.md` ហើយបំពេញ App ID និង Configuration ID របស់ខ្លួនក្នុង `.env.local`។
6. វាយ `npm run check:local` ដើម្បីពិនិត្យ ហើយវាយ `npm run start:local`។
7. បើក **https://localhost:3443** ក្នុង Chrome។ ទុក Terminal ឱ្យនៅបើក; ចុច Ctrl+C ដើម្បីបញ្ឈប់ App។

Mac ក៏មាន `Install-Mac.command` និង `Start-Mac.command`។ បើ macOS រារាំងឯកសារដែលទាញយក សូមប្រើបញ្ជា Terminal ខាងលើ; កុំបិទប្រព័ន្ធការពារ។ បើ Browser បង្ហាញ Certificate Warning សូមឈប់ ហើយពិនិត្យ mkcert trust; កុំរំលង Warning ដោយស្វ័យប្រវត្តិ។

## សាកផុសលើកដំបូង

- ចូល Facebook Pages → Sync តាម FB Login។
- ជ្រើសតែ Page ដែលមានសិទ្ធិគ្រប់គ្រង ហើយពិនិត្យសិទ្ធិដែល Meta ស្នើមុនយល់ព្រម។
- បើក ផុស Story & Multi-Post → Page Feed / Reels។
- ជ្រើស Page មួយ រូបភាពមួយ បញ្ចូល Caption ហើយពិនិត្យមុនចុចផុស។
- ត្រូវផ្ទៀងផ្ទាត់ Post នៅលើ Facebook ពិតប្រាកដ; App បើកបាន ឬ Token មាន មិនមែនជាភស្តុតាងថាផុសជោគជ័យទេ។

## អ្វីដែលត្រូវយល់មុនប្រើ

- គណនី Facebook របស់អ្នកត្រូវមានសិទ្ធិលើ Page។ កូដមិនផ្ដល់សិទ្ធិ Meta ដោយខ្លួនឯងទេ។
- Local app នេះប្រើបានតែលើម៉ាស៊ីននេះ។ កូនក្រុមដែលចង់ប្រើលើម៉ាស៊ីនខ្លួន ត្រូវដំឡើង និងភ្ជាប់ដោយខ្លួនឯង។
- Database និង Tokens រក្សាទុកក្នុង `.local-data/`។ ទិន្នន័យ records អ៊ិនគ្រីប ហើយ Key រក្សាក្នុង Folder ដូចគ្នា; អ្នកដែលអាចអាន Folder ទាំងមូលអាចអានទិន្នន័យបាន។ កុំចែក Folder នេះ។
- Bot, Auto Scanner និង Webhook Subscription នៅ OFF។ កុំប្ដូរការកំណត់នេះសម្រាប់ការសាកផុស។
- Dashboard មានលេខគំរូ និងស្លាក Health ស្រាប់ក្នុងកូដ; មិនមែនជារបាយការណ៍ live ឬការផ្ទៀងផ្ទាត់សេវាទាំងអស់ទេ។
- Manual Caption មិនត្រូវការ Gemini Key។ AI Captions ត្រូវការ Key និងការផ្ទៀងផ្ទាត់ម៉ូដែលដាច់ដោយឡែក។
- ការផ្ទុកមេឌៀតាម Cloud/Supabase URL មិនបានរៀបចំក្នុងកញ្ចប់ Local នេះទេ។ ចាប់ផ្ដើមដោយ Upload ឯកសារពីម៉ាស៊ីន។
- គម្រោងមាន Direct Access ក្នុងម៉ាស៊ីន និងមិនទាន់បានរឹងមាំសម្រាប់ដាក់ Public Hosting ឬចែកតាម Tunnel ទេ។ កុំប្ដូរ bind address ពី `127.0.0.1`។

## ចែកបន្ត និង Update

ចែកតែ ZIP Release ស្អាតនេះ។ កុំ Zip Folder ដែលអ្នកប្រើរួច ដោយយក `.env.local`, `.local-data/`, `certificates/`, `.tools/`, `node_modules/` ឬ `.next/` ទៅជាមួយ។

ពេល Update ត្រូវបញ្ឈប់ App និង Backup Folder ផ្ទាល់ខ្លួនជាមុន។ រក្សា `.env.local`, `.local-data/` និង `certificates/` នៅម៉ាស៊ីនខ្លួន ហើយធ្វើតាមការណែនាំ Migration របស់ Release ថ្មី។ កុំជំនួស Database ដោយឯកសាររបស់អ្នកដទៃ។

សម្រាប់ Antigravity/Codex៖ អាន `ANTIGRAVITY_INSTRUCTIONS.md`។
