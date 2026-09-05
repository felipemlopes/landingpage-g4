import { useEffect } from 'react';
import { pixelSettingsApi } from '../services/api';

/**
 * Resolve quando a tentativa de bootstrap do Pixel termina — com sucesso,
 * falha ou pixel desativado. Existe pra quem dispara eventos depois do
 * PageView (ex.: `handleLeadSubmit` em Landing.jsx) poder esperar o `fbq`
 * ficar pronto em vez de só checar `window.fbq` na hora, o que perdia o
 * evento em silêncio se esse fetch ainda estivesse em andamento (rede lenta,
 * cold start do backend) — bug real reportado pelo cliente (Lead sumindo
 * mesmo com PageView disparando normalmente).
 */
let resolvePixelReady;
export const pixelReady = new Promise((resolve) => { resolvePixelReady = resolve; });

/**
 * Injeta o Pixel da Meta (client-side) quando um Pixel ID está configurado
 * pelo admin. Sem UI própria — só efeito colateral. Deve ser renderizado
 * apenas em telas públicas do funil (nunca em /admin/*), ver Requisito 2.6
 * de .kiro/specs/whatsapp-pixel-meta-textos-hero.
 */
export default function MetaPixel() {
  useEffect(() => {
    let cancelled = false;

    pixelSettingsApi.get()
      .then(({ meta_pixel_id }) => {
        if (cancelled || !meta_pixel_id || window.fbq) return;

        // Snippet padrão de bootstrap do Meta Pixel.
        (function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            if (n.callMethod) n.callMethod.apply(n, arguments);
            else n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = true;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = true;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        window.fbq('init', meta_pixel_id);
        window.fbq('track', 'PageView');
      })
      .catch(() => {
        // Falha silenciosa — Requisito 2.7: nunca quebra a Home por causa do pixel.
      })
      .finally(() => resolvePixelReady());

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
