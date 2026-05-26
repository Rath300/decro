'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import supabase from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';

interface AIProtectionSettings {
  ai_training_opt_out: boolean;
  show_high_res_public: boolean;
  watermark_enabled: boolean;
}

export default function AIProtectionSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AIProtectionSettings>({
    ai_training_opt_out: true,
    show_high_res_public: false,
    watermark_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ai_training_opt_out, show_high_res_public, watermark_enabled')
          .eq('external_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            ai_training_opt_out: data.ai_training_opt_out ?? true,
            show_high_res_public: data.show_high_res_public ?? false,
            watermark_enabled: data.watermark_enabled ?? false,
          });
        }
      } catch (err) {
        console.error('Failed to load AI settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('external_id', user.id);

      if (error) throw error;

      showToast('AI protection settings updated', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="border-2 border-black p-6 bg-white">
        <p className="font-['Space_Mono'] text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black p-6 bg-white">
      <h2 className="font-['Space_Mono'] text-2xl font-bold mb-6">
        AI Training Protection
      </h2>

      <div className="space-y-6">
        {/* Opt Out of AI Training */}
        <div className="border-2 border-black p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-['Space_Mono'] text-lg font-bold mb-2">
                Block AI Training
              </h3>
              <p className="font-['Space_Mono'] text-sm mb-3">
                Prevent AI companies from scraping your work for model training. 
                We block known AI crawlers and add protection headers to all your content.
              </p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ 
                ...prev, 
                ai_training_opt_out: !prev.ai_training_opt_out 
              }))}
              className={`ml-4 px-6 py-2 border-2 border-black font-['Space_Mono'] font-bold transition-colors ${
                settings.ai_training_opt_out
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {settings.ai_training_opt_out ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* High-Res Public Display */}
        <div className="border-2 border-black p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-['Space_Mono'] text-lg font-bold mb-2">
                Public High-Resolution Images
              </h3>
              <p className="font-['Space_Mono'] text-sm mb-3">
                Allow unauthenticated users to view full resolution images. 
                When OFF, public viewers see lower resolution versions to protect your work.
              </p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ 
                ...prev, 
                show_high_res_public: !prev.show_high_res_public 
              }))}
              className={`ml-4 px-6 py-2 border-2 border-black font-['Space_Mono'] font-bold transition-colors ${
                settings.show_high_res_public
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {settings.show_high_res_public ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Watermark (Future Feature) */}
        <div className="border-2 border-black p-4 opacity-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-['Space_Mono'] text-lg font-bold mb-2">
                Auto-Watermark
              </h3>
              <p className="font-['Space_Mono'] text-sm mb-3">
                Automatically add a subtle watermark to your images.
                <span className="block mt-2 text-xs">(Coming Soon)</span>
              </p>
            </div>
            <button
              disabled
              className="ml-4 px-6 py-2 border-2 border-black font-['Space_Mono'] font-bold bg-gray-200 text-gray-500 cursor-not-allowed"
            >
              OFF
            </button>
          </div>
        </div>
      </div>

      {/* Protection Info */}
      <div className="mt-6 border-2 border-black p-4 bg-gray-50">
        <h4 className="font-['Space_Mono'] text-sm font-bold mb-2">
          What We Block:
        </h4>
        <ul className="font-['Space_Mono'] text-xs space-y-1">
          <li>• GPTBot (OpenAI)</li>
          <li>• ClaudeBot (Anthropic)</li>
          <li>• Google-Extended</li>
          <li>• CCBot (Common Crawl)</li>
          <li>• Meta/Facebook scrapers</li>
          <li>• And 10+ more AI crawlers</li>
        </ul>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full px-6 py-3 bg-black text-white border-2 border-black font-['Space_Mono'] font-bold hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {saving ? 'SAVING...' : 'SAVE SETTINGS'}
      </button>
    </div>
  );
}
