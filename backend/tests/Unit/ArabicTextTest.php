<?php

use App\Support\ArabicText;
use App\Support\Money;
use App\Support\RichText;
use App\Support\Slug;

it('normalises arabic spelling variants', function (string $input, string $expected) {
    expect(ArabicText::normalize($input))->toBe($expected);
})->with([
    'hamza forms' => ['أحمد إبراهيم آمنة', 'احمد ابراهيم امنه'],
    'diacritics and tatweel' => ['القُــدُرات', 'القدرات'],
    'alef maqsura' => ['مستوى', 'مستوي'],
    'arabic-indic digits' => ['اختبار ٢٠٢٦', 'اختبار 2026'],
    'punctuation' => ['كمي، لفظي!', 'كمي لفظي'],
    'html' => ['<b>دورة</b>', 'دوره'],
]);

it('splits search queries into distinct terms of 2+ characters', function () {
    expect(ArabicText::terms('  الكمي و الكمى  تأسيس '))->toBe(['الكمي', 'تاسيس']);
});

it('keeps arabic letters in slugs', function () {
    expect(Slug::make('دورة القدرات 2026!'))->toBe('دورة-القدرات-2026');
});

it('converts money between major and minor units', function () {
    expect(Money::toMinor('199.99'))->toBe(19999)
        ->and(Money::toMajor(19999))->toBe(199.99)
        ->and(Money::present(null, 'SAR'))->toBeNull();
});

it('renders markdown without allowing raw html or unsafe links', function () {
    $html = RichText::toHtml("**مرحباً**\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))");

    expect($html)->toContain('<strong>مرحباً</strong>')
        ->not->toContain('<script>')
        ->not->toContain('javascript:');
});
