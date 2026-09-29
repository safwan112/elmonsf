# Dhurwa API (Laravel 12)

REST API for the platform. Setup, conventions and architecture are documented
in the [root README](../README.md).

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve            # http://127.0.0.1:8000/api/v1/health
vendor/bin/pest              # tests (uses the elmonsf_test database)
vendor/bin/pint              # code style
```
