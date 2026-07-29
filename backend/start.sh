#!/bin/sh
# Выполняется при СТАРТЕ контейнера (Deploy), а не во время Build.
# Именно на этом этапе Railway уже поднимает приватную сеть, и
# postgres.railway.internal становится доступен - поэтому миграции
# нельзя гонять в Build Command, только здесь.
set -e

echo ">>> Применяю миграции Prisma..."
npx prisma migrate deploy

echo ">>> Запускаю сервер..."
node dist/index.js
