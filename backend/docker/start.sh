#!/bin/sh
php artisan migrate --force
php artisan config:cache
php artisan route:cache
nginx &
php-fpm
