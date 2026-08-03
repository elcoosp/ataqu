test-integration:
    @echo "🧪 Suppression des volumes PostgreSQL résiduels..."
    -docker volume ls -q | grep -E '.*postgres.*' | xargs docker volume rm -f 2>/dev/null
    @echo "🧪 Nettoyage complet de l'environnement de test..."
    docker compose -f docker-compose.test.yml down -v
    @echo "🧪 Démarrage de PostgreSQL pour les tests..."
    docker compose -f docker-compose.test.yml up -d --force-recreate
    @echo "⏳ Attente de PostgreSQL..."
    @while ! docker compose -f docker-compose.test.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do \
        echo "Waiting for postgres..."; \
        sleep 1; \
    done
    @echo "PostgreSQL is ready."
    @echo "🔄 Exécution des migrations sur la base de test..."
    cargo run --bin migrator
    @echo "🧪 Exécution des tests d'intégration..."
    cargo test --test integration

wr:
    watchexec -w ./wr.sh --clear -r "./wr.sh"
