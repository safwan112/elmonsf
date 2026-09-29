<?php

namespace App\Support;

/**
 * Lightweight, dependency-free user-agent summary for "active sessions"
 * lists. Only needs to be good enough for a human to recognise a device.
 */
final class UserAgent
{
    public function __construct(private readonly string $ua) {}

    public static function parse(?string $ua): self
    {
        return new self((string) $ua);
    }

    public function browser(): ?string
    {
        return match (true) {
            str_contains($this->ua, 'Edg/') => 'Edge',
            str_contains($this->ua, 'OPR/') || str_contains($this->ua, 'Opera') => 'Opera',
            str_contains($this->ua, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($this->ua, 'Firefox/') || str_contains($this->ua, 'FxiOS') => 'Firefox',
            str_contains($this->ua, 'Chrome/') || str_contains($this->ua, 'CriOS') => 'Chrome',
            str_contains($this->ua, 'Safari/') => 'Safari',
            default => null,
        };
    }

    public function platform(): ?string
    {
        return match (true) {
            (bool) preg_match('/iPhone|iPad|iPod/', $this->ua) => 'iOS',
            str_contains($this->ua, 'Android') => 'Android',
            str_contains($this->ua, 'Windows') => 'Windows',
            str_contains($this->ua, 'Mac OS X') || str_contains($this->ua, 'Macintosh') => 'macOS',
            str_contains($this->ua, 'CrOS') => 'ChromeOS',
            str_contains($this->ua, 'Linux') => 'Linux',
            default => null,
        };
    }

    public function isMobile(): bool
    {
        return (bool) preg_match('/Mobile|Android|iPhone|iPod/', $this->ua);
    }
}
