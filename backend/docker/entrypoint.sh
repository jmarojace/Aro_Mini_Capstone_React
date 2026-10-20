#!/bin/sh
set -e

php artisan storage:link --force
php artisan migrate --force

exec "$@"
