import { t } from '../i18n';
import { supabase } from '../lib/supabase';

export default function DisabledTeam() {

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo_text.png" alt="BowlUp" className="h-32 w-auto" />
          </div>
          
          <h1 className="text-2xl font-black text-black mb-4 uppercase">
            {t('disabled.title')}
          </h1>
          
          <p className="text-black font-bold mb-6">
            {t('disabled.message')}
          </p>
          
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black hover:bg-orange-600 transition-all"
          >
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
