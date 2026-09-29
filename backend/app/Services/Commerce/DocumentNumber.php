<?php

namespace App\Services\Commerce;

use Illuminate\Support\Facades\DB;

/**
 * Gap-free yearly sequences, e.g. ORD-2026-000042 / INV-2026-000007.
 * Must be called inside a transaction (the row lock serialises callers).
 */
class DocumentNumber
{
    public function next(string $name, string $prefix): string
    {
        $year = (int) now()->format('Y');

        DB::table('document_sequences')->insertOrIgnore(['name' => $name, 'year' => $year, 'last_value' => 0]);

        $row = DB::table('document_sequences')
            ->where(['name' => $name, 'year' => $year])
            ->lockForUpdate()
            ->first();

        $value = (int) $row->last_value + 1;
        DB::table('document_sequences')->where(['name' => $name, 'year' => $year])->update(['last_value' => $value]);

        return sprintf('%s-%d-%06d', $prefix, $year, $value);
    }
}
