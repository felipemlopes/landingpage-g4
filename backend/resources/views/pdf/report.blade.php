<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    line-height: 1.6;
  }

  /* ── Cabeçalho ── */
  .header {
    /* cor sólida garante contraste mesmo se o gradiente não renderizar no dompdf */
    background-color: #131930;
    background-image: linear-gradient(135deg, #131930 0%, #1D1C3A 100%);
    padding: 32px 40px 28px;
    color: #fff;
  }
  .header-title {
    font-size: 22px;
    font-weight: 700;
    color: #A08A4E;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .header-subtitle {
    font-size: 12px;
    color: rgba(255,255,255,.5);
    letter-spacing: 1px;
  }
  .header-divider {
    height: 1px;
    background: rgba(160,138,78,.3);
    margin: 20px 0;
  }
  .header-score-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .score-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(160,138,78,.15);
    border: 2px solid #A08A4E;
    /* dompdf não centraliza bem flex dentro de um círculo — centraliza com
       padding calculado + text-align em vez de flex. */
    text-align: center;
    padding-top: 15px;
    flex-shrink: 0;
  }
  .score-number {
    font-size: 26px;
    font-weight: 700;
    color: #A08A4E;
    line-height: 1;
  }
  .score-label-small {
    font-size: 9px;
    color: rgba(255,255,255,.4);
    margin-top: 2px;
  }
  .header-name {
    font-size: 12px;
    color: rgba(255,255,255,.5);
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .score-info h2 {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }
  .score-info p {
    font-size: 12px;
    color: rgba(255,255,255,.5);
  }
  .level-badge {
    display: inline-block;
    background: rgba(160,138,78,.2);
    border: 1px solid rgba(160,138,78,.4);
    color: #A08A4E;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 100px;
    margin-top: 6px;
  }

  /* ── Conteúdo ── */
  .content {
    padding: 28px 40px 40px;
  }

  .section {
    margin-bottom: 22px;
    padding: 16px 20px;
    background: #f8f8fc;
    border-left: 3px solid #A08A4E;
    border-radius: 0 6px 6px 0;
  }
  .highlight {
    margin-bottom: 22px;
    padding: 16px 20px;
    background: #f0fdf4;
    border-left: 3px solid #16a34a;
    border-radius: 0 6px 6px 0;
  }
  .warning {
    margin-bottom: 22px;
    padding: 16px 20px;
    background: #fff7ed;
    border-left: 3px solid #ea580c;
    border-radius: 0 6px 6px 0;
  }
  .success {
    margin-bottom: 22px;
    padding: 16px 20px;
    background: #f0fdf4;
    border-left: 3px solid #16a34a;
    border-radius: 0 6px 6px 0;
  }
  .tip {
    margin-bottom: 22px;
    padding: 16px 20px;
    background: #fefce8;
    border-left: 3px solid #ca8a04;
    border-radius: 0 6px 6px 0;
  }

  h1 { font-size: 18px; font-weight: 700; color: #131930; margin-bottom: 10px; }
  h2 { font-size: 15px; font-weight: 700; color: #131930; margin-bottom: 8px; }
  h3 { font-size: 13px; font-weight: 700; color: #A08A4E; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  p  { font-size: 12.5px; color: #333; margin-bottom: 8px; line-height: 1.65; }
  ul { padding-left: 16px; margin-bottom: 8px; }
  li { font-size: 12.5px; color: #333; margin-bottom: 4px; line-height: 1.5; }
  strong { color: #131930; font-weight: 700; }

  /* ── Eixos ── */
  .axes-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 22px;
  }
  .axis-card {
    flex: 1;
    min-width: 120px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .axis-name  { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .axis-score { font-size: 22px; font-weight: 700; line-height: 1; margin-bottom: 2px; }
  .axis-bar-bg  { background: #e5e7eb; border-radius: 4px; height: 4px; margin-top: 6px; }
  .axis-bar-fill { height: 4px; border-radius: 4px; }
  .green  { color: #16a34a; }
  .yellow { color: #d97706; }
  .red    { color: #dc2626; }
  .bar-green  { background: #16a34a; }
  .bar-yellow { background: #d97706; }
  .bar-red    { background: #dc2626; }

  /* ── Rodapé ── */
  .footer {
    border-top: 1px solid #e5e7eb;
    padding: 16px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .footer-text  { font-size: 10px; color: #9ca3af; }
  .footer-date  { font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>

<!-- Cabeçalho -->
<div class="header">
  <div class="header-title">Diagnóstico Comercial</div>
  <div class="header-subtitle">Estruturação de Marketing, Comercial e Vendas</div>
  <div class="header-name">Lucas Fonseca - Marketing e vendas.</div>
  <div class="header-divider"></div>
  <div class="header-score-row">
    <div class="score-circle">
      <div class="score-number">{{ $score }}</div>
      <div class="score-label-small">de 100</div>
    </div>
    <div class="score-info">
      <h2>{{ $name }}</h2>
      <p>Diagnóstico realizado em {{ $date }}</p>
      <div class="level-badge">{{ $level }}</div>
    </div>
  </div>
</div>

<!-- Eixos por categoria -->
<div class="content">
  @if(count($axes) > 0)
  <div class="axes-grid">
    @foreach($axes as $axis)
    @php
      $color = $axis['avg'] >= 65 ? 'green' : ($axis['avg'] >= 35 ? 'yellow' : 'red');
      $barColor = 'bar-' . $color;
    @endphp
    <div class="axis-card">
      <div class="axis-name">{{ $axis['label'] }}</div>
      <div class="axis-score {{ $color }}">{{ $axis['avg'] }}<span style="font-size:11px;font-weight:400;">%</span></div>
      <div class="axis-bar-bg">
        <div class="axis-bar-fill {{ $barColor }}" style="width: {{ $axis['avg'] }}%;"></div>
      </div>
    </div>
    @endforeach
  </div>
  @endif

  <!-- Conteúdo gerado pela IA -->
  {!! $reportHtml !!}
</div>

<!-- Rodapé -->
<div class="footer">
  <div class="footer-text">Diagnóstico Comercial Personalizado</div>
  <div class="footer-date">{{ $date }}</div>
</div>

</body>
</html>
