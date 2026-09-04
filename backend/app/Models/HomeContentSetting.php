<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeContentSetting extends Model
{
    protected $fillable = [
        'badge_text', 'headline_line1', 'headline_highlight', 'headline_line3',
        'subheadline', 'stat1_value', 'stat1_label', 'stat2_value', 'stat2_label',
        'stat3_value', 'stat3_label', 'cta_button_text', 'cta_subtext',
    ];

    /** Valores padrão — o texto hoje fixo em Hero.jsx, usado quando um campo está null. */
    public const DEFAULTS = [
        'badge_text'         => 'Diagnóstico gratuito · 2 min',
        'headline_line1'     => 'Diagnóstico gratuito de como estruturar',
        'headline_highlight' => 'marketing, comercial e vendas',
        'headline_line3'     => 'do seu escritório',
        'subheadline'        => 'Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu escritório — e receba um plano personalizado no WhatsApp para parar de depender de indicação.',
        'stat1_value'        => '9',
        'stat1_label'        => 'Perguntas',
        'stat2_value'        => '2min',
        'stat2_label'        => 'Para concluir',
        'stat3_value'        => '100%',
        'stat3_label'        => 'Gratuito',
        'cta_button_text'    => 'Começar diagnóstico',
        'cta_subtext'        => 'Sem compromisso · Resultado imediato',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria com valores padrão
     * na primeira leitura. Mesmo padrão de MessageSetting::current().
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    /** Cada campo resolvido: valor salvo, ou o padrão daquele campo se null/vazio. */
    public function resolved(): array
    {
        $out = [];
        foreach (self::DEFAULTS as $field => $default) {
            $out[$field] = $this->{$field} ?: $default;
        }

        return $out;
    }
}
