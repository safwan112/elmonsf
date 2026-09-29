<?php

namespace App\Support;

/**
 * Amounts are stored as integers in minor units (1 SAR = 100 halalas).
 */
final class Money
{
    public static function toMajor(?int $minor): ?float
    {
        return $minor === null ? null : round($minor / 100, 2);
    }

    public static function toMinor(float|int|string $major): int
    {
        return (int) round(((float) $major) * 100);
    }

    /**
     * @return array{amount: float, amount_minor: int, currency: string}|null
     */
    public static function present(?int $minor, string $currency): ?array
    {
        if ($minor === null) {
            return null;
        }

        return [
            'amount' => self::toMajor($minor),
            'amount_minor' => $minor,
            'currency' => $currency,
        ];
    }
}
