<?php

namespace App\Payments\MyFatoorah;

/**
 * Case-insensitive dot-path access into MyFatoorah JSON. Responses may be
 * wrapped in a "Data" envelope; callers pass the unwrapped body.
 */
final class Payload
{
    /**
     * @param  array<string, mixed>  $data
     * @param  string|list<string>  $paths  first non-null match wins
     */
    public static function get(array $data, string|array $paths): mixed
    {
        foreach ((array) $paths as $path) {
            $value = $data;
            foreach (explode('.', $path) as $segment) {
                if (! is_array($value)) {
                    $value = null;
                    break;
                }
                $value = self::key($value, $segment);
            }
            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public static function unwrap(array $body): array
    {
        $data = self::key($body, 'Data');

        return is_array($data) ? $data : $body;
    }

    /**
     * @param  array<string, mixed>  $array
     */
    private static function key(array $array, string $segment): mixed
    {
        if (array_key_exists($segment, $array)) {
            return $array[$segment];
        }
        foreach ($array as $k => $v) {
            if (is_string($k) && strcasecmp($k, $segment) === 0) {
                return $v;
            }
        }

        return null;
    }
}
