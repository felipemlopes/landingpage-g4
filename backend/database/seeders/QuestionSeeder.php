<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        // Não sobrescreve se já existem perguntas
        if (Question::count() > 0) {
            return;
        }

        // Fonte única em Question::defaults() — mesma usada pelo reset manual
        // do admin (QuestionController::resetDefaults()), pra um banco novo
        // nunca nascer com um conjunto de perguntas diferente do padrão real.
        foreach (Question::defaults() as $i => $q) {
            Question::create([
                'category'      => $q['category'],
                'category_slug' => $q['category_slug'],
                'text'          => $q['text'],
                'type'          => $q['type'],
                'scored'        => $q['scored'],
                'allow_other'   => $q['allow_other'] ?? false,
                'options'       => $q['options'],
                'order'         => $i,
                'active'        => true,
            ]);
        }
    }
}
